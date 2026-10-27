import type { AutomationAction, AutomationCondition, AutomationTriggerType } from '@pm/types';
import type { Types } from 'mongoose';
import {
  AutomationExecutionModel,
  type AutomationExecutionDocument,
} from '../models/automation-execution.model.js';
import {
  AutomationRuleModel,
  type AutomationRuleDocument,
} from '../models/automation-rule.model.js';

export class AutomationRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    projectId?: Types.ObjectId | null;
    name: string;
    description?: string | null;
    enabled: boolean;
    trigger: AutomationTriggerType;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    createdBy: Types.ObjectId;
  }): Promise<AutomationRuleDocument> {
    return AutomationRuleModel.create(input) as Promise<AutomationRuleDocument>;
  }

  public async list(workspaceId: Types.ObjectId): Promise<AutomationRuleDocument[]> {
    return AutomationRuleModel.find({ workspaceId })
      .sort({ enabled: -1, updatedAt: -1 })
      .exec() as Promise<AutomationRuleDocument[]>;
  }

  public async listEnabledByTrigger(
    workspaceId: Types.ObjectId,
    trigger: AutomationTriggerType,
  ): Promise<AutomationRuleDocument[]> {
    return AutomationRuleModel.find({ workspaceId, trigger, enabled: true }).exec() as Promise<
      AutomationRuleDocument[]
    >;
  }

  public async findById(ruleId: Types.ObjectId): Promise<AutomationRuleDocument | null> {
    return AutomationRuleModel.findById(ruleId).exec() as Promise<AutomationRuleDocument | null>;
  }

  public async update(
    ruleId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<AutomationRuleDocument | null> {
    return AutomationRuleModel.findByIdAndUpdate(ruleId, update, {
      new: true,
    }).exec() as Promise<AutomationRuleDocument | null>;
  }

  public async delete(ruleId: Types.ObjectId): Promise<AutomationRuleDocument | null> {
    return AutomationRuleModel.findByIdAndDelete(
      ruleId,
    ).exec() as Promise<AutomationRuleDocument | null>;
  }

  public async recordExecution(input: {
    ruleId: Types.ObjectId;
    workspaceId: Types.ObjectId;
    actorId: Types.ObjectId;
    status: 'success' | 'skipped' | 'failed';
    message: string;
  }): Promise<AutomationExecutionDocument> {
    return AutomationExecutionModel.create(input) as Promise<AutomationExecutionDocument>;
  }
}
