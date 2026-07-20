import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ActivityEventModel } from '../../activity/models/activity-event.model.js';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { DevOpsService } from './devops.service.js';

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({
    name,
    email,
    password: 'secure-password',
  }) as Promise<UserDocument>;

describe('DevOpsService', () => {
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

  it('connects repositories and prevents duplicate provider mappings', async () => {
    const owner = await createUser('owner@example.com');
    const workspaceService = new WorkspaceService();
    const devOpsService = new DevOpsService();
    const workspace = await workspaceService.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);

    const repository = await devOpsService.createRepository(workspaceId, owner._id, {
      provider: 'github',
      providerRepositoryId: 'repo-1',
      name: 'api',
      fullName: 'acme/api',
      url: 'https://github.com/acme/api',
      defaultBranch: 'main',
      visibility: 'private',
      topics: ['node'],
    });

    await expect(
      devOpsService.createRepository(workspaceId, owner._id, {
        provider: 'github',
        providerRepositoryId: 'repo-1',
        name: 'api-copy',
        fullName: 'acme/api-copy',
        url: 'https://github.com/acme/api-copy',
        defaultBranch: 'main',
        visibility: 'private',
        topics: [],
      }),
    ).rejects.toThrow('Repository connection already exists');
    expect(repository.fullName).toBe('acme/api');
    expect(await ActivityEventModel.countDocuments({ event: 'devops.repository.connected' })).toBe(
      1,
    );
  });

  it('restricts write operations to workspace managers', async () => {
    const owner = await createUser('owner@example.com');
    const member = await createUser('member@example.com');
    const workspaceService = new WorkspaceService();
    const devOpsService = new DevOpsService();
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

    await expect(
      devOpsService.createRepository(workspaceId, member._id, {
        provider: 'gitlab',
        providerRepositoryId: 'repo-2',
        name: 'web',
        fullName: 'acme/web',
        url: 'https://gitlab.com/acme/web',
        defaultBranch: 'main',
        visibility: 'private',
        topics: [],
      }),
    ).rejects.toThrow('Engineering manager access required');
  });

  it('calculates engineering metrics from pull requests, pipelines, and deployments', async () => {
    const owner = await createUser('owner@example.com');
    const workspaceService = new WorkspaceService();
    const devOpsService = new DevOpsService();
    const workspace = await workspaceService.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);
    const repository = await devOpsService.createRepository(workspaceId, owner._id, {
      provider: 'github',
      providerRepositoryId: 'repo-3',
      name: 'platform',
      fullName: 'acme/platform',
      url: 'https://github.com/acme/platform',
      defaultBranch: 'main',
      visibility: 'private',
      topics: ['platform'],
    });
    const repositoryId = new mongoose.Types.ObjectId(repository.id);

    await devOpsService.upsertPullRequest(repositoryId, owner._id, {
      providerPullRequestId: 'pr-1',
      number: 1,
      title: 'Ship deployment pipeline',
      url: 'https://github.com/acme/platform/pull/1',
      status: 'merged',
      reviewStatus: 'approved',
      sourceBranch: 'feature/deploy',
      targetBranch: 'main',
      authorName: 'Avery',
      openedAt: '2026-07-18T08:00:00.000Z',
      mergedAt: '2026-07-18T12:00:00.000Z',
      additions: 100,
      deletions: 20,
      changedFiles: 8,
      linkedWorkItems: [],
    });
    await devOpsService.upsertPipelineRun(repositoryId, owner._id, {
      providerPipelineId: 'build-1',
      name: 'CI',
      status: 'success',
      branchName: 'main',
      commitSha: 'abc1234',
      startedAt: '2026-07-18T12:05:00.000Z',
      finishedAt: '2026-07-18T12:15:00.000Z',
      durationSeconds: 600,
      testTotal: 120,
      testFailed: 0,
      artifactCount: 2,
    });
    await devOpsService.upsertDeployment(repositoryId, owner._id, {
      providerDeploymentId: 'deploy-1',
      environment: 'Production',
      environmentType: 'production',
      status: 'success',
      commitSha: 'abc1234',
      version: '2026.07.18',
      deployedAt: '2026-07-18T12:30:00.000Z',
      completedAt: '2026-07-18T12:40:00.000Z',
    });

    const summary = await devOpsService.getWorkspaceSummary(workspaceId, owner._id, {
      from: new Date('2026-07-18T00:00:00.000Z'),
      to: new Date('2026-07-19T00:00:00.000Z'),
    });

    expect(summary.metrics.repositoryCount).toBe(1);
    expect(summary.metrics.mergedPullRequestCount).toBe(1);
    expect(summary.metrics.deploymentFrequency).toBe(1);
    expect(summary.metrics.leadTimeHours).toBe(4);
    expect(summary.metrics.buildSuccessRate).toBe(100);
    expect(summary.metrics.releaseRisk).toBe('low');
  });
});
