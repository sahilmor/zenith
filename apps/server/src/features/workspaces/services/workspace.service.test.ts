import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel, type UserDocument } from '../../users/models/user.model.js';
import { ActivityEventModel } from '../../activity/models/activity-event.model.js';
import { WorkspaceInvitationModel } from '../models/workspace-invitation.model.js';
import { WorkspaceMemberModel } from '../models/workspace-member.model.js';
import { WorkspaceService } from './workspace.service.js';

class MockEmailService {
  public sent: { to: string; acceptUrl: string }[] = [];

  public async sendWorkspaceInvitation(input: { to: string; acceptUrl: string }): Promise<void> {
    this.sent.push(input);
  }

  public async sendEmailVerification(): Promise<void> {
    await Promise.resolve();
  }

  public async sendPasswordReset(): Promise<void> {
    await Promise.resolve();
  }

  public isConfigured(): boolean {
    return true;
  }
}

const createUser = async (email: string, name = 'Test User'): Promise<UserDocument> =>
  UserModel.create({
    name,
    email,
    password: 'secure-password',
  }) as Promise<UserDocument>;

describe('WorkspaceService', () => {
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

  it('creates a workspace with owner membership and activity', async () => {
    const user = await createUser('owner@example.com');
    const service = new WorkspaceService();

    const workspace = await service.createWorkspace(user._id, {
      name: 'Design Team',
      visibility: 'private',
    });

    const membership = await WorkspaceMemberModel.findOne({
      workspaceId: workspace.id,
      userId: user._id,
    });
    const activity = await ActivityEventModel.findOne({ workspaceId: workspace.id });

    expect(workspace.slug).toBe('design-team');
    expect(workspace.currentUserRole).toBe('owner');
    expect(membership?.role).toBe('owner');
    expect(activity?.event).toBe('workspace.created');
  });

  it('generates numeric slug suffixes when names collide', async () => {
    const user = await createUser('owner@example.com');
    const service = new WorkspaceService();

    const first = await service.createWorkspace(user._id, {
      name: 'Design',
      visibility: 'private',
    });
    const second = await service.createWorkspace(user._id, {
      name: 'Design',
      visibility: 'private',
    });
    const third = await service.createWorkspace(user._id, {
      name: 'Design',
      visibility: 'private',
    });

    expect([first.slug, second.slug, third.slug]).toEqual(['design', 'design-1', 'design-2']);
  });

  it('prevents the last owner from leaving', async () => {
    const user = await createUser('owner@example.com');
    const service = new WorkspaceService();
    const workspace = await service.createWorkspace(user._id, {
      name: 'Ops',
      visibility: 'private',
    });

    await expect(
      service.leaveWorkspace(new mongoose.Types.ObjectId(workspace.id), user._id),
    ).rejects.toThrow('Workspace must keep at least one owner');
  });

  it('sends invitations and accepts them for the matching authenticated email', async () => {
    const owner = await createUser('owner@example.com', 'Owner User');
    const invitee = await createUser('invitee@example.com', 'Invitee User');
    const email = new MockEmailService();
    const service = new WorkspaceService(undefined, undefined, undefined, email);
    const workspace = await service.createWorkspace(owner._id, {
      name: 'Acme',
      visibility: 'private',
    });

    const invitation = await service.inviteMember(
      new mongoose.Types.ObjectId(workspace.id),
      owner._id,
      {
        email: invitee.email,
        role: 'manager',
      },
    );
    const storedInvitation = await WorkspaceInvitationModel.findById(invitation.id);
    expect(email.sent).toHaveLength(1);
    expect(storedInvitation?.token).toBeTruthy();

    const accepted = await service.acceptInvitation(invitee, storedInvitation?.token ?? '');
    const membership = await WorkspaceMemberModel.findOne({
      workspaceId: workspace.id,
      userId: invitee._id,
    });

    expect(accepted.id).toBe(workspace.id);
    expect(membership?.role).toBe('manager');
    expect(membership?.status).toBe('active');
  });

  it('previews invitations and rejects acceptance from a different signed-in email', async () => {
    const owner = await createUser('owner@example.com', 'Owner User');
    const invitee = await createUser('invitee@example.com', 'Invitee User');
    const otherUser = await createUser('other@example.com', 'Other User');
    const email = new MockEmailService();
    const service = new WorkspaceService(undefined, undefined, undefined, email);
    const workspace = await service.createWorkspace(owner._id, {
      name: 'Engineering',
      visibility: 'private',
    });

    const invitation = await service.inviteMember(
      new mongoose.Types.ObjectId(workspace.id),
      owner._id,
      {
        email: 'Invitee@Example.com',
        role: 'member',
      },
    );
    const storedInvitation = await WorkspaceInvitationModel.findById(invitation.id);
    const token = storedInvitation?.token ?? '';

    const preview = await service.previewInvitation(token);

    expect(preview.workspaceName).toBe('Engineering');
    expect(preview.email).toBe('invitee@example.com');
    await expect(service.acceptInvitation(otherUser, token)).rejects.toThrow(
      'Invitation does not match the signed-in user',
    );

    const accepted = await service.acceptInvitation(invitee, token);
    expect(accepted.id).toBe(workspace.id);
  });
});
