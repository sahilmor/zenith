import type { WorkspaceRole } from '@pm/types';
import type { FilterQuery, Types } from 'mongoose';
import { UserModel } from '../../users/models/user.model.js';
import { WorkspaceInvitationModel } from '../models/workspace-invitation.model.js';
import {
  WorkspaceMemberModel,
  type WorkspaceMemberDocument,
} from '../models/workspace-member.model.js';
import { WorkspaceModel, type WorkspaceDocument } from '../models/workspace.model.js';

export class WorkspaceRepository {
  public async createWorkspace(input: {
    name: string;
    slug: string;
    description?: string | null;
    ownerId: Types.ObjectId;
    visibility: 'private' | 'public';
  }): Promise<WorkspaceDocument> {
    return WorkspaceModel.create(input) as Promise<WorkspaceDocument>;
  }

  public async findWorkspaceBySlug(slug: string): Promise<WorkspaceDocument | null> {
    return WorkspaceModel.findOne({ slug }).exec() as Promise<WorkspaceDocument | null>;
  }

  public async findWorkspaceById(id: Types.ObjectId): Promise<WorkspaceDocument | null> {
    return WorkspaceModel.findById(id).exec() as Promise<WorkspaceDocument | null>;
  }

  public async updateWorkspace(
    id: Types.ObjectId,
    update: Partial<WorkspaceDocument>,
  ): Promise<WorkspaceDocument | null> {
    return WorkspaceModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec() as Promise<WorkspaceDocument | null>;
  }

  public async createMember(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    role: WorkspaceRole;
    status: 'active' | 'invited' | 'suspended';
    invitedBy?: Types.ObjectId | null;
    joinedAt?: Date | null;
  }): Promise<WorkspaceMemberDocument> {
    return WorkspaceMemberModel.create(input) as Promise<WorkspaceMemberDocument>;
  }

  public async upsertActiveMember(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    role: WorkspaceRole;
    invitedBy?: Types.ObjectId | null;
  }): Promise<WorkspaceMemberDocument> {
    return WorkspaceMemberModel.findOneAndUpdate(
      { workspaceId: input.workspaceId, userId: input.userId },
      {
        $set: {
          role: input.role,
          status: 'active',
          invitedBy: input.invitedBy ?? null,
          joinedAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec() as Promise<WorkspaceMemberDocument>;
  }

  public async findMembership(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceMemberDocument | null> {
    return WorkspaceMemberModel.findOne({
      workspaceId,
      userId,
    }).exec() as Promise<WorkspaceMemberDocument | null>;
  }

  public async findMemberById(memberId: Types.ObjectId): Promise<WorkspaceMemberDocument | null> {
    return WorkspaceMemberModel.findById(
      memberId,
    ).exec() as Promise<WorkspaceMemberDocument | null>;
  }

  public async listActiveMemberships(userId: Types.ObjectId): Promise<WorkspaceMemberDocument[]> {
    return WorkspaceMemberModel.find({ userId, status: 'active' }).exec() as Promise<
      WorkspaceMemberDocument[]
    >;
  }

  public async listMembers(workspaceId: Types.ObjectId): Promise<WorkspaceMemberDocument[]> {
    return WorkspaceMemberModel.find({ workspaceId })
      .sort({ role: 1, createdAt: 1 })
      .populate({ path: 'userId', model: UserModel, select: 'name email avatar' })
      .exec() as Promise<WorkspaceMemberDocument[]>;
  }

  public async countOwners(workspaceId: Types.ObjectId): Promise<number> {
    return WorkspaceMemberModel.countDocuments({
      workspaceId,
      role: 'owner',
      status: 'active',
    }).exec();
  }

  public async updateMemberRole(
    memberId: Types.ObjectId,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberDocument | null> {
    return WorkspaceMemberModel.findByIdAndUpdate(
      memberId,
      { role },
      { new: true },
    ).exec() as Promise<WorkspaceMemberDocument | null>;
  }

  public async deleteMember(memberId: Types.ObjectId): Promise<WorkspaceMemberDocument | null> {
    return WorkspaceMemberModel.findByIdAndDelete(
      memberId,
    ).exec() as Promise<WorkspaceMemberDocument | null>;
  }

  public async listWorkspacesByIds(ids: Types.ObjectId[]): Promise<WorkspaceDocument[]> {
    return WorkspaceModel.find({ _id: { $in: ids }, archived: false })
      .sort({ updatedAt: -1 })
      .exec() as Promise<WorkspaceDocument[]>;
  }

  public async createInvitation(input: {
    workspaceId: Types.ObjectId;
    email: string;
    token: string;
    role: WorkspaceRole;
    invitedBy: Types.ObjectId;
    expiresAt: Date;
  }) {
    return WorkspaceInvitationModel.create(input);
  }

  public async findInvitationByToken(token: string) {
    return WorkspaceInvitationModel.findOne({ token }).exec();
  }

  public async listInvitations(workspaceId: Types.ObjectId) {
    return WorkspaceInvitationModel.find({ workspaceId }).sort({ createdAt: -1 }).exec();
  }

  public async updateInvitation(filter: FilterQuery<unknown>, update: Record<string, unknown>) {
    return WorkspaceInvitationModel.findOneAndUpdate(filter, update, { new: true }).exec();
  }
}
