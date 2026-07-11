import type {
  AutomationAction,
  AutomationCondition,
  AutomationTriggerType,
  PromptScope,
} from '@pm/types';
import type { Types } from 'mongoose';
import {
  AiConversationModel,
  type AiConversationDocument,
} from '../models/ai-conversation.model.js';
import {
  AutomationExecutionModel,
  type AutomationExecutionDocument,
} from '../models/automation-execution.model.js';
import {
  AutomationRuleModel,
  type AutomationRuleDocument,
} from '../models/automation-rule.model.js';
import { PromptModel, type PromptDocument } from '../models/prompt.model.js';

export class AiConversationRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    title: string;
    provider: string;
  }): Promise<AiConversationDocument> {
    return AiConversationModel.create(input) as Promise<AiConversationDocument>;
  }

  public async findById(conversationId: Types.ObjectId): Promise<AiConversationDocument | null> {
    return AiConversationModel.findById(
      conversationId,
    ).exec() as Promise<AiConversationDocument | null>;
  }

  public async list(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<AiConversationDocument[]> {
    return AiConversationModel.find({ workspaceId, userId })
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(40)
      .exec() as Promise<AiConversationDocument[]>;
  }

  public async update(
    conversationId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<AiConversationDocument | null> {
    return AiConversationModel.findByIdAndUpdate(conversationId, update, {
      new: true,
    }).exec() as Promise<AiConversationDocument | null>;
  }
}

export class PromptRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    projectId?: Types.ObjectId | null;
    scope: PromptScope;
    name: string;
    content: string;
    variables: string[];
    createdBy: Types.ObjectId;
  }): Promise<PromptDocument> {
    return PromptModel.create(input) as Promise<PromptDocument>;
  }

  public async list(
    workspaceId: Types.ObjectId,
    projectId?: Types.ObjectId,
  ): Promise<PromptDocument[]> {
    return PromptModel.find({
      workspaceId,
      $or: [{ projectId: null }, ...(projectId ? [{ projectId }] : [])],
    })
      .sort({ scope: 1, name: 1, version: -1 })
      .exec() as Promise<PromptDocument[]>;
  }

  public async findById(promptId: Types.ObjectId): Promise<PromptDocument | null> {
    return PromptModel.findById(promptId).exec() as Promise<PromptDocument | null>;
  }

  public async update(
    promptId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<PromptDocument | null> {
    return PromptModel.findByIdAndUpdate(promptId, update, {
      new: true,
    }).exec() as Promise<PromptDocument | null>;
  }

  public async delete(promptId: Types.ObjectId): Promise<PromptDocument | null> {
    return PromptModel.findByIdAndDelete(promptId).exec() as Promise<PromptDocument | null>;
  }
}

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
