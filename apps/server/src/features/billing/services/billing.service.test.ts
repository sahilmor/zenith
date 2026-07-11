import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { BillingWebhookEventModel } from '../models/billing-webhook-event.model.js';
import { entitlementService } from './entitlement.service.js';
import { subscriptionService } from './subscription.service.js';

const tokens = new TokenService();

const createUser = async (email: string, name = 'Billing User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: user.role })}`;

describe('Billing module', () => {
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

  it('returns plans, default free subscription, and workspace entitlements', async () => {
    const app = createApp();
    const owner = await createUser('billing-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Billing Workspace',
      visibility: 'private',
    });

    const plans = await request(app).get('/api/billing/plans').expect(200);
    expect(plans.body.data.map((plan: { code: string }) => plan.code)).toContain('business');

    const billing = await request(app)
      .get(`/api/workspaces/${workspace.id}/billing`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(billing.body.data.subscription.planCode).toBe('free');
    expect(billing.body.data.entitlements.limits.projects).toBe(3);
  });

  it('enforces project limits and allows creation after upgrade', async () => {
    const owner = await createUser('limit-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Limited Workspace',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);
    const projects = new ProjectService();

    await projects.createProject(workspaceId, owner._id, {
      name: 'One',
      key: 'ONE',
      visibility: 'private',
    });
    await projects.createProject(workspaceId, owner._id, {
      name: 'Two',
      key: 'TWO',
      visibility: 'private',
    });
    await projects.createProject(workspaceId, owner._id, {
      name: 'Three',
      key: 'THR',
      visibility: 'private',
    });

    await expect(
      projects.createProject(workspaceId, owner._id, {
        name: 'Four',
        key: 'FOUR',
        visibility: 'private',
      }),
    ).rejects.toThrow('Plan limit reached');

    await subscriptionService.syncSubscription({
      workspaceId,
      provider: 'local',
      planCode: 'pro',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    await expect(
      projects.createProject(workspaceId, owner._id, {
        name: 'Four',
        key: 'FOUR',
        visibility: 'private',
      }),
    ).resolves.toMatchObject({ key: 'FOUR' });
  });

  it('creates checkout sessions without trusting client prices', async () => {
    const app = createApp();
    const owner = await createUser('checkout-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Checkout Workspace',
      visibility: 'private',
    });

    const checkout = await request(app)
      .post(`/api/workspaces/${workspace.id}/billing/checkout`)
      .set('Authorization', bearer(owner))
      .send({ planCode: 'pro', billingInterval: 'monthly', priceId: 'attacker_price' })
      .expect(201);

    expect(checkout.body.data.providerPriceId).toBe('local_pro_monthly');
    const entitlements = await entitlementService.getWorkspaceEntitlements(
      new mongoose.Types.ObjectId(workspace.id),
    );
    expect(entitlements.subscription.planCode).toBe('pro');
  });

  it('processes local webhook events idempotently', async () => {
    const app = createApp();
    const owner = await createUser('webhook-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Webhook Workspace',
      visibility: 'private',
    });
    const payload = {
      id: 'evt_billing_once',
      type: 'subscription.updated',
      data: {
        workspaceId: workspace.id,
        planCode: 'business',
        billingInterval: 'annual',
        status: 'active',
      },
    };

    await request(app).post('/api/billing/webhooks/local').send(payload).expect(200);
    await request(app).post('/api/billing/webhooks/local').send(payload).expect(200);

    const events = await BillingWebhookEventModel.find({ providerEventId: 'evt_billing_once' });
    expect(events).toHaveLength(1);
    const entitlements = await entitlementService.getWorkspaceEntitlements(
      new mongoose.Types.ObjectId(workspace.id),
    );
    expect(entitlements.subscription.planCode).toBe('business');
  });
});
