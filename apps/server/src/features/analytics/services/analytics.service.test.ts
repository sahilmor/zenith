import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { BoardService } from '../../boards/services/board.service.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { TaskService } from '../../tasks/services/task.service.js';

const tokens = new TokenService();

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: 'user' })}`;

const seedAnalyticsWorkspace = async (user: UserDocument) => {
  const workspaceService = new WorkspaceService();
  const projectService = new ProjectService();
  const boardService = new BoardService();
  const taskService = new TaskService();
  const workspace = await workspaceService.createWorkspace(user._id, {
    name: 'Insight Co',
    visibility: 'private',
  });
  const project = await projectService.createProject(
    new mongoose.Types.ObjectId(workspace.id),
    user._id,
    { name: 'Growth', key: 'GRO', visibility: 'private' },
  );
  const board = await boardService.createBoard(new mongoose.Types.ObjectId(project.id), user._id, {
    name: 'Roadmap',
    isDefault: true,
  });
  const columns = await ColumnModel.find({ boardId: board.id }).sort({ order: 1 });
  const todo = columns[0];
  const done = columns[3];
  if (!todo || !done) throw new Error('Expected default board columns');
  const open = await taskService.createTask(todo._id, user._id, {
    title: 'Open launch work',
    priority: 'high',
    status: 'open',
    assigneeIds: [user.id],
    labels: ['launch'],
    dueDate: '2026-01-01T12:00:00.000Z',
  });
  const complete = await taskService.createTask(done._id, user._id, {
    title: 'Completed launch work',
    priority: 'medium',
    status: 'done',
    assigneeIds: [user.id],
    labels: ['launch'],
  });
  return { workspace, project, board, open, complete };
};

describe('Analytics and reporting module', () => {
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

  it('returns workspace dashboard metrics for authorized members', async () => {
    const app = createApp();
    const user = await createUser('owner@example.com');
    const { workspace } = await seedAnalyticsWorkspace(user);

    const response = await request(app)
      .get(`/api/analytics/dashboard?workspaceId=${workspace.id}`)
      .set('Authorization', bearer(user))
      .expect(200);

    expect(response.body.data.kpis.totalTasks).toBe(2);
    expect(response.body.data.kpis.completedTasks).toBe(1);
    expect(response.body.data.tasksByStatus).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'open', value: 1 })]),
    );
    expect(response.body.data.projectProgress[0]).toMatchObject({ label: 'Growth', value: 50 });
  });

  it('exports reports as csv, xlsx, and pdf', async () => {
    const app = createApp();
    const user = await createUser('owner@example.com');
    const { workspace } = await seedAnalyticsWorkspace(user);

    const csv = await request(app)
      .get(`/api/analytics/reports?scope=workspace&workspaceId=${workspace.id}&format=csv`)
      .set('Authorization', bearer(user))
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('Open launch work');

    const xlsx = await request(app)
      .get(`/api/analytics/reports?scope=workspace&workspaceId=${workspace.id}&format=xlsx`)
      .set('Authorization', bearer(user))
      .buffer()
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(xlsx.headers['content-type']).toContain('spreadsheetml');
    expect(Buffer.isBuffer(xlsx.body)).toBe(true);

    const pdf = await request(app)
      .get(`/api/analytics/reports?scope=workspace&workspaceId=${workspace.id}&format=pdf`)
      .set('Authorization', bearer(user))
      .buffer()
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(Buffer.isBuffer(pdf.body)).toBe(true);
  });

  it('rejects users who are not workspace members', async () => {
    const app = createApp();
    const owner = await createUser('owner@example.com');
    const outsider = await createUser('outsider@example.com');
    const { workspace } = await seedAnalyticsWorkspace(owner);

    await request(app)
      .get(`/api/analytics/dashboard?workspaceId=${workspace.id}`)
      .set('Authorization', bearer(outsider))
      .expect(403);
  });
});
