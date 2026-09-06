import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { subscriptionService } from '../../billing/services/subscription.service.js';
import { auditLogService } from './audit-log.service.js';
import { AuditLogModel } from '../models/audit-log.model.js';

const tokens = new TokenService();

const createUser = async (
  email: string,
  name = 'Ops User',
  role: 'user' | 'admin' = 'user',
): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password', role }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: user.role })}`;

describe('Operations module', () => {
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

  it('manages audit logs, feature flags, webhooks, and scoped public API keys', async () => {
    const app = createApp();
    const owner = await createUser('ops-owner@example.com', 'Ops Owner', 'admin');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Ops Workspace',
      visibility: 'private',
    });
    await subscriptionService.syncSubscription({
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    await auditLogService.record({
      actorId: owner._id,
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      targetType: 'workspace',
      targetId: workspace.id,
      action: 'workspace.created',
    });

    const logs = await request(app)
      .get(`/api/ops/audit-logs?workspaceId=${workspace.id}&limit=5`)
      .set('Authorization', bearer(owner))
      .expect(200);
    expect(logs.body.data.items[0].action).toBe('workspace.created');

    await request(app)
      .put('/api/ops/feature-flags')
      .set('Authorization', bearer(owner))
      .send({
        key: 'ai.copilot',
        enabled: true,
        rolloutPercentage: 100,
        workspaceIds: [workspace.id],
        userIds: [],
      })
      .expect(200);

    const flag = await request(app)
      .get(`/api/ops/feature-flags/ai.copilot/evaluate?workspaceId=${workspace.id}`)
      .set('Authorization', bearer(owner))
      .expect(200);
    expect(flag.body.data.enabled).toBe(true);

    const webhook = await request(app)
      .post('/api/ops/webhooks')
      .set('Authorization', bearer(owner))
      .send({
        workspaceId: workspace.id,
        url: 'https://example.com/webhooks/zenith',
        events: ['task.created'],
      })
      .expect(201);
    expect(webhook.body.data.secret).toEqual(expect.any(String));

    const apiKey = await request(app)
      .post('/api/ops/api-keys')
      .set('Authorization', bearer(owner))
      .send({ workspaceId: workspace.id, name: 'Read tasks', scopes: ['tasks:read'] })
      .expect(201);

    await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${apiKey.body.data.secret}`)
      .expect(200);

    await request(app)
      .get('/api/v1/tasks?limit=500')
      .set('Authorization', `Bearer ${apiKey.body.data.secret}`)
      .expect(400);
  });

  it('rejects feature flag evaluation for a non-member of the scoped workspace', async () => {
    const app = createApp();
    const owner = await createUser('flag-owner@example.com', 'Flag Owner', 'admin');
    const outsider = await createUser('flag-outsider@example.com', 'Flag Outsider');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Flag Workspace',
      visibility: 'private',
    });

    await request(app)
      .put('/api/ops/feature-flags')
      .set('Authorization', bearer(owner))
      .send({
        key: 'ai.copilot',
        enabled: true,
        rolloutPercentage: 100,
        workspaceIds: [workspace.id],
        userIds: [],
      })
      .expect(200);

    await request(app)
      .get(`/api/ops/feature-flags/ai.copilot/evaluate?workspaceId=${workspace.id}`)
      .set('Authorization', bearer(outsider))
      .expect(403);
  });

  it('restricts platform operations to platform admins', async () => {
    const app = createApp();
    const member = await createUser('ops-member@example.com');

    await request(app).get('/api/ops/audit-logs').set('Authorization', bearer(member)).expect(403);

    await request(app)
      .put('/api/ops/feature-flags')
      .set('Authorization', bearer(member))
      .send({ key: 'ops.locked', enabled: true, rolloutPercentage: 100 })
      .expect(403);

    await request(app)
      .post('/api/ops/jobs')
      .set('Authorization', bearer(member))
      .send({ type: 'report.generate', payload: {} })
      .expect(403);
  });

  it('sweeps expired audit logs based on retention and exports matching logs as csv', async () => {
    const app = createApp();
    const owner = await createUser('retention-owner@example.com', 'Retention Owner', 'admin');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Retention Workspace',
      visibility: 'private',
    });

    const stale = await auditLogService.record({
      actorId: owner._id,
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      targetType: 'workspace',
      action: 'workspace.stale_event',
    });
    // Mongoose's timestamps plugin strips createdAt from update() calls, so the
    // raw driver collection is used here to backdate the record for the test.
    await AuditLogModel.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(stale.id) },
      { $set: { createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) } },
    );

    await auditLogService.record({
      actorId: owner._id,
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      targetType: 'workspace',
      action: 'workspace.fresh_event',
    });

    const deleted = await auditLogService.sweepRetention();
    expect(deleted).toBe(1);

    const remaining = await auditLogService.list({ workspaceId: workspace.id, page: 1, limit: 10 });
    expect(remaining.items.map((log) => log.action)).toEqual(['workspace.fresh_event']);

    const exported = await request(app)
      .get(`/api/ops/audit-logs/export?workspaceId=${workspace.id}`)
      .set('Authorization', bearer(owner))
      .expect(200);
    expect(exported.headers['content-type']).toContain('text/csv');
    expect(exported.text).toContain('workspace.fresh_event');
    expect(exported.text).not.toContain('workspace.stale_event');
  });
});
