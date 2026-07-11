import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { TokenService } from '../../auth/services/token.service.js';
import { ProjectModel } from '../../projects/models/project.model.js';
import { TaskModel } from '../../tasks/models/task.model.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { subscriptionService } from '../../billing/services/subscription.service.js';

const tokens = new TokenService();

const createUser = async (email: string, name = 'Strategic User'): Promise<UserDocument> =>
  UserModel.create({ name, email, password: 'secure-password' }) as Promise<UserDocument>;

const bearer = (user: UserDocument): string =>
  `Bearer ${tokens.generateAccessToken({ userId: user.id, email: user.email, role: user.role })}`;

describe('Strategic planning module', () => {
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

  it('enforces strategic entitlements and supports goals, key results, check-ins, and cycle checks', async () => {
    const app = createApp();
    const owner = await createUser('strategy-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Strategy Workspace',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);

    await request(app)
      .post(`/api/workspaces/${workspace.id}/goals`)
      .set('Authorization', bearer(owner))
      .send({ title: 'Grow retention', type: 'objective' })
      .expect(403);

    await subscriptionService.syncSubscription({
      workspaceId,
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    const goal = await request(app)
      .post(`/api/workspaces/${workspace.id}/goals`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'Grow retention',
        type: 'objective',
        status: 'active',
        progressMode: 'automatic',
        confidence: 72,
      })
      .expect(201);

    const keyResult = await request(app)
      .post(`/api/goals/${goal.body.data.id}/key-results`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'Reach 80% activation',
        measurementType: 'percentage',
        startValue: 40,
        currentValue: 60,
        targetValue: 80,
      })
      .expect(201);

    expect(keyResult.body.data.progress).toBe(50);

    const child = await request(app)
      .post(`/api/workspaces/${workspace.id}/goals`)
      .set('Authorization', bearer(owner))
      .send({
        title: 'Improve onboarding',
        parentGoalId: goal.body.data.id,
        manualProgress: 20,
      })
      .expect(201);

    await request(app)
      .patch(`/api/goals/${goal.body.data.id}`)
      .set('Authorization', bearer(owner))
      .send({ parentGoalId: child.body.data.id })
      .expect(409);

    const checkIn = await request(app)
      .post(`/api/goals/${goal.body.data.id}/check-ins`)
      .set('Authorization', bearer(owner))
      .send({
        progress: 55,
        health: 'on_track',
        confidence: 70,
        summary: 'Activation experiment is moving well.',
        blockers: 'None',
        nextSteps: 'Expand cohort.',
      })
      .expect(201);

    const checkIns = await request(app)
      .get(`/api/goals/${goal.body.data.id}/check-ins`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(checkIn.body.data.summary).toContain('Activation');
    expect(checkIns.body.data).toHaveLength(1);
  });

  it('creates initiatives, portfolios, strategic links, and real project progress rollups', async () => {
    const app = createApp();
    const owner = await createUser('rollup-owner@example.com');
    const workspace = await new WorkspaceService().createWorkspace(owner._id, {
      name: 'Rollup Workspace',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);
    await subscriptionService.syncSubscription({
      workspaceId,
      provider: 'local',
      planCode: 'business',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });

    const project = await ProjectModel.create({
      workspaceId,
      name: 'Mobile App',
      key: 'MOB',
      visibility: 'private',
      ownerId: owner._id,
      createdBy: owner._id,
    });
    await TaskModel.create([
      {
        workspaceId,
        projectId: project._id,
        boardId: new mongoose.Types.ObjectId(),
        columnId: new mongoose.Types.ObjectId(),
        title: 'Done task',
        order: 0,
        status: 'done',
        reporterId: owner._id,
        createdBy: owner._id,
      },
      {
        workspaceId,
        projectId: project._id,
        boardId: new mongoose.Types.ObjectId(),
        columnId: new mongoose.Types.ObjectId(),
        title: 'Open task',
        order: 1,
        status: 'open',
        reporterId: owner._id,
        createdBy: owner._id,
      },
    ]);

    const initiative = await request(app)
      .post(`/api/workspaces/${workspace.id}/initiatives`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Mobile expansion', progressMode: 'automatic', status: 'active' })
      .expect(201);

    const portfolio = await request(app)
      .post(`/api/workspaces/${workspace.id}/portfolios`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Growth portfolio', status: 'active' })
      .expect(201);

    await request(app)
      .post('/api/strategic-links')
      .set('Authorization', bearer(owner))
      .send({
        workspaceId: workspace.id,
        sourceType: 'initiative',
        sourceId: initiative.body.data.id,
        targetType: 'project',
        targetId: project.id,
        relationshipType: 'contains',
        weight: 1,
      })
      .expect(201);

    await request(app)
      .post('/api/strategic-links')
      .set('Authorization', bearer(owner))
      .send({
        workspaceId: workspace.id,
        sourceType: 'portfolio',
        sourceId: portfolio.body.data.id,
        targetType: 'initiative',
        targetId: initiative.body.data.id,
        relationshipType: 'contains',
        weight: 1,
      })
      .expect(201);

    await request(app)
      .post('/api/strategic-links')
      .set('Authorization', bearer(owner))
      .send({
        workspaceId: workspace.id,
        sourceType: 'portfolio',
        sourceId: portfolio.body.data.id,
        targetType: 'initiative',
        targetId: initiative.body.data.id,
        relationshipType: 'contains',
        weight: 1,
      })
      .expect(409);

    const refreshedInitiative = await request(app)
      .get(`/api/initiatives/${initiative.body.data.id}`)
      .set('Authorization', bearer(owner))
      .expect(200);
    const refreshedPortfolio = await request(app)
      .get(`/api/portfolios/${portfolio.body.data.id}`)
      .set('Authorization', bearer(owner))
      .expect(200);
    const dashboard = await request(app)
      .get(`/api/workspaces/${workspace.id}/strategic-dashboard`)
      .set('Authorization', bearer(owner))
      .expect(200);

    expect(refreshedInitiative.body.data.progress).toBe(50);
    expect(refreshedPortfolio.body.data.progress).toBe(50);
    expect(dashboard.body.data.generatedAt).toBeTruthy();
  });
});
