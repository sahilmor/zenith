import crypto from 'node:crypto';
import type {
  WorkspaceInvitationStatus,
  WorkspaceInvitationSummary,
  WorkspaceMemberSummary,
  WorkspaceRole,
  WorkspaceSettings,
  WorkspaceSummary,
} from '@pm/types';
import type { Types } from 'mongoose';
import { env } from '../../../config/env.js';
import { ActivityService } from '../../activity/services/activity.service.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import type { UserDocument } from '../../users/models/user.model.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../utils/app-error.js';
import { EmailService, type EmailSender } from '../../../services/email.service.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { automationService } from '../../ai/services/automation.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import type {
  CreateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
} from '../validation/workspace.validation.js';
import { WorkspaceRepository } from '../repositories/workspace.repository.js';
import type { WorkspaceInvitationDocument } from '../models/workspace-invitation.model.js';
import type { WorkspaceMemberDocument } from '../models/workspace-member.model.js';
import type { WorkspaceDocument } from '../models/workspace.model.js';

export class WorkspaceService {
  public constructor(
    private readonly workspaces = new WorkspaceRepository(),
    private readonly users = new UserRepository(),
    private readonly activity = new ActivityService(),
    private readonly email: EmailSender = new EmailService(),
  ) {}

  public async createWorkspace(
    userId: Types.ObjectId,
    input: CreateWorkspaceInput,
  ): Promise<WorkspaceSummary> {
    const slug = await this.generateUniqueSlug(input.name);
    const workspace = await this.workspaces.createWorkspace({
      name: input.name,
      slug,
      description: input.description ?? null,
      ownerId: userId,
      visibility: input.visibility,
    });
    await this.workspaces.createMember({
      workspaceId: workspace._id,
      userId,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });
    await this.activity.record({
      workspaceId: workspace._id,
      actorId: userId,
      event: 'workspace.created',
      metadata: { workspaceName: workspace.name },
    });
    const summary = this.toWorkspaceSummary(workspace, 'owner');
    realtimeService.emitMutation({
      resource: 'workspace',
      action: 'created',
      workspaceId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async listWorkspaces(userId: Types.ObjectId): Promise<WorkspaceSummary[]> {
    const memberships = await this.workspaces.listActiveMemberships(userId);
    if (memberships.length === 0) return [];
    const roleByWorkspace = new Map(
      memberships.map((membership) => [
        membership.workspaceId.toString(),
        membership.role as WorkspaceRole,
      ]),
    );
    const workspaceIds = memberships.map((membership) => membership.workspaceId);
    const workspaces = await this.workspaces.listWorkspacesByIds(workspaceIds);
    return workspaces.map((workspace) =>
      this.toWorkspaceSummary(workspace, roleByWorkspace.get(workspace.id)),
    );
  }

  public async getWorkspace(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceSummary> {
    const { workspace, membership } = await this.requireActiveMembership(workspaceId, userId);
    return this.toWorkspaceSummary(workspace, membership.role as WorkspaceRole);
  }

  public async updateWorkspace(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceSummary> {
    await this.requireManager(workspaceId, userId);
    const update: Record<string, unknown> = { ...input };
    if (input.settings) {
      update.$set = Object.entries(input.settings).reduce<Record<string, boolean>>(
        (acc, [key, value]) => {
          if (typeof value === 'boolean') acc[`settings.${key}`] = value;
          return acc;
        },
        {},
      );
      delete update.settings;
    }
    const workspace = await this.workspaces.updateWorkspace(workspaceId, update);
    if (!workspace) throw new NotFoundError('Workspace not found');
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event: 'workspace.updated',
      metadata: { fields: Object.keys(input) },
    });
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    const summary = this.toWorkspaceSummary(
      workspace,
      membership?.role as WorkspaceRole | undefined,
    );
    realtimeService.emitMutation({
      resource: 'workspace',
      action: 'updated',
      workspaceId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async archiveWorkspace(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    await this.requireManager(workspaceId, userId);
    const workspace = await this.workspaces.updateWorkspace(workspaceId, { archived: true });
    if (!workspace) throw new NotFoundError('Workspace not found');
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event: 'workspace.archived',
      metadata: { workspaceName: workspace.name },
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'workspace',
      targetId: workspace.id,
      action: 'workspace.deleted',
      metadata: { archived: true, workspaceName: workspace.name },
    });
    realtimeService.emitMutation({
      resource: 'workspace',
      action: 'archived',
      workspaceId: workspace.id,
      actorId: userId.toString(),
      data: { workspaceId: workspace.id },
    });
  }

  public async inviteMember(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: InviteMemberInput,
  ): Promise<WorkspaceInvitationSummary> {
    const { workspace } = await this.requireManager(workspaceId, userId);
    await entitlementService.requireWithinLimit(workspaceId, 'members');
    const inviter = await this.users.findById(userId.toString());
    if (!inviter) throw new NotFoundError('Inviting user not found');
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) {
      const existingMembership = await this.workspaces.findMembership(
        workspaceId,
        existingUser._id,
      );
      if (existingMembership?.status === 'active')
        throw new ConflictError('User is already a member');
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await this.workspaces.createInvitation({
      workspaceId,
      email: input.email,
      token,
      role: input.role,
      invitedBy: userId,
      expiresAt,
    });
    const acceptUrl = `${env.APP_URL.replace(/\/$/, '')}/invitations/accept?token=${token}`;
    await this.email.sendWorkspaceInvitation({
      to: input.email,
      workspaceName: workspace.name,
      invitedByName: inviter.name,
      acceptUrl,
    });
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event: 'member.invited',
      metadata: { email: input.email, role: input.role },
    });
    const summary = this.toInvitationSummary(invitation);
    realtimeService.emitMutation({
      resource: 'member',
      action: 'invited',
      workspaceId: workspaceId.toString(),
      actorId: userId.toString(),
      data: summary,
    });
    if (existingUser) {
      await notificationService.create({
        userId: existingUser._id,
        workspaceId,
        actorId: userId,
        type: 'workspace_invitation',
        workspaceName: workspace.name,
      });
    }
    return summary;
  }

  public async listMembers(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceMemberSummary[]> {
    await this.requireActiveMembership(workspaceId, userId);
    const members = await this.workspaces.listMembers(workspaceId);
    return members.map((member) => this.toMemberSummary(member));
  }

  public async listInvitations(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceInvitationSummary[]> {
    await this.requireManager(workspaceId, userId);
    const invitations = await this.workspaces.listInvitations(workspaceId);
    return invitations.map((invitation) => this.toInvitationSummary(invitation));
  }

  public async updateMemberRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    memberId: Types.ObjectId,
    input: UpdateMemberRoleInput,
  ): Promise<WorkspaceMemberSummary> {
    const { workspace } = await this.requireManager(workspaceId, userId);
    const member = await this.requireMemberInWorkspace(workspaceId, memberId);
    if (member.role === 'owner' && input.role !== 'owner')
      await this.ensureAnotherOwner(workspaceId);
    const updated = await this.workspaces.updateMemberRole(memberId, input.role);
    if (!updated) throw new NotFoundError('Member not found');
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event: 'member.role_changed',
      metadata: { memberId: member.id, from: member.role, to: input.role },
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'workspace_member',
      targetId: member.id,
      action: 'permission.role_changed',
      metadata: { from: member.role, to: input.role, userId: member.userId.toString() },
    });
    const summary = this.toMemberSummary(updated);
    await notificationService.create({
      userId: updated.userId,
      workspaceId,
      actorId: userId,
      type: 'workspace_role_changed',
      workspaceName: workspace.name,
      metadata: { role: input.role },
    });
    realtimeService.emitMutation({
      resource: 'member',
      action: 'updated',
      workspaceId: workspaceId.toString(),
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async removeMember(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    memberId: Types.ObjectId,
  ): Promise<void> {
    await this.requireManager(workspaceId, userId);
    const member = await this.requireMemberInWorkspace(workspaceId, memberId);
    if (member.userId.equals(userId)) {
      throw new ForbiddenError(
        'Owner cannot remove themselves; transfer ownership or leave workspace',
      );
    }
    if (member.role === 'owner') await this.ensureAnotherOwner(workspaceId);
    await this.workspaces.deleteMember(memberId);
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event: 'member.removed',
      metadata: { memberId: member.id, userId: member.userId.toString() },
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'workspace_member',
      targetId: member.id,
      action: 'permission.member_removed',
      metadata: { userId: member.userId.toString(), role: member.role },
    });
    realtimeService.emitMutation({
      resource: 'member',
      action: 'removed',
      workspaceId: workspaceId.toString(),
      actorId: userId.toString(),
      data: { memberId: member.id, userId: member.userId.toString() },
    });
  }

  public async leaveWorkspace(workspaceId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const { membership } = await this.requireActiveMembership(workspaceId, userId);
    if (membership.role === 'owner') await this.ensureAnotherOwner(workspaceId);
    await this.workspaces.deleteMember(membership._id);
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event: 'member.removed',
      metadata: { userId: userId.toString(), reason: 'left' },
    });
    realtimeService.emitMutation({
      resource: 'member',
      action: 'left',
      workspaceId: workspaceId.toString(),
      actorId: userId.toString(),
      data: { userId: userId.toString() },
    });
  }

  public async acceptInvitation(user: UserDocument, token: string): Promise<WorkspaceSummary> {
    const invitation = await this.workspaces.findInvitationByToken(token);
    if (!invitation) throw new NotFoundError('Invitation not found');
    if (invitation.status !== 'pending')
      throw new BadRequestError('Invitation is no longer pending');
    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.workspaces.updateInvitation({ _id: invitation._id }, { status: 'expired' });
      throw new BadRequestError('Invitation has expired');
    }
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError('Invitation does not match the signed-in user');
    }
    await entitlementService.requireWithinLimit(invitation.workspaceId, 'members');
    await this.workspaces.upsertActiveMember({
      workspaceId: invitation.workspaceId,
      userId: user._id,
      role: invitation.role as WorkspaceRole,
      invitedBy: invitation.invitedBy,
    });
    await this.workspaces.updateInvitation(
      { _id: invitation._id },
      { status: 'accepted', acceptedAt: new Date() },
    );
    await this.activity.record({
      workspaceId: invitation.workspaceId,
      actorId: user._id,
      event: 'member.joined',
      metadata: { email: user.email, role: invitation.role },
    });
    const workspace = await this.getWorkspace(invitation.workspaceId, user._id);
    realtimeService.emitMutation({
      resource: 'member',
      action: 'joined',
      workspaceId: invitation.workspaceId.toString(),
      actorId: user.id,
      data: { userId: user.id, role: invitation.role },
    });
    void automationService.runForEvent({
      workspaceId: invitation.workspaceId,
      actorId: user._id,
      trigger: 'workspace_invitation_accepted',
      fields: {
        userId: user.id,
        email: user.email,
        role: invitation.role,
      },
    });
    return workspace;
  }

  public async requireActiveMembership(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    const [workspace, membership] = await Promise.all([
      this.workspaces.findWorkspaceById(workspaceId),
      this.workspaces.findMembership(workspaceId, userId),
    ]);
    if (!workspace || workspace.archived) throw new NotFoundError('Workspace not found');
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access denied');
    return { workspace, membership };
  }

  private async requireManager(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    const context = await this.requireActiveMembership(workspaceId, userId);
    if (!['owner', 'admin'].includes(context.membership.role)) {
      throw new ForbiddenError('Workspace manager access required');
    }
    return context;
  }

  private async requireMemberInWorkspace(workspaceId: Types.ObjectId, memberId: Types.ObjectId) {
    const member = await this.workspaces.findMemberById(memberId);
    if (!member || !member.workspaceId.equals(workspaceId))
      throw new NotFoundError('Member not found');
    return member;
  }

  private async ensureAnotherOwner(workspaceId: Types.ObjectId): Promise<void> {
    const owners = await this.workspaces.countOwners(workspaceId);
    if (owners <= 1) throw new ForbiddenError('Workspace must keep at least one owner');
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'workspace';
    let candidate = base;
    let suffix = 0;
    while (await this.workspaces.findWorkspaceBySlug(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  private toWorkspaceSummary(
    workspace: WorkspaceDocument,
    currentUserRole?: WorkspaceRole,
  ): WorkspaceSummary {
    const settings = workspace.settings as WorkspaceSettings;
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description ?? null,
      logo: workspace.logo ?? null,
      ownerId: workspace.ownerId.toString(),
      visibility: workspace.visibility,
      plan: workspace.plan,
      settings: { allowPublicDiscovery: Boolean(settings.allowPublicDiscovery) },
      archived: workspace.archived,
      ...(currentUserRole ? { currentUserRole } : {}),
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  private toMemberSummary(member: WorkspaceMemberDocument): WorkspaceMemberSummary {
    const populatedUser = member.populated('userId')
      ? (member.userId as unknown as UserDocument)
      : null;
    const summary: WorkspaceMemberSummary = {
      id: member.id,
      workspaceId: member.workspaceId.toString(),
      userId: populatedUser ? populatedUser.id : member.userId.toString(),
      role: member.role as WorkspaceRole,
      status: member.status,
      invitedBy: member.invitedBy?.toString() ?? null,
      joinedAt: member.joinedAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
    if (populatedUser) {
      return {
        ...summary,
        user: {
          id: populatedUser.id,
          name: populatedUser.name,
          email: populatedUser.email,
          avatar: populatedUser.avatar ?? null,
        },
      };
    }
    return summary;
  }

  private toInvitationSummary(invitation: WorkspaceInvitationDocument): WorkspaceInvitationSummary {
    const status =
      invitation.status === 'pending' && invitation.expiresAt.getTime() < Date.now()
        ? 'expired'
        : (invitation.status as WorkspaceInvitationStatus);
    return {
      id: invitation.id,
      workspaceId: invitation.workspaceId.toString(),
      email: invitation.email,
      role: invitation.role as WorkspaceRole,
      invitedBy: invitation.invitedBy.toString(),
      expiresAt: invitation.expiresAt.toISOString(),
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      status,
      createdAt: invitation.createdAt.toISOString(),
    };
  }
}
