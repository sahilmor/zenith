import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { ActivityEventModel } from '../../activity/models/activity-event.model.js';
import { WorkspaceService } from '../../workspaces/services/workspace.service.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { ProjectModel } from '../models/project.model.js';
import { ProjectService } from './project.service.js';

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({
    name,
    email,
    password: 'secure-password',
  }) as Promise<UserDocument>;

describe('ProjectService', () => {
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

  it('creates projects for workspace managers and records activity', async () => {
    const user = await createUser('owner@example.com');
    const workspaceService = new WorkspaceService();
    const projectService = new ProjectService();
    const workspace = await workspaceService.createWorkspace(user._id, {
      name: 'Acme',
      visibility: 'private',
    });

    const project = await projectService.createProject(
      new mongoose.Types.ObjectId(workspace.id),
      user._id,
      {
        name: 'Web Platform',
        key: 'web',
        visibility: 'private',
      },
    );
    const activity = await ActivityEventModel.findOne({ event: 'project.created' });

    expect(project.key).toBe('WEB');
    expect(project.workspaceId).toBe(workspace.id);
    expect(activity?.metadata).toMatchObject({ key: 'WEB' });
  });

  it('rejects duplicate project keys in the same workspace', async () => {
    const user = await createUser('owner@example.com');
    const workspaceService = new WorkspaceService();
    const projectService = new ProjectService();
    const workspace = await workspaceService.createWorkspace(user._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const workspaceId = new mongoose.Types.ObjectId(workspace.id);

    await projectService.createProject(workspaceId, user._id, {
      name: 'API',
      key: 'API',
      visibility: 'private',
    });

    await expect(
      projectService.createProject(workspaceId, user._id, {
        name: 'Another API',
        key: 'api',
        visibility: 'private',
      }),
    ).rejects.toThrow('Project key already exists');
  });

  it('allows members to view projects but not create them', async () => {
    const owner = await createUser('owner@example.com');
    const member = await createUser('member@example.com');
    const workspaceService = new WorkspaceService();
    const projectService = new ProjectService();
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
    await projectService.createProject(workspaceId, owner._id, {
      name: 'Website',
      key: 'WEB',
      visibility: 'private',
    });

    const projects = await projectService.listProjects(workspaceId, member._id);
    await expect(
      projectService.createProject(workspaceId, member._id, {
        name: 'Mobile',
        key: 'MOB',
        visibility: 'private',
      }),
    ).rejects.toThrow('Project manager access required');

    expect(projects).toHaveLength(1);
  });

  it('prevents updates to archived projects and restores them', async () => {
    const user = await createUser('owner@example.com');
    const workspaceService = new WorkspaceService();
    const projectService = new ProjectService();
    const workspace = await workspaceService.createWorkspace(user._id, {
      name: 'Acme',
      visibility: 'private',
    });
    const project = await projectService.createProject(
      new mongoose.Types.ObjectId(workspace.id),
      user._id,
      {
        name: 'Operations',
        key: 'OPS',
        visibility: 'private',
      },
    );
    const projectId = new mongoose.Types.ObjectId(project.id);

    const archived = await projectService.archiveProject(projectId, user._id);
    await expect(
      projectService.updateProject(projectId, user._id, { name: 'Ops' }),
    ).rejects.toThrow('Archived projects cannot be modified');
    const restored = await projectService.restoreProject(projectId, user._id);

    expect(archived.status).toBe('archived');
    expect(restored.status).toBe('active');
    expect(await ProjectModel.countDocuments()).toBe(1);
  });
});
