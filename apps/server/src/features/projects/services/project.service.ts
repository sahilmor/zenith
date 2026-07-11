import type { ProjectStatus, ProjectSummary, ProjectVisibility, WorkspaceRole } from '@pm/types';
import type { Types } from 'mongoose';
import { ActivityService } from '../../activity/services/activity.service.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import type { ProjectDocument } from '../models/project.model.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import type { CreateProjectInput, UpdateProjectInput } from '../validation/project.validation.js';

const projectWriteRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);

export class ProjectService {
  public constructor(
    private readonly projects = new ProjectRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly activity = new ActivityService(),
  ) {}

  public async createProject(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateProjectInput,
  ): Promise<ProjectSummary> {
    await this.requireWorkspaceRole(workspaceId, userId, projectWriteRoles);
    await entitlementService.requireWithinLimit(workspaceId, 'projects');
    const existing = await this.projects.findByWorkspaceAndKey(workspaceId, input.key);
    if (existing) throw new ConflictError('Project key already exists in this workspace');
    const project = await this.projects.create({
      workspaceId,
      name: input.name,
      key: input.key,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      coverImage: input.coverImage ?? null,
      visibility: input.visibility,
      ownerId: userId,
      createdBy: userId,
    });
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event: 'project.created',
      metadata: { projectId: project.id, key: project.key, name: project.name },
    });
    const summary = this.toProjectSummary(project);
    realtimeService.emitMutation({
      resource: 'project',
      action: 'created',
      workspaceId: summary.workspaceId,
      projectId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    const members = await WorkspaceMemberModel.find({
      workspaceId,
      status: 'active',
      userId: { $ne: userId },
    }).exec();
    await Promise.all(
      members.map((member) =>
        notificationService.create({
          userId: member.userId,
          workspaceId,
          projectId: project._id,
          actorId: userId,
          type: 'project_created',
          projectName: project.name,
        }),
      ),
    );
    return summary;
  }

  public async listProjects(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    const projects = await this.projects.listByWorkspace(workspaceId);
    return projects.map((project) => this.toProjectSummary(project));
  }

  public async getProject(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectSummary> {
    const project = await this.requireProjectAccess(projectId, userId);
    return this.toProjectSummary(project);
  }

  public async updateProject(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateProjectInput,
  ): Promise<ProjectSummary> {
    const project = await this.requireProjectWriteAccess(projectId, userId);
    this.ensureActive(project);
    const updated = await this.projects.update(projectId, input);
    if (!updated) throw new NotFoundError('Project not found');
    await this.activity.record({
      workspaceId: project.workspaceId,
      actorId: userId,
      event: 'project.updated',
      metadata: { projectId: project.id, fields: Object.keys(input) },
    });
    const summary = this.toProjectSummary(updated);
    realtimeService.emitMutation({
      resource: 'project',
      action: 'updated',
      workspaceId: summary.workspaceId,
      projectId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async archiveProject(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectSummary> {
    const project = await this.requireProjectWriteAccess(projectId, userId);
    this.ensureActive(project);
    const updated = await this.projects.update(projectId, {
      status: 'archived',
      archivedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('Project not found');
    await this.activity.record({
      workspaceId: project.workspaceId,
      actorId: userId,
      event: 'project.archived',
      metadata: { projectId: project.id, key: project.key },
    });
    const summary = this.toProjectSummary(updated);
    realtimeService.emitMutation({
      resource: 'project',
      action: 'archived',
      workspaceId: summary.workspaceId,
      projectId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async restoreProject(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectSummary> {
    const project = await this.requireProjectWriteAccess(projectId, userId);
    if (project.status !== 'archived') return this.toProjectSummary(project);
    const updated = await this.projects.update(projectId, {
      status: 'active',
      archivedAt: null,
    });
    if (!updated) throw new NotFoundError('Project not found');
    await this.activity.record({
      workspaceId: project.workspaceId,
      actorId: userId,
      event: 'project.restored',
      metadata: { projectId: project.id, key: project.key },
    });
    const summary = this.toProjectSummary(updated);
    realtimeService.emitMutation({
      resource: 'project',
      action: 'restored',
      workspaceId: summary.workspaceId,
      projectId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async deleteProject(projectId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const project = await this.requireProjectWriteAccess(projectId, userId);
    await this.projects.delete(projectId);
    await this.activity.record({
      workspaceId: project.workspaceId,
      actorId: userId,
      event: 'project.deleted',
      metadata: { projectId: project.id, key: project.key, name: project.name },
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId: project.workspaceId,
      targetType: 'project',
      targetId: project.id,
      action: 'project.deleted',
      metadata: { key: project.key, name: project.name },
    });
    realtimeService.emitMutation({
      resource: 'project',
      action: 'deleted',
      workspaceId: project.workspaceId.toString(),
      projectId: project.id,
      actorId: userId.toString(),
      data: { projectId: project.id },
    });
  }

  private async requireProjectAccess(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectDocument> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    await this.requireWorkspaceMembership(project.workspaceId, userId);
    return project;
  }

  private async requireProjectWriteAccess(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectDocument> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    await this.requireWorkspaceRole(project.workspaceId, userId, projectWriteRoles);
    return project;
  }

  private async requireWorkspaceMembership(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceRole> {
    const [workspace, membership] = await Promise.all([
      this.workspaces.findWorkspaceById(workspaceId),
      this.workspaces.findMembership(workspaceId, userId),
    ]);
    if (!workspace || workspace.archived) throw new NotFoundError('Workspace not found');
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access denied');
    return membership.role as WorkspaceRole;
  }

  private async requireWorkspaceRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    roles: ReadonlySet<WorkspaceRole>,
  ): Promise<void> {
    const role = await this.requireWorkspaceMembership(workspaceId, userId);
    if (!roles.has(role)) throw new ForbiddenError('Project manager access required');
  }

  private ensureActive(project: ProjectDocument): void {
    if (project.status === 'archived')
      throw new ForbiddenError('Archived projects cannot be modified');
  }

  private toProjectSummary(project: ProjectDocument): ProjectSummary {
    return {
      id: project.id,
      workspaceId: project.workspaceId.toString(),
      name: project.name,
      key: project.key,
      description: project.description ?? null,
      icon: project.icon ?? null,
      color: project.color ?? null,
      coverImage: project.coverImage ?? null,
      visibility: project.visibility as ProjectVisibility,
      status: project.status as ProjectStatus,
      ownerId: project.ownerId.toString(),
      createdBy: project.createdBy.toString(),
      archivedAt: project.archivedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}
