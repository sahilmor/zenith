import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { ActivityEventModel } from '../../activity/models/activity-event.model.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { BoardModel } from '../models/board.model.js';
import { ColumnModel } from '../models/column.model.js';
import { BoardRepository, ColumnRepository } from '../repositories/board.repository.js';
import { BoardService } from './board.service.js';

const tokens = new TokenService();

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: 'user' })}`;

const createWorkspaceProject = async (user: UserDocument) => {
  const workspaceService = new WorkspaceService();
  const projectService = new ProjectService();
  const workspace = await workspaceService.createWorkspace(user._id, {
    name: 'Acme',
    visibility: 'private',
  });
  const project = await projectService.createProject(
    new mongoose.Types.ObjectId(workspace.id),
    user._id,
    { name: 'Web', key: 'WEB', visibility: 'private' },
  );
  return { workspace, project };
};

describe('Board and Column module', () => {
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

  it('creates a board with default columns and activity', async () => {
    const user = await createUser('owner@example.com');
    const { project } = await createWorkspaceProject(user);
    const service = new BoardService();

    const board = await service.createBoard(new mongoose.Types.ObjectId(project.id), user._id, {
      name: 'Delivery',
      description: null,
      isDefault: true,
    });
    const columns = await ColumnModel.find({ boardId: board.id }).sort({ order: 1 });
    const activity = await ActivityEventModel.findOne({ event: 'board.created' });

    expect(board.name).toBe('Delivery');
    expect(board.isDefault).toBe(true);
    expect(columns.map((column) => column.name)).toEqual(['Todo', 'In Progress', 'Review', 'Done']);
    expect(activity?.metadata).toMatchObject({ boardId: board.id });
  });

  it('renames, archives, and restores boards', async () => {
    const user = await createUser('owner@example.com');
    const { project } = await createWorkspaceProject(user);
    const service = new BoardService();
    const board = await service.createBoard(new mongoose.Types.ObjectId(project.id), user._id, {
      name: 'Delivery',
      isDefault: false,
    });

    const renamed = await service.updateBoard(new mongoose.Types.ObjectId(board.id), user._id, {
      name: 'Roadmap',
    });
    const archived = await service.archiveBoard(new mongoose.Types.ObjectId(board.id), user._id);
    await expect(
      service.updateBoard(new mongoose.Types.ObjectId(board.id), user._id, { name: 'Blocked' }),
    ).rejects.toThrow('Archived boards cannot be modified');
    const restored = await service.restoreBoard(new mongoose.Types.ObjectId(board.id), user._id);

    expect(renamed.name).toBe('Roadmap');
    expect(archived.archived).toBe(true);
    expect(restored.archived).toBe(false);
  });

  it('creates, renames, soft-deletes, and reorders columns', async () => {
    const user = await createUser('owner@example.com');
    const { project } = await createWorkspaceProject(user);
    const service = new BoardService();
    const board = await service.createBoard(new mongoose.Types.ObjectId(project.id), user._id, {
      name: 'Delivery',
      isDefault: false,
    });

    const custom = await service.createColumn(new mongoose.Types.ObjectId(board.id), user._id, {
      name: 'QA',
      color: '#a855f7',
      limit: 3,
    });
    const renamed = await service.updateColumn(new mongoose.Types.ObjectId(custom.id), user._id, {
      name: 'Quality',
    });
    const columns = await service.listColumns(new mongoose.Types.ObjectId(board.id), user._id);
    const reordered = await service.reorderColumns(
      new mongoose.Types.ObjectId(board.id),
      user._id,
      {
        columnIds: columns.map((column) => column.id).reverse(),
      },
    );
    await service.deleteColumn(new mongoose.Types.ObjectId(custom.id), user._id);
    const deleted = await ColumnModel.findById(custom.id);

    expect(renamed.name).toBe('Quality');
    expect(reordered[0]?.id).toBe(columns.at(-1)?.id);
    expect(deleted?.archived).toBe(true);
  });

  it('allows members to view boards but not manage them', async () => {
    const owner = await createUser('owner@example.com');
    const member = await createUser('member@example.com');
    const { workspace, project } = await createWorkspaceProject(owner);
    const service = new BoardService();
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: member._id,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });
    await service.createBoard(new mongoose.Types.ObjectId(project.id), owner._id, {
      name: 'Delivery',
      isDefault: false,
    });

    const visible = await service.listBoards(new mongoose.Types.ObjectId(project.id), member._id);
    await expect(
      service.createBoard(new mongoose.Types.ObjectId(project.id), member._id, {
        name: 'Member Board',
        isDefault: false,
      }),
    ).rejects.toThrow('Board manager access required');

    expect(visible).toHaveLength(1);
  });

  it('supports board and column repositories', async () => {
    const user = await createUser('owner@example.com');
    const { workspace, project } = await createWorkspaceProject(user);
    const boards = new BoardRepository();
    const columns = new ColumnRepository();
    const board = await boards.create({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      projectId: new mongoose.Types.ObjectId(project.id),
      name: 'Repository Board',
      createdBy: user._id,
    });
    const column = await columns.create({ boardId: board._id, name: 'Backlog', order: 0 });

    expect(await boards.findById(board._id)).toBeTruthy();
    expect(await columns.findById(column._id)).toBeTruthy();
    expect(await columns.nextOrder(board._id)).toBe(1);
  });

  it('validates API input and enforces authorization', async () => {
    const owner = await createUser('owner@example.com');
    const member = await createUser('member@example.com');
    const { workspace, project } = await createWorkspaceProject(owner);
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: member._id,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });
    const app = createApp();

    await request(app)
      .post(`/api/projects/${project.id}/boards`)
      .set('Authorization', bearer(owner))
      .send({ name: 'A' })
      .expect(400);

    await request(app)
      .post(`/api/projects/${project.id}/boards`)
      .set('Authorization', bearer(member))
      .send({ name: 'Member Board' })
      .expect(403);

    const created = await request(app)
      .post(`/api/projects/${project.id}/boards`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Delivery' })
      .expect(201);
    const boardId = created.body.data.id as string;

    await request(app)
      .get(`/api/projects/${project.id}/boards`)
      .set('Authorization', bearer(member))
      .expect(200);

    await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', bearer(owner))
      .send({ name: 'QA', color: 'purple' })
      .expect(400);

    await request(app)
      .post(`/api/boards/${boardId}/archive`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(await BoardModel.findById(boardId)).toMatchObject({ archived: true });
  });
});
