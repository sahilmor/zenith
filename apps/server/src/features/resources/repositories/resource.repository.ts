import type { FilterQuery, Types } from 'mongoose';
import {
  ResourceAllocationModel,
  ResourceAvailabilityModel,
  ResourceProfileModel,
  RunningTimerModel,
  TimeEntryModel,
  type ResourceAllocationDocument,
  type ResourceAvailabilityDocument,
  type ResourceProfileDocument,
  type RunningTimerDocument,
  type TimeEntryDocument,
} from '../models/resource.model.js';

export interface ResourceRange {
  readonly from?: Date;
  readonly to?: Date;
}

export class ResourceRepository {
  public async upsertProfile(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    title?: string | null;
    department?: string | null;
    location?: string | null;
    timezone?: string;
    weeklyCapacityMinutes?: number;
    costRate?: number | null;
    billRate?: number | null;
    skills?: { name: string; level: number }[];
    competencies?: string[];
    workingHours?: Partial<Record<string, number>>;
    active?: boolean;
    updatedBy: Types.ObjectId;
  }): Promise<ResourceProfileDocument> {
    return ResourceProfileModel.findOneAndUpdate(
      { workspaceId: input.workspaceId, userId: input.userId },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<ResourceProfileDocument>;
  }

  public async listProfiles(workspaceId: Types.ObjectId): Promise<ResourceProfileDocument[]> {
    return ResourceProfileModel.find({ workspaceId, active: true })
      .sort({ department: 1, title: 1, createdAt: 1 })
      .exec() as Promise<ResourceProfileDocument[]>;
  }

  public async findProfile(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ResourceProfileDocument | null> {
    return ResourceProfileModel.findOne({
      workspaceId,
      userId,
    }).exec() as Promise<ResourceProfileDocument | null>;
  }

  public async startTimer(input: {
    workspaceId: Types.ObjectId;
    projectId?: Types.ObjectId | null;
    taskId?: Types.ObjectId | null;
    userId: Types.ObjectId;
    description?: string | null;
    billable: boolean;
    startedAt: Date;
    lastHeartbeatAt: Date;
    timezone: string;
  }): Promise<RunningTimerDocument> {
    return RunningTimerModel.findOneAndUpdate(
      { workspaceId: input.workspaceId, userId: input.userId },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<RunningTimerDocument>;
  }

  public async updateTimerHeartbeat(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: { lastHeartbeatAt: Date; idleSince?: Date | null },
  ): Promise<RunningTimerDocument | null> {
    return RunningTimerModel.findOneAndUpdate({ workspaceId, userId }, input, {
      new: true,
    }).exec() as Promise<RunningTimerDocument | null>;
  }

  public async findTimer(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<RunningTimerDocument | null> {
    return RunningTimerModel.findOne({
      workspaceId,
      userId,
    }).exec() as Promise<RunningTimerDocument | null>;
  }

  public async stopTimer(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<RunningTimerDocument | null> {
    return RunningTimerModel.findOneAndDelete({
      workspaceId,
      userId,
    }).exec() as Promise<RunningTimerDocument | null>;
  }

  public async createTimeEntry(input: {
    workspaceId: Types.ObjectId;
    projectId?: Types.ObjectId | null;
    taskId?: Types.ObjectId | null;
    userId: Types.ObjectId;
    description?: string | null;
    minutes: number;
    billable: boolean;
    startedAt: Date;
    endedAt: Date;
    timezone: string;
    status?: TimeEntryDocument['status'];
    createdBy: Types.ObjectId;
  }): Promise<TimeEntryDocument> {
    return TimeEntryModel.create(input) as Promise<TimeEntryDocument>;
  }

  public async listTimeEntries(input: {
    workspaceId: Types.ObjectId;
    userId?: Types.ObjectId;
    projectId?: Types.ObjectId;
    taskId?: Types.ObjectId;
    range?: ResourceRange;
  }): Promise<TimeEntryDocument[]> {
    const query: FilterQuery<TimeEntryDocument> = { workspaceId: input.workspaceId };
    if (input.userId) query.userId = input.userId;
    if (input.projectId) query.projectId = input.projectId;
    if (input.taskId) query.taskId = input.taskId;
    if (input.range?.from || input.range?.to) {
      query.startedAt = {
        ...(input.range.from ? { $gte: input.range.from } : {}),
        ...(input.range.to ? { $lte: input.range.to } : {}),
      };
    }
    return TimeEntryModel.find(query).sort({ startedAt: -1 }).limit(500).exec() as Promise<
      TimeEntryDocument[]
    >;
  }

  public async createAllocation(input: {
    workspaceId: Types.ObjectId;
    projectId: Types.ObjectId;
    userId: Types.ObjectId;
    role?: string | null;
    allocationPercent: number;
    startDate: Date;
    endDate: Date;
    status: ResourceAllocationDocument['status'];
    notes?: string | null;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }): Promise<ResourceAllocationDocument> {
    return ResourceAllocationModel.create(input) as Promise<ResourceAllocationDocument>;
  }

  public async listAllocations(input: {
    workspaceId: Types.ObjectId;
    userId?: Types.ObjectId;
    projectId?: Types.ObjectId;
    range?: ResourceRange;
  }): Promise<ResourceAllocationDocument[]> {
    const query: FilterQuery<ResourceAllocationDocument> = { workspaceId: input.workspaceId };
    if (input.userId) query.userId = input.userId;
    if (input.projectId) query.projectId = input.projectId;
    if (input.range?.from || input.range?.to) {
      query.startDate = { ...(input.range.to ? { $lte: input.range.to } : {}) };
      query.endDate = { ...(input.range.from ? { $gte: input.range.from } : {}) };
    }
    return ResourceAllocationModel.find(query).sort({ startDate: 1 }).exec() as Promise<
      ResourceAllocationDocument[]
    >;
  }

  public async createAvailability(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    type: ResourceAvailabilityDocument['type'];
    title: string;
    startDate: Date;
    endDate: Date;
    minutesUnavailable?: number | null;
    notes?: string | null;
    createdBy: Types.ObjectId;
  }): Promise<ResourceAvailabilityDocument> {
    return ResourceAvailabilityModel.create(input) as Promise<ResourceAvailabilityDocument>;
  }

  public async listAvailability(input: {
    workspaceId: Types.ObjectId;
    userId?: Types.ObjectId;
    range?: ResourceRange;
  }): Promise<ResourceAvailabilityDocument[]> {
    const query: FilterQuery<ResourceAvailabilityDocument> = { workspaceId: input.workspaceId };
    if (input.userId) query.userId = input.userId;
    if (input.range?.from || input.range?.to) {
      query.startDate = { ...(input.range.to ? { $lte: input.range.to } : {}) };
      query.endDate = { ...(input.range.from ? { $gte: input.range.from } : {}) };
    }
    return ResourceAvailabilityModel.find(query).sort({ startDate: 1 }).exec() as Promise<
      ResourceAvailabilityDocument[]
    >;
  }
}
