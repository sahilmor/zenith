import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { BoardService } from '../../boards/services/board.service.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { subscriptionService } from '../../billing/services/subscription.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { TaskService } from '../../tasks/services/task.service.js';

const tokens = new TokenService();

const createUser = (email: string, name = 'Search User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: user.role })}`;

describe('Universal search module', () => {
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

  it('indexes core entities, respects document permissions, and feeds AI retrieval', async () => {
    const app = createApp();
    const owner = await createUser('search-owner@example.com', 'Search Owner');
    const member = await createUser('search-member@example.com', 'Search Member');
    const outsider = await createUser('search-outsider@example.com', 'Search Outsider');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Search Workspace',
      visibility: 'private',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: member._id,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });
    await subscriptionService.syncSubscription({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    const project = await new ProjectService().createProject(
      new mongoose.Types.ObjectId(workspace.id),
      owner._id,
      { name: 'Knowledge Platform', key: 'KNOW', visibility: 'private' },
    );
    const board = await new BoardService().createBoard(
      new mongoose.Types.ObjectId(project.id),
      owner._id,
      { name: 'Discovery Board', isDefault: true },
    );
    const column = await ColumnModel.findOne({ boardId: board.id }).exec();
    if (!column) throw new Error('Default column missing');
    await new TaskService().createTask(column._id, owner._id, {
      title: 'Universal search indexing',
      description: 'Build permission aware discovery for knowledge pages.',
      priority: 'high',
      status: 'open',
      assigneeIds: [],
      labels: ['search', 'knowledge'],
    });

    const space = await request(app)
      .post(`/api/workspaces/${workspace.id}/spaces`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Engineering Docs' })
      .expect(201);

    const privatePage = await request(app)
      .post(`/api/spaces/${space.body.data.id}/pages`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'Private Draft Runbook',
        blocks: [
          {
            stableId: 'private',
            type: 'paragraph',
            order: 0,
            content: { text: 'Confidential retrieval content for owners only.' },
          },
        ],
      })
      .expect(201);

    await request(app)
      .post(`/api/spaces/${space.body.data.id}/pages`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'Published Search Guide',
        status: 'published',
        blocks: [
          {
            stableId: 'published',
            type: 'paragraph',
            order: 0,
            content: { text: 'Universal search highlights knowledge safely.' },
          },
        ],
      })
      .expect(201);

    const ownerSearch = await request(app)
      .get(`/api/search?workspaceId=${workspace.id}&q=search&entityTypes=task,document_page`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(ownerSearch.body.data.results.length).toBeGreaterThan(0);
    expect(
      ownerSearch.body.data.groups.map((group: { entityType: string }) => group.entityType),
    ).toContain('task');
    expect(String(ownerSearch.body.data.results[0].highlights[0]?.snippet ?? '')).toContain(
      '<mark>',
    );

    const memberSearch = await request(app)
      .get(`/api/search?workspaceId=${workspace.id}&q=Private`)
      .set('Authorization', bearer(member))
      .expect(200);

    expect(
      memberSearch.body.data.results.some(
        (result: { entityId: string }) => result.entityId === privatePage.body.data.id,
      ),
    ).toBe(false);

    await request(app)
      .get(`/api/search?workspaceId=${workspace.id}&q=search`)
      .set('Authorization', bearer(outsider))
      .expect(403);

    const suggestions = await request(app)
      .get(`/api/search/suggestions?workspaceId=${workspace.id}&q=search`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(suggestions.body.data.length).toBeGreaterThan(0);

    const saved = await request(app)
      .post('/api/search/saved')
      .set('Authorization', bearer(owner))
      .send({ workspaceId: workspace.id, name: 'Knowledge search', query: 'search' })
      .expect(201);

    expect(saved.body.data.name).toBe('Knowledge search');

    const recent = await request(app)
      .get(`/api/search/recent?workspaceId=${workspace.id}`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(recent.body.data.length).toBeGreaterThan(0);

    const analytics = await request(app)
      .get(`/api/search/analytics?workspaceId=${workspace.id}`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(analytics.body.data.totalSearches).toBeGreaterThan(0);

    const aiSearch = await request(app)
      .post('/api/ai/search')
      .set('Authorization', bearer(owner))
      .send({ workspaceId: workspace.id, query: 'retrieval content' })
      .expect(200);

    expect(aiSearch.body.data.results.length).toBeGreaterThan(0);
    expect(aiSearch.body.data.citations.length).toBeGreaterThan(0);
  });
});
