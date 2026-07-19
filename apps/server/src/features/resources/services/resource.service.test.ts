import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ActivityEventModel } from '../../activity/models/activity-event.model.js';
import { ProjectService } from '../../projects/services/project.service.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { ResourceService } from './resource.service.js';

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({
    name,
    email,
    password: 'secure-password',
  }) as Promise<UserDocument>;

describe('ResourceService', () => {
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

  it('tracks running timers and creates accurate time entries', async () => {
    const owner = await createUser('owner@example.com');
    const workspaceService = new WorkspaceService();
    const resourceService = new ResourceService();
    const workspace = await workspaceService.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);

    const timer = await resourceService.startTimer(workspaceId, owner._id, {
      description: 'Implementation',
      billable: true,
      startedAt: '2026-07-18T08:00:00.000Z',
      timezone: 'Asia/Kolkata',
    });
    const entry = await resourceService.stopTimer(workspaceId, owner._id, {
      endedAt: '2026-07-18T09:30:00.000Z',
    });
    const timesheet = await resourceService.getTimesheet(workspaceId, owner._id, {
      from: new Date('2026-07-18T00:00:00.000Z'),
      to: new Date('2026-07-19T00:00:00.000Z'),
    });

    expect(timer.description).toBe('Implementation');
    expect(entry.minutes).toBe(90);
    expect(entry.billable).toBe(true);
    expect(timesheet.totalMinutes).toBe(90);
    expect(timesheet.billableMinutes).toBe(90);
    await expect(resourceService.getTimer(workspaceId, owner._id)).resolves.toBeNull();
  });

  it('restricts resource profile and allocation management to workspace managers', async () => {
    const owner = await createUser('owner@example.com');
    const member = await createUser('member@example.com');
    const workspaceService = new WorkspaceService();
    const projectService = new ProjectService();
    const resourceService = new ResourceService();
    const workspace = await workspaceService.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);
    await WorkspaceMemberModel.create({
      workspaceId,
      userId: member._id,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });
    const project = await projectService.createProject(workspaceId, owner._id, {
      name: 'Platform',
      key: 'PLAT',
      visibility: 'private',
    });

    await expect(
      resourceService.upsertProfile(workspaceId, member._id, member._id, {
        title: 'Engineer',
      }),
    ).rejects.toThrow('Resource manager access required');

    const profile = await resourceService.upsertProfile(workspaceId, member._id, owner._id, {
      title: 'Engineer',
      department: 'Product Engineering',
      weeklyCapacityMinutes: 1800,
      skills: [{ name: 'Backend', level: 4 }],
    });
    const allocation = await resourceService.createAllocation(workspaceId, owner._id, {
      userId: member.id,
      projectId: project.id,
      allocationPercent: 75,
      startDate: '2026-07-18T00:00:00.000Z',
      endDate: '2026-07-25T00:00:00.000Z',
      status: 'active',
    });

    expect(profile.department).toBe('Product Engineering');
    expect(allocation.allocationPercent).toBe(75);
    expect(await ActivityEventModel.countDocuments({ event: 'resource.allocation.created' })).toBe(
      1,
    );
  });

  it('calculates utilization, over-allocation, availability, and recommendations', async () => {
    const owner = await createUser('owner@example.com');
    const engineer = await createUser('engineer@example.com');
    const workspaceService = new WorkspaceService();
    const projectService = new ProjectService();
    const resourceService = new ResourceService();
    const workspace = await workspaceService.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);
    await WorkspaceMemberModel.create({
      workspaceId,
      userId: engineer._id,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });
    const project = await projectService.createProject(workspaceId, owner._id, {
      name: 'Delivery',
      key: 'DEL',
      visibility: 'private',
    });

    await resourceService.upsertProfile(workspaceId, engineer._id, owner._id, {
      title: 'Delivery Engineer',
      weeklyCapacityMinutes: 2400,
    });
    await resourceService.createAllocation(workspaceId, owner._id, {
      userId: engineer.id,
      projectId: project.id,
      allocationPercent: 125,
      startDate: '2026-07-18T00:00:00.000Z',
      endDate: '2026-07-25T00:00:00.000Z',
      status: 'active',
    });
    await resourceService.createAvailability(workspaceId, owner._id, {
      userId: engineer.id,
      type: 'leave',
      title: 'Holiday',
      startDate: '2026-07-18T00:00:00.000Z',
      endDate: '2026-07-18T00:00:00.000Z',
      minutesUnavailable: 480,
    });
    await resourceService.createTimeEntry(workspaceId, engineer._id, {
      startedAt: '2026-07-18T08:00:00.000Z',
      endedAt: '2026-07-18T10:00:00.000Z',
      timezone: 'UTC',
      billable: false,
    });

    const summary = await resourceService.getWorkspaceSummary(workspaceId, owner._id, {
      from: new Date('2026-07-18T00:00:00.000Z'),
      to: new Date('2026-07-25T00:00:00.000Z'),
    });
    const forecast = await resourceService.forecast(workspaceId, owner._id, {
      from: new Date('2026-07-18T00:00:00.000Z'),
      to: new Date('2026-07-25T00:00:00.000Z'),
    });

    expect(summary.overAllocatedCount).toBe(1);
    expect(summary.totalLoggedMinutes).toBe(120);
    expect(summary.workload[0]?.status).toBe('over_allocated');
    expect(forecast.deliveryRisk).toBe('high');
    expect(forecast.insights.some((insight) => insight.includes('over-allocated'))).toBe(true);
  });
});
