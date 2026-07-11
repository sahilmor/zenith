import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { BoardService } from '../../boards/services/board.service.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { TaskModel } from '../../tasks/models/task.model.js';
import { TaskService } from '../../tasks/services/task.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { subscriptionService } from '../../billing/services/subscription.service.js';
import { LocalAiProvider } from '../providers/local.provider.js';

const tokens = new TokenService();

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: 'user' })}`;

const seed = async (user: UserDocument) => {
  const workspaceService = new WorkspaceService();
  const projectService = new ProjectService();
  const boardService = new BoardService();
  const taskService = new TaskService();
  const workspace = await workspaceService.createWorkspace(user._id, {
    name: 'AI Workspace',
    visibility: 'private',
  });
  const project = await projectService.createProject(
    new mongoose.Types.ObjectId(workspace.id),
    user._id,
    { name: 'Platform', key: 'AI', visibility: 'private' },
  );
  const board = await boardService.createBoard(new mongoose.Types.ObjectId(project.id), user._id, {
    name: 'Delivery',
    isDefault: true,
  });
  const columns = await ColumnModel.find({ boardId: board.id }).sort({ order: 1 });
  const firstColumn = columns[0];
  if (!firstColumn) throw new Error('Expected default column');
  const task = await taskService.createTask(firstColumn._id, user._id, {
    title: 'High priority backend bug',
    priority: 'high',
    status: 'open',
    labels: ['backend', 'bug'],
    assigneeIds: [user.id],
  });
  return { workspace, project, board, task };
};

describe('AI copilot and automation module', () => {
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

  it('uses the provider abstraction', async () => {
    const provider = new LocalAiProvider();
    const result = await provider.complete({
      messages: [{ role: 'user', content: 'Generate tasks for launch' }],
      references: [],
    });

    expect(result.provider).toBe('local');
    expect(result.content).toContain('task plan');
  });

  it('creates conversations, performs AI search, and enforces workspace access', async () => {
    const app = createApp();
    const owner = await createUser('owner@example.com');
    const outsider = await createUser('outsider@example.com');
    const { workspace } = await seed(owner);

    const chat = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(owner))
      .send({ workspaceId: workspace.id, message: 'Generate tasks for onboarding' })
      .expect(200);

    expect(chat.body.data.messages).toHaveLength(2);
    expect(chat.body.data.provider).toBe('local');

    const search = await request(app)
      .post('/api/ai/search')
      .set('Authorization', bearer(owner))
      .send({ workspaceId: workspace.id, query: 'Show me high priority backend bugs' })
      .expect(200);

    expect(search.body.data.filters).toMatchObject({ priority: 'high', labels: ['bug'] });
    expect(search.body.data.tasks[0].title).toBe('High priority backend bug');

    await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(outsider))
      .send({ workspaceId: workspace.id, message: 'Summarize workspace' })
      .expect(403);
  });

  it('manages prompts and executes automation rules', async () => {
    const app = createApp();
    const owner = await createUser('owner@example.com');
    const { workspace, task } = await seed(owner);
    await subscriptionService.syncSubscription({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      provider: 'local',
      planCode: 'pro',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    const prompt = await request(app)
      .post('/api/ai/prompts')
      .set('Authorization', bearer(owner))
      .send({
        workspaceId: workspace.id,
        scope: 'workspace',
        name: 'Release notes',
        content: 'Summarize {{completedTasks}} for a release note.',
        variables: ['completedTasks'],
      })
      .expect(201);
    expect(prompt.body.data.version).toBe(1);

    const rule = await request(app)
      .post('/api/ai/automations')
      .set('Authorization', bearer(owner))
      .send({
        workspaceId: workspace.id,
        name: 'Mark high priority as done',
        enabled: true,
        trigger: 'task_updated',
        conditions: [],
        actions: [{ type: 'change_status', params: { taskId: task.id, status: 'done' } }],
      })
      .expect(201);

    await request(app)
      .post(`/api/ai/automations/${rule.body.data.id}/test`)
      .set('Authorization', bearer(owner))
      .expect(200);

    const updatedTask = await TaskModel.findById(task.id);
    expect(updatedTask?.status).toBe('done');
  });
});
