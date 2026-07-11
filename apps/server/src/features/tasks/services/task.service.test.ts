import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../../app.js';
import { ActivityEventModel } from '../../activity/models/activity-event.model.js';
import { TokenService } from '../../auth/services/token.service.js';
import { BoardService } from '../../boards/services/board.service.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { SubtaskModel } from '../models/subtask.model.js';
import { TaskModel } from '../models/task.model.js';
import { SubtaskRepository, TaskRepository } from '../repositories/task.repository.js';
import { TaskService } from './task.service.js';

const tokens = new TokenService();

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: 'user' })}`;

const createBoardWithColumns = async (user: UserDocument) => {
  const workspaceService = new WorkspaceService();
  const projectService = new ProjectService();
  const boardService = new BoardService();
  const workspace = await workspaceService.createWorkspace(user._id, {
    name: 'Acme',
    visibility: 'private',
  });
  const project = await projectService.createProject(
    new mongoose.Types.ObjectId(workspace.id),
    user._id,
    { name: 'Web', key: 'WEB', visibility: 'private' },
  );
  const board = await boardService.createBoard(new mongoose.Types.ObjectId(project.id), user._id, {
    name: 'Delivery',
    isDefault: true,
  });
  const columns = await ColumnModel.find({ boardId: board.id }).sort({ order: 1 });
  return { workspace, project, board, columns };
};

describe('Task and Subtask module', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('creates, edits, archives, and restores tasks with activity', async () => {
    const user = await createUser('owner@example.com');
    const { columns } = await createBoardWithColumns(user);
    const service = new TaskService();
    const firstColumn = columns[0];
    if (!firstColumn) throw new Error('Expected default column');

    const task = await service.createTask(firstColumn._id, user._id, {
      title: 'Ship dashboard',
      description: null,
      priority: 'high',
      status: 'open',
      assigneeIds: [],
      labels: ['frontend'],
    });
    const edited = await service.updateTask(new mongoose.Types.ObjectId(task.id), user._id, {
      title: 'Ship Kanban dashboard',
    });
    const archived = await service.archiveTask(new mongoose.Types.ObjectId(task.id), user._id);
    const restored = await service.restoreTask(new mongoose.Types.ObjectId(task.id), user._id);
    const activity = await ActivityEventModel.findOne({ event: 'task.created' });

    expect(task.order).toBe(0);
    expect(edited.title).toBe('Ship Kanban dashboard');
    expect(archived.archived).toBe(true);
    expect(restored.archived).toBe(false);
    expect(activity?.metadata).toMatchObject({ taskId: task.id });
  });

  it('moves tasks within a column and across columns while preserving order', async () => {
    const user = await createUser('owner@example.com');
    const { board, columns } = await createBoardWithColumns(user);
    const service = new TaskService();
    const todo = columns[0];
    const progress = columns[1];
    if (!todo || !progress) throw new Error('Expected default columns');
    const first = await service.createTask(todo._id, user._id, {
      title: 'First',
      priority: 'medium',
      status: 'open',
      assigneeIds: [],
      labels: [],
    });
    const second = await service.createTask(todo._id, user._id, {
      title: 'Second',
      priority: 'medium',
      status: 'open',
      assigneeIds: [],
      labels: [],
    });

    const reordered = await service.reorderTasks(user._id, {
      boardId: board.id,
      columns: [
        { columnId: todo.id, taskIds: [second.id] },
        { columnId: progress.id, taskIds: [first.id] },
      ],
    });
    const moved = reordered.find((task) => task.id === first.id);
    const remaining = reordered.find((task) => task.id === second.id);

    expect(moved).toMatchObject({ columnId: progress.id, order: 0 });
    expect(remaining).toMatchObject({ columnId: todo.id, order: 0 });
  });

  it('manages subtasks independently', async () => {
    const user = await createUser('owner@example.com');
    const { columns } = await createBoardWithColumns(user);
    const service = new TaskService();
    const firstColumn = columns[0];
    if (!firstColumn) throw new Error('Expected default column');
    const task = await service.createTask(firstColumn._id, user._id, {
      title: 'Parent',
      priority: 'medium',
      status: 'open',
      assigneeIds: [],
      labels: [],
    });

    const subtask = await service.createSubtask(new mongoose.Types.ObjectId(task.id), user._id, {
      title: 'Checklist item',
      completed: false,
    });
    const completed = await service.updateSubtask(
      new mongoose.Types.ObjectId(subtask.id),
      user._id,
      {
        completed: true,
      },
    );
    await service.deleteSubtask(new mongoose.Types.ObjectId(subtask.id), user._id);

    expect(subtask.order).toBe(0);
    expect(completed.completed).toBe(true);
    expect(await SubtaskModel.findById(subtask.id)).toBeNull();
  });

  it('supports repositories', async () => {
    const user = await createUser('owner@example.com');
    const { workspace, project, board, columns } = await createBoardWithColumns(user);
    const tasks = new TaskRepository();
    const subtasks = new SubtaskRepository();
    const firstColumn = columns[0];
    if (!firstColumn) throw new Error('Expected default column');
    const task = await tasks.create({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      projectId: new mongoose.Types.ObjectId(project.id),
      boardId: new mongoose.Types.ObjectId(board.id),
      columnId: firstColumn._id,
      title: 'Repository task',
      order: 0,
      reporterId: user._id,
      createdBy: user._id,
    });
    const subtask = await subtasks.create({
      taskId: task._id,
      title: 'Repository subtask',
      order: 0,
    });

    expect(await tasks.findById(task._id)).toBeTruthy();
    expect(await subtasks.findById(subtask._id)).toBeTruthy();
    expect(await tasks.nextOrder(firstColumn._id)).toBe(1);
    expect(await subtasks.nextOrder(task._id)).toBe(1);
  });

  it('filters, sorts, paginates, and bulk-updates advanced task lists', async () => {
    const user = await createUser('owner@example.com');
    const { workspace, columns } = await createBoardWithColumns(user);
    const firstColumn = columns[0];
    if (!firstColumn) throw new Error('Expected default column');
    const app = createApp();
    const oldTask = await request(app)
      .post(`/api/columns/${firstColumn.id}/tasks`)
      .set('Authorization', bearer(user))
      .send({
        title: 'Old launch item',
        priority: 'low',
        labels: ['launch'],
        dueDate: '2026-01-01T12:00:00.000Z',
      })
      .expect(201);
    const urgentTask = await request(app)
      .post(`/api/columns/${firstColumn.id}/tasks`)
      .set('Authorization', bearer(user))
      .send({
        title: 'Urgent launch item',
        priority: 'urgent',
        labels: ['launch'],
        dueDate: '2026-01-02T12:00:00.000Z',
      })
      .expect(201);

    const listed = await request(app)
      .get(
        `/api/tasks?workspaceId=${workspace.id}&labels=launch&sort=dueDate&direction=asc&limit=1`,
      )
      .set('Authorization', bearer(user))
      .expect(200);

    expect(listed.body.data.items).toHaveLength(1);
    expect(listed.body.data.items[0].id).toBe(oldTask.body.data.id);
    expect(listed.body.data.total).toBe(2);
    expect(listed.body.data.hasMore).toBe(true);

    await request(app)
      .patch('/api/tasks/bulk')
      .set('Authorization', bearer(user))
      .send({
        taskIds: [oldTask.body.data.id, urgentTask.body.data.id],
        priority: 'high',
        dueDate: '2026-01-03T12:00:00.000Z',
      })
      .expect(200);

    expect(
      await TaskModel.countDocuments({
        _id: { $in: [oldTask.body.data.id, urgentTask.body.data.id] },
        priority: 'high',
      }),
    ).toBe(2);
  });

  it('validates API input and enforces permissions', async () => {
    const owner = await createUser('owner@example.com');
    const guest = await createUser('guest@example.com');
    const { workspace, board, columns } = await createBoardWithColumns(owner);
    const firstColumn = columns[0];
    if (!firstColumn) throw new Error('Expected default column');
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: guest._id,
      role: 'guest',
      status: 'active',
      joinedAt: new Date(),
    });
    const app = createApp();

    await request(app)
      .post(`/api/columns/${firstColumn.id}/tasks`)
      .set('Authorization', bearer(owner))
      .send({ title: 'A' })
      .expect(400);

    await request(app)
      .post(`/api/columns/${firstColumn.id}/tasks`)
      .set('Authorization', bearer(guest))
      .send({ title: 'Guest task' })
      .expect(403);

    const created = await request(app)
      .post(`/api/columns/${firstColumn.id}/tasks`)
      .set('Authorization', bearer(owner))
      .send({ title: 'Owner task' })
      .expect(201);

    await request(app)
      .get(`/api/columns/${firstColumn.id}/tasks`)
      .set('Authorization', bearer(guest))
      .expect(200);

    await request(app)
      .post('/api/tasks/reorder')
      .set('Authorization', bearer(owner))
      .send({
        boardId: board.id,
        columns: [{ columnId: firstColumn.id, taskIds: [created.body.data.id] }],
      })
      .expect(200);

    expect(await TaskModel.findById(created.body.data.id)).toMatchObject({ order: 0 });
  });
});
