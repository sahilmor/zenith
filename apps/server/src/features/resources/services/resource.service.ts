import type {
  CapacityHeatmapDay,
  ResourceAllocationSummary,
  ResourceAvailabilitySummary,
  ResourceForecastSummary,
  ResourceProfileSummary,
  ResourceWorkspaceSummary,
  TimeEntrySummary,
  TimerSummary,
  TimesheetSummary,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { ActivityService } from '../../activity/services/activity.service.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { TaskRepository } from '../../tasks/repositories/task.repository.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { ResourceRepository } from '../repositories/resource.repository.js';
import type {
  CreateAllocationInput,
  CreateAvailabilityInput,
  CreateTimeEntryInput,
  HeartbeatTimerInput,
  StartTimerInput,
  StopTimerInput,
  UpsertResourceProfileInput,
} from '../validation/resource.validation.js';
import type {
  ResourceAllocationDocument,
  ResourceAvailabilityDocument,
  ResourceProfileDocument,
  RunningTimerDocument,
  TimeEntryDocument,
} from '../models/resource.model.js';

const managerRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);
const DAY_MS = 24 * 60 * 60 * 1000;

const round = (value: number): number => Math.round(value * 100) / 100;

const clampDate = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const minutesBetween = (startedAt: Date, endedAt: Date): number =>
  Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000));

export class ResourceService {
  public constructor(
    private readonly resources = new ResourceRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly tasks = new TaskRepository(),
    private readonly activity = new ActivityService(),
  ) {}

  public async upsertProfile(
    workspaceId: Types.ObjectId,
    targetUserId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: UpsertResourceProfileInput,
  ): Promise<ResourceProfileSummary> {
    await this.requireManager(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'resource_planning');
    await this.requireWorkspaceMembership(workspaceId, targetUserId);
    const profileInput = {
      workspaceId,
      userId: targetUserId,
      updatedBy: actorId,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.department !== undefined ? { department: input.department } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.weeklyCapacityMinutes !== undefined
        ? { weeklyCapacityMinutes: input.weeklyCapacityMinutes }
        : {}),
      ...(input.costRate !== undefined ? { costRate: input.costRate } : {}),
      ...(input.billRate !== undefined ? { billRate: input.billRate } : {}),
      ...(input.skills !== undefined ? { skills: input.skills } : {}),
      ...(input.competencies !== undefined ? { competencies: input.competencies } : {}),
      ...(input.workingHours !== undefined ? { workingHours: input.workingHours } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    };
    const profile = await this.resources.upsertProfile(profileInput);
    await this.activity.record({
      workspaceId,
      actorId,
      event: 'resource.profile.updated',
      metadata: { userId: targetUserId.toString(), department: profile.department },
    });
    await auditLogService.record({
      actorId,
      workspaceId,
      targetType: 'resource_profile',
      targetId: profile.id,
      action: 'resource.profile.updated',
      metadata: { userId: targetUserId.toString() },
    });
    const summary = this.toProfileSummary(profile);
    realtimeService.emitMutation({
      resource: 'resource_profile',
      action: 'updated',
      workspaceId: workspaceId.toString(),
      actorId: actorId.toString(),
      data: summary,
    });
    return summary;
  }

  public async listProfiles(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<ResourceProfileSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    const profiles = await this.resources.listProfiles(workspaceId);
    return profiles.map((profile) => this.toProfileSummary(profile));
  }

  public async startTimer(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: StartTimerInput,
  ): Promise<TimerSummary> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    await this.ensureResourceTargets(workspaceId, input.projectId, input.taskId);
    const now = new Date();
    const timer = await this.resources.startTimer({
      workspaceId,
      userId: actorId,
      projectId: input.projectId ? this.toObjectId(input.projectId) : null,
      taskId: input.taskId ? this.toObjectId(input.taskId) : null,
      description: input.description ?? null,
      billable: input.billable,
      startedAt: input.startedAt ? new Date(input.startedAt) : now,
      lastHeartbeatAt: now,
      timezone: input.timezone,
    });
    await this.activity.record({
      workspaceId,
      actorId,
      event: 'time.timer.started',
      metadata: { taskId: input.taskId ?? null, projectId: input.projectId ?? null },
    });
    const summary = this.toTimerSummary(timer);
    realtimeService.emitMutation({
      resource: 'timer',
      action: 'created',
      workspaceId: workspaceId.toString(),
      actorId: actorId.toString(),
      data: summary,
    });
    return summary;
  }

  public async heartbeatTimer(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: HeartbeatTimerInput,
  ): Promise<TimerSummary> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    const now = new Date();
    const timer = await this.resources.updateTimerHeartbeat(workspaceId, actorId, {
      lastHeartbeatAt: now,
      idleSince: input.idle ? now : null,
    });
    if (!timer) throw new NotFoundError('Running timer not found');
    return this.toTimerSummary(timer);
  }

  public async getTimer(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<TimerSummary | null> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    const timer = await this.resources.findTimer(workspaceId, actorId);
    return timer ? this.toTimerSummary(timer) : null;
  }

  public async stopTimer(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: StopTimerInput,
  ): Promise<TimeEntrySummary> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    const timer = await this.resources.stopTimer(workspaceId, actorId);
    if (!timer) throw new NotFoundError('Running timer not found');
    const endedAt = input.endedAt ? new Date(input.endedAt) : new Date();
    if (endedAt <= timer.startedAt) throw new BadRequestError('endedAt must be after startedAt');
    const entry = await this.resources.createTimeEntry({
      workspaceId,
      projectId: timer.projectId ?? null,
      taskId: timer.taskId ?? null,
      userId: actorId,
      description: input.description ?? timer.description ?? null,
      minutes: minutesBetween(timer.startedAt, endedAt),
      billable: timer.billable,
      startedAt: timer.startedAt,
      endedAt,
      timezone: timer.timezone,
      createdBy: actorId,
    });
    await this.activity.record({
      workspaceId,
      actorId,
      event: 'time.entry.created',
      metadata: { minutes: entry.minutes, source: 'timer' },
    });
    const summary = this.toTimeEntrySummary(entry);
    realtimeService.emitMutation({
      resource: 'time_entry',
      action: 'created',
      workspaceId: workspaceId.toString(),
      actorId: actorId.toString(),
      data: summary,
    });
    return summary;
  }

  public async createTimeEntry(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateTimeEntryInput,
  ): Promise<TimeEntrySummary> {
    const role = await this.requireWorkspaceMembership(workspaceId, actorId);
    const targetUserId = input.userId ? this.toObjectId(input.userId) : actorId;
    if (!targetUserId.equals(actorId) && !managerRoles.has(role)) {
      throw new ForbiddenError('Resource manager access required');
    }
    await this.requireWorkspaceMembership(workspaceId, targetUserId);
    await this.ensureResourceTargets(workspaceId, input.projectId, input.taskId);
    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);
    if (endedAt <= startedAt) throw new BadRequestError('endedAt must be after startedAt');
    const entry = await this.resources.createTimeEntry({
      workspaceId,
      projectId: input.projectId ? this.toObjectId(input.projectId) : null,
      taskId: input.taskId ? this.toObjectId(input.taskId) : null,
      userId: targetUserId,
      description: input.description ?? null,
      minutes: input.minutes ?? minutesBetween(startedAt, endedAt),
      billable: input.billable,
      startedAt,
      endedAt,
      timezone: input.timezone,
      createdBy: actorId,
    });
    await this.activity.record({
      workspaceId,
      actorId,
      event: 'time.entry.created',
      metadata: { minutes: entry.minutes, userId: targetUserId.toString() },
    });
    const summary = this.toTimeEntrySummary(entry);
    realtimeService.emitMutation({
      resource: 'time_entry',
      action: 'created',
      workspaceId: workspaceId.toString(),
      actorId: actorId.toString(),
      data: summary,
    });
    return summary;
  }

  public async listTimeEntries(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    filters: {
      userId?: Types.ObjectId;
      projectId?: Types.ObjectId;
      taskId?: Types.ObjectId;
      from?: Date;
      to?: Date;
    },
  ): Promise<TimeEntrySummary[]> {
    const role = await this.requireWorkspaceMembership(workspaceId, actorId);
    const targetUserId = filters.userId ?? actorId;
    if (!targetUserId.equals(actorId) && !managerRoles.has(role)) {
      throw new ForbiddenError('Resource manager access required');
    }
    const entries = await this.resources.listTimeEntries({
      workspaceId,
      userId: targetUserId,
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.taskId ? { taskId: filters.taskId } : {}),
      range: this.toRange(filters),
    });
    return entries.map((entry) => this.toTimeEntrySummary(entry));
  }

  public async getTimesheet(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: { userId?: Types.ObjectId; from?: Date; to?: Date },
  ): Promise<TimesheetSummary> {
    const role = await this.requireWorkspaceMembership(workspaceId, actorId);
    const targetUserId = input.userId ?? actorId;
    if (!targetUserId.equals(actorId) && !managerRoles.has(role)) {
      throw new ForbiddenError('Resource manager access required');
    }
    const entries = await this.resources.listTimeEntries({
      workspaceId,
      userId: targetUserId,
      range: this.toRange(input),
    });
    const days = new Map<string, { totalMinutes: number; billableMinutes: number }>();
    entries.forEach((entry) => {
      const key = clampDate(entry.startedAt).toISOString().slice(0, 10);
      const current = days.get(key) ?? { totalMinutes: 0, billableMinutes: 0 };
      current.totalMinutes += entry.minutes;
      if (entry.billable) current.billableMinutes += entry.minutes;
      days.set(key, current);
    });
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
    const billableMinutes = entries.reduce(
      (sum, entry) => sum + (entry.billable ? entry.minutes : 0),
      0,
    );
    return {
      workspaceId: workspaceId.toString(),
      userId: targetUserId.toString(),
      from: input.from?.toISOString() ?? null,
      to: input.to?.toISOString() ?? null,
      totalMinutes,
      billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      entries: entries.map((entry) => this.toTimeEntrySummary(entry)),
      days: Array.from(days.entries()).map(([date, totals]) => ({ date, ...totals })),
    };
  }

  public async createAllocation(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateAllocationInput,
  ): Promise<ResourceAllocationSummary> {
    await this.requireManager(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'resource_planning');
    await this.requireWorkspaceMembership(workspaceId, this.toObjectId(input.userId));
    const project = await this.projects.findById(this.toObjectId(input.projectId));
    if (!project || !project.workspaceId.equals(workspaceId))
      throw new NotFoundError('Project not found');
    const allocation = await this.resources.createAllocation({
      workspaceId,
      projectId: project._id,
      userId: this.toObjectId(input.userId),
      role: input.role ?? null,
      allocationPercent: input.allocationPercent,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorId,
      updatedBy: actorId,
    });
    await this.activity.record({
      workspaceId,
      actorId,
      event: 'resource.allocation.created',
      metadata: {
        userId: input.userId,
        projectId: project.id,
        allocationPercent: input.allocationPercent,
      },
    });
    const summary = this.toAllocationSummary(allocation);
    realtimeService.emitMutation({
      resource: 'resource_allocation',
      action: 'created',
      workspaceId: workspaceId.toString(),
      projectId: project.id,
      actorId: actorId.toString(),
      data: summary,
    });
    return summary;
  }

  public async createAvailability(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    input: CreateAvailabilityInput,
  ): Promise<ResourceAvailabilitySummary> {
    await this.requireManager(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'resource_planning');
    await this.requireWorkspaceMembership(workspaceId, this.toObjectId(input.userId));
    const availability = await this.resources.createAvailability({
      workspaceId,
      userId: this.toObjectId(input.userId),
      type: input.type,
      title: input.title,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      minutesUnavailable: input.minutesUnavailable ?? null,
      notes: input.notes ?? null,
      createdBy: actorId,
    });
    await this.activity.record({
      workspaceId,
      actorId,
      event: 'resource.availability.created',
      metadata: { userId: input.userId, type: input.type },
    });
    return this.toAvailabilitySummary(availability);
  }

  public async getWorkspaceSummary(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    range: { from?: Date; to?: Date },
  ): Promise<ResourceWorkspaceSummary> {
    await this.requireWorkspaceMembership(workspaceId, actorId);
    await entitlementService.requireFeature(workspaceId, 'resource_planning');
    const [profiles, allocations, availability, entries] = await Promise.all([
      this.resources.listProfiles(workspaceId),
      this.resources.listAllocations({ workspaceId, range }),
      this.resources.listAvailability({ workspaceId, range }),
      this.resources.listTimeEntries({ workspaceId, range }),
    ]);
    const byUser = new Map<string, ResourceProfileSummary>();
    profiles.forEach((profile) =>
      byUser.set(profile.userId.toString(), this.toProfileSummary(profile)),
    );

    const workload = profiles.map((profile) => {
      const userId = profile.userId.toString();
      const userAllocations = allocations.filter(
        (allocation) => allocation.userId.toString() === userId,
      );
      const allocatedPercent = userAllocations.reduce(
        (sum, allocation) => sum + allocation.allocationPercent,
        0,
      );
      const unavailableMinutes = availability
        .filter((item) => item.userId.toString() === userId)
        .reduce(
          (sum, item) =>
            sum +
            (item.minutesUnavailable ?? this.daysInclusive(item.startDate, item.endDate) * 480),
          0,
        );
      const loggedMinutes = entries
        .filter((entry) => entry.userId.toString() === userId)
        .reduce((sum, entry) => sum + entry.minutes, 0);
      const capacityMinutes = Math.max(0, profile.weeklyCapacityMinutes - unavailableMinutes);
      return {
        userId,
        profile: byUser.get(userId) ?? this.toProfileSummary(profile),
        capacityMinutes,
        allocatedMinutes: Math.round((profile.weeklyCapacityMinutes * allocatedPercent) / 100),
        loggedMinutes,
        unavailableMinutes,
        utilizationPercent:
          capacityMinutes > 0 ? round((loggedMinutes / capacityMinutes) * 100) : 0,
        allocationPercent: allocatedPercent,
        status:
          allocatedPercent > 100
            ? ('over_allocated' as const)
            : allocatedPercent < 50
              ? ('under_utilized' as const)
              : ('balanced' as const),
      };
    });
    const totalCapacityMinutes = workload.reduce((sum, item) => sum + item.capacityMinutes, 0);
    const totalAllocatedMinutes = workload.reduce((sum, item) => sum + item.allocatedMinutes, 0);
    const totalLoggedMinutes = workload.reduce((sum, item) => sum + item.loggedMinutes, 0);
    const heatmap = this.buildHeatmap(profiles, allocations, availability, range);
    return {
      workspaceId: workspaceId.toString(),
      generatedAt: new Date().toISOString(),
      totalCapacityMinutes,
      totalAllocatedMinutes,
      totalLoggedMinutes,
      utilizationPercent:
        totalCapacityMinutes > 0 ? round((totalLoggedMinutes / totalCapacityMinutes) * 100) : 0,
      overAllocatedCount: workload.filter((item) => item.status === 'over_allocated').length,
      underUtilizedCount: workload.filter((item) => item.status === 'under_utilized').length,
      workload,
      heatmap,
    };
  }

  public async forecast(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    range: { from?: Date; to?: Date },
  ): Promise<ResourceForecastSummary> {
    await entitlementService.requireFeature(workspaceId, 'resource_planning');
    const summary = await this.getWorkspaceSummary(workspaceId, actorId, range);
    const remainingCapacityMinutes = Math.max(
      0,
      summary.totalCapacityMinutes - summary.totalAllocatedMinutes,
    );
    const overAllocationRisk = summary.workload.some((item) => item.allocationPercent > 110);
    const recommendedAssignees = [...summary.workload]
      .sort(
        (a, b) =>
          a.allocationPercent - b.allocationPercent || b.capacityMinutes - a.capacityMinutes,
      )
      .slice(0, 5)
      .map((item) => ({
        userId: item.userId,
        allocationPercent: item.allocationPercent,
        availableMinutes: Math.max(0, item.capacityMinutes - item.allocatedMinutes),
        reason:
          item.allocationPercent < 50
            ? 'Available capacity and low allocation'
            : 'Best remaining capacity in this workspace',
      }));
    return {
      workspaceId: workspaceId.toString(),
      generatedAt: new Date().toISOString(),
      deliveryRisk: overAllocationRisk ? 'high' : remainingCapacityMinutes > 0 ? 'medium' : 'low',
      remainingCapacityMinutes,
      projectedUtilizationPercent:
        summary.totalCapacityMinutes > 0
          ? round((summary.totalAllocatedMinutes / summary.totalCapacityMinutes) * 100)
          : 0,
      recommendedAssignees,
      insights: [
        `${summary.overAllocatedCount} people are over-allocated.`,
        `${summary.underUtilizedCount} people have available capacity.`,
        `${Math.round(remainingCapacityMinutes / 60)} hours remain available in this planning range.`,
      ],
    };
  }

  private async ensureResourceTargets(
    workspaceId: Types.ObjectId,
    projectId?: string | null,
    taskId?: string | null,
  ): Promise<void> {
    if (projectId) {
      const project = await this.projects.findById(this.toObjectId(projectId));
      if (!project || !project.workspaceId.equals(workspaceId))
        throw new NotFoundError('Project not found');
    }
    if (taskId) {
      const task = await this.tasks.findById(this.toObjectId(taskId));
      if (!task || !task.workspaceId.equals(workspaceId)) throw new NotFoundError('Task not found');
      if (projectId && task.projectId.toString() !== projectId) {
        throw new BadRequestError('Task does not belong to the selected project');
      }
    }
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
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenError('Workspace access denied');
    }
    return membership.role as WorkspaceRole;
  }

  private async requireManager(workspaceId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const role = await this.requireWorkspaceMembership(workspaceId, userId);
    if (!managerRoles.has(role)) throw new ForbiddenError('Resource manager access required');
  }

  private buildHeatmap(
    profiles: ResourceProfileDocument[],
    allocations: ResourceAllocationDocument[],
    availability: ResourceAvailabilityDocument[],
    range: { from?: Date; to?: Date },
  ): CapacityHeatmapDay[] {
    const start = clampDate(range.from ?? new Date());
    const end = clampDate(range.to ?? new Date(start.getTime() + 13 * DAY_MS));
    const days: CapacityHeatmapDay[] = [];
    for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
      const activeAllocations = allocations.filter(
        (allocation) => allocation.startDate <= cursor && allocation.endDate >= cursor,
      );
      const unavailable = availability.filter(
        (item) => item.startDate <= cursor && item.endDate >= cursor,
      );
      const capacityMinutes = profiles.reduce(
        (sum, profile) => sum + this.capacityForDay(profile, cursor),
        0,
      );
      const unavailableMinutes = unavailable.reduce(
        (sum, item) => sum + (item.minutesUnavailable ?? 480),
        0,
      );
      const allocatedMinutes = activeAllocations.reduce((sum, allocation) => {
        const profile = profiles.find((candidate) => candidate.userId.equals(allocation.userId));
        return (
          sum +
          Math.round(
            ((profile?.weeklyCapacityMinutes ?? 2400) * allocation.allocationPercent) / 500,
          )
        );
      }, 0);
      days.push({
        date: cursor.toISOString().slice(0, 10),
        capacityMinutes: Math.max(0, capacityMinutes - unavailableMinutes),
        allocatedMinutes,
        utilizationPercent:
          capacityMinutes > 0
            ? round((allocatedMinutes / Math.max(1, capacityMinutes - unavailableMinutes)) * 100)
            : 0,
      });
    }
    return days;
  }

  private capacityForDay(profile: ResourceProfileDocument, date: Date): number {
    const keys = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ] as const;
    const key = keys[date.getUTCDay()] ?? 'sunday';
    return Number(profile.workingHours?.[key] ?? 0);
  }

  private toRange(input: { from?: Date; to?: Date }): { from?: Date; to?: Date } {
    return {
      ...(input.from ? { from: input.from } : {}),
      ...(input.to ? { to: input.to } : {}),
    };
  }

  private daysInclusive(start: Date, end: Date): number {
    return Math.max(
      1,
      Math.floor((clampDate(end).getTime() - clampDate(start).getTime()) / DAY_MS) + 1,
    );
  }

  private toObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }

  private toProfileSummary(profile: ResourceProfileDocument): ResourceProfileSummary {
    return {
      id: profile.id,
      workspaceId: profile.workspaceId.toString(),
      userId: profile.userId.toString(),
      title: profile.title ?? null,
      department: profile.department ?? null,
      location: profile.location ?? null,
      timezone: profile.timezone,
      weeklyCapacityMinutes: profile.weeklyCapacityMinutes,
      costRate: profile.costRate ?? null,
      billRate: profile.billRate ?? null,
      skills: profile.skills.map((skill) => ({ name: skill.name, level: skill.level })),
      competencies: profile.competencies,
      workingHours: {
        monday: profile.workingHours?.monday ?? 480,
        tuesday: profile.workingHours?.tuesday ?? 480,
        wednesday: profile.workingHours?.wednesday ?? 480,
        thursday: profile.workingHours?.thursday ?? 480,
        friday: profile.workingHours?.friday ?? 480,
        saturday: profile.workingHours?.saturday ?? 0,
        sunday: profile.workingHours?.sunday ?? 0,
      },
      active: profile.active,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private toTimerSummary(timer: RunningTimerDocument): TimerSummary {
    return {
      id: timer.id,
      workspaceId: timer.workspaceId.toString(),
      projectId: timer.projectId?.toString() ?? null,
      taskId: timer.taskId?.toString() ?? null,
      userId: timer.userId.toString(),
      description: timer.description ?? null,
      billable: timer.billable,
      startedAt: timer.startedAt.toISOString(),
      lastHeartbeatAt: timer.lastHeartbeatAt.toISOString(),
      timezone: timer.timezone,
      idleSince: timer.idleSince?.toISOString() ?? null,
      elapsedMinutes: minutesBetween(timer.startedAt, new Date()),
    };
  }

  private toTimeEntrySummary(entry: TimeEntryDocument): TimeEntrySummary {
    return {
      id: entry.id,
      workspaceId: entry.workspaceId.toString(),
      projectId: entry.projectId?.toString() ?? null,
      taskId: entry.taskId?.toString() ?? null,
      userId: entry.userId.toString(),
      description: entry.description ?? null,
      minutes: entry.minutes,
      billable: entry.billable,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt.toISOString(),
      timezone: entry.timezone,
      status: entry.status,
      approvedBy: entry.approvedBy?.toString() ?? null,
      approvedAt: entry.approvedAt?.toISOString() ?? null,
      createdBy: entry.createdBy.toString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  private toAllocationSummary(allocation: ResourceAllocationDocument): ResourceAllocationSummary {
    return {
      id: allocation.id,
      workspaceId: allocation.workspaceId.toString(),
      projectId: allocation.projectId.toString(),
      userId: allocation.userId.toString(),
      role: allocation.role ?? null,
      allocationPercent: allocation.allocationPercent,
      startDate: allocation.startDate.toISOString(),
      endDate: allocation.endDate.toISOString(),
      status: allocation.status,
      notes: allocation.notes ?? null,
      createdBy: allocation.createdBy.toString(),
      updatedBy: allocation.updatedBy?.toString() ?? null,
      createdAt: allocation.createdAt.toISOString(),
      updatedAt: allocation.updatedAt.toISOString(),
    };
  }

  private toAvailabilitySummary(
    availability: ResourceAvailabilityDocument,
  ): ResourceAvailabilitySummary {
    return {
      id: availability.id,
      workspaceId: availability.workspaceId.toString(),
      userId: availability.userId.toString(),
      type: availability.type,
      title: availability.title,
      startDate: availability.startDate.toISOString(),
      endDate: availability.endDate.toISOString(),
      minutesUnavailable: availability.minutesUnavailable ?? null,
      notes: availability.notes ?? null,
      createdBy: availability.createdBy.toString(),
      createdAt: availability.createdAt.toISOString(),
      updatedAt: availability.updatedAt.toISOString(),
    };
  }
}
