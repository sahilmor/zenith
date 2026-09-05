import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { ApiKeyService } from '../../ops/services/api-key.service.js';
import { BoardService } from '../../boards/services/board.service.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { subscriptionService } from '../../billing/services/subscription.service.js';
import { TaskService } from '../../tasks/services/task.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';

const createUser = async (email: string, name = 'API User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const createWorkspaceWithColumn = async (owner: UserDocument, workspaceName: string) => {
  const workspaceService = new WorkspaceService();
  const projectService = new ProjectService();
  const boardService = new BoardService();
  const workspace = await workspaceService.createWorkspace(owner._id, {
    name: workspaceName,
    visibility: 'private',
  });
  const project = await projectService.createProject(
    new mongoose.Types.ObjectId(workspace.id),
    owner._id,
    { name: 'Delivery', key: workspaceName.slice(0, 3).toUpperCase(), visibility: 'private' },
  );
  const board = await boardService.createBoard(new mongoose.Types.ObjectId(project.id), owner._id, {
    name: 'Board',
    isDefault: true,
  });
  const [column] = await ColumnModel.find({ boardId: board.id }).sort({ order: 1 });
  if (!column) throw new Error('Expected default column');
  await subscriptionService.syncSubscription({
    workspaceId: new mongoose.Types.ObjectId(workspace.id),
    provider: 'local',
    planCode: 'business',
    billingInterval: 'monthly',
    currency: 'usd',
    status: 'active',
  });
  return { workspace, column };
};

const createTasks = async (
  owner: UserDocument,
  columnId: mongoose.Types.ObjectId,
  count: number,
) => {
  const taskService = new TaskService();
  for (let index = 0; index < count; index += 1) {
    await taskService.createTask(columnId, owner._id, {
      title: `Task ${index + 1}`,
      description: null,
      priority: 'medium',
      status: 'open',
      assigneeIds: [],
      labels: [],
    });
  }
};

describe('Public API', () => {
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

  it('rejects requests with no API key', async () => {
    const app = createApp();
    await request(app).get('/api/v1/tasks').expect(401);
  });

  it('rejects an unrecognized API key', async () => {
    const app = createApp();
    await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', 'Bearer zen_not-a-real-key')
      .expect(401);
  });

  it('rejects a key that lacks the required scope', async () => {
    const app = createApp();
    const owner = await createUser('scope-owner@example.com');
    const { workspace } = await createWorkspaceWithColumn(owner, 'Scoped');
    const apiKeyService = new ApiKeyService();
    const created = (await apiKeyService.create(owner._id, {
      workspaceId: workspace.id,
      name: 'Write only',
      scopes: ['tasks:write'],
    })) as { secret: string };

    await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${created.secret}`)
      .expect(403);
  });

  it('rejects a revoked API key', async () => {
    const app = createApp();
    const owner = await createUser('revoked-owner@example.com');
    const { workspace } = await createWorkspaceWithColumn(owner, 'Revoked');
    const apiKeyService = new ApiKeyService();
    const created = (await apiKeyService.create(owner._id, {
      workspaceId: workspace.id,
      name: 'To be revoked',
      scopes: ['tasks:read'],
    })) as { id: string; secret: string };

    await apiKeyService.revoke(
      new mongoose.Types.ObjectId(workspace.id),
      new mongoose.Types.ObjectId(created.id),
      owner._id,
    );

    await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${created.secret}`)
      .expect(401);
  });

  it("only returns tasks from the API key's own workspace", async () => {
    const app = createApp();
    const ownerA = await createUser('owner-a@example.com');
    const ownerB = await createUser('owner-b@example.com');
    const { workspace: workspaceA, column: columnA } = await createWorkspaceWithColumn(
      ownerA,
      'Workspace A',
    );
    const { workspace: workspaceB, column: columnB } = await createWorkspaceWithColumn(
      ownerB,
      'Workspace B',
    );
    await createTasks(ownerA, columnA._id, 2);
    await createTasks(ownerB, columnB._id, 3);

    const apiKeyService = new ApiKeyService();
    const keyA = (await apiKeyService.create(ownerA._id, {
      workspaceId: workspaceA.id,
      name: 'Workspace A key',
      scopes: ['tasks:read'],
    })) as { secret: string };

    const response = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${keyA.secret}`)
      .expect(200);

    expect(response.body.data.total).toBe(2);
    expect(
      response.body.data.items.every(
        (task: { workspaceId: string }) => task.workspaceId === workspaceA.id,
      ),
    ).toBe(true);
    expect(
      response.body.data.items.some(
        (task: { workspaceId: string }) => task.workspaceId === workspaceB.id,
      ),
    ).toBe(false);
  });

  it('paginates results and reports hasMore correctly', async () => {
    const app = createApp();
    const owner = await createUser('paging-owner@example.com');
    const { workspace, column } = await createWorkspaceWithColumn(owner, 'Paging');
    await createTasks(owner, column._id, 5);

    const apiKeyService = new ApiKeyService();
    const apiKey = (await apiKeyService.create(owner._id, {
      workspaceId: workspace.id,
      name: 'Paging key',
      scopes: ['tasks:read'],
    })) as { secret: string };

    const firstPage = await request(app)
      .get('/api/v1/tasks?page=1&limit=2')
      .set('Authorization', `Bearer ${apiKey.secret}`)
      .expect(200);
    expect(firstPage.body.data.items).toHaveLength(2);
    expect(firstPage.body.data.total).toBe(5);
    expect(firstPage.body.data.hasMore).toBe(true);

    const lastPage = await request(app)
      .get('/api/v1/tasks?page=3&limit=2')
      .set('Authorization', `Bearer ${apiKey.secret}`)
      .expect(200);
    expect(lastPage.body.data.items).toHaveLength(1);
    expect(lastPage.body.data.hasMore).toBe(false);
  });
});
