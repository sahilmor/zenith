import type { BillingUsage } from '@pm/types';
import type { Types } from 'mongoose';
import { AutomationRuleModel } from '../../automations/models/automation-rule.model.js';
import { BoardModel } from '../../boards/models/board.model.js';
import { DocumentPageModel } from '../../documents/models/document-page.model.js';
import { DocumentSpaceModel } from '../../documents/models/document-space.model.js';
import { ApiKeyModel } from '../../ops/models/api-key.model.js';
import { WebhookEndpointModel } from '../../ops/models/webhook-endpoint.model.js';
import { ProjectModel } from '../../projects/models/project.model.js';
import { AttachmentModel } from '../../tasks/models/attachment.model.js';
import { TaskModel } from '../../tasks/models/task.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { UsageCounterModel, UsageSnapshotModel } from '../models/billing-foundation.model.js';

export class UsageService {
  public async increment(
    workspaceId: Types.ObjectId,
    metric: string,
    amount = 1,
    period = 'monthly',
  ): Promise<number> {
    const counter = await UsageCounterModel.findOneAndUpdate(
      { workspaceId, metric, period },
      { $inc: { value: amount } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
    return counter.value;
  }

  public async decrement(
    workspaceId: Types.ObjectId,
    metric: string,
    amount = 1,
    period = 'monthly',
  ): Promise<number> {
    const current = await UsageCounterModel.findOne({ workspaceId, metric, period }).exec();
    const value = Math.max(0, (current?.value ?? 0) - amount);
    await UsageCounterModel.updateOne(
      { workspaceId, metric, period },
      { $set: { value } },
      { upsert: true },
    ).exec();
    return value;
  }

  public async resetMonthlyCounters(workspaceId: Types.ObjectId, at = new Date()): Promise<void> {
    await this.createSnapshot(workspaceId, at);
    await UsageCounterModel.updateMany(
      { workspaceId, period: 'monthly' },
      { $set: { value: 0, lastResetAt: at } },
    ).exec();
  }

  public async createSnapshot(workspaceId: Types.ObjectId, at = new Date()) {
    const metrics = await this.getWorkspaceUsage(workspaceId);
    return UsageSnapshotModel.create({
      workspaceId,
      capturedAt: at,
      period: at.toISOString().slice(0, 7),
      metrics: new Map(Object.entries(metrics)),
    });
  }

  public listSnapshots(workspaceId: Types.ObjectId, limit = 24) {
    return UsageSnapshotModel.find({ workspaceId })
      .sort({ capturedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  public async getWorkspaceUsage(workspaceId: Types.ObjectId): Promise<BillingUsage> {
    const [
      members,
      projects,
      boards,
      tasks,
      storage,
      automations,
      apiKeys,
      webhooks,
      documentSpaces,
      documentPages,
    ] = await Promise.all([
      WorkspaceMemberModel.countDocuments({ workspaceId, status: 'active' }),
      ProjectModel.countDocuments({ workspaceId, status: 'active' }),
      BoardModel.countDocuments({ workspaceId, archived: false }),
      TaskModel.countDocuments({ workspaceId, archived: false }),
      AttachmentModel.aggregate<{ total: number }>([
        {
          $lookup: {
            from: 'tasks',
            localField: 'taskId',
            foreignField: '_id',
            as: 'task',
          },
        },
        { $unwind: '$task' },
        { $match: { 'task.workspaceId': workspaceId } },
        { $group: { _id: null, total: { $sum: '$fileSize' } } },
      ]),
      AutomationRuleModel.countDocuments({ workspaceId }),
      ApiKeyModel.countDocuments({ workspaceId, revokedAt: null }),
      WebhookEndpointModel.countDocuments({ workspaceId }),
      DocumentSpaceModel.countDocuments({ workspaceId, archived: false }),
      DocumentPageModel.countDocuments({ workspaceId, status: { $ne: 'deleted' } }),
    ]);

    const counters = await UsageCounterModel.find({ workspaceId }).lean().exec();
    const tracked = Object.fromEntries(counters.map((counter) => [counter.metric, counter.value]));
    return {
      members,
      projects,
      boards,
      tasks,
      storageBytes: storage[0]?.total ?? 0,
      automations,
      apiKeys,
      webhooks,
      reportExports: tracked.reportExports ?? 0,
      documentSpaces,
      documentPages,
    };
  }
}

export const usageService = new UsageService();
