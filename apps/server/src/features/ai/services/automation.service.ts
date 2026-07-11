import type {
  AutomationExecutionSummary,
  AutomationRuleSummary,
  AutomationTriggerType,
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { ActivityService } from '../../activity/services/activity.service.js';
import { BoardModel } from '../../boards/models/board.model.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { CommentModel } from '../../tasks/models/comment.model.js';
import { TaskModel } from '../../tasks/models/task.model.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import type { AutomationExecutionDocument } from '../models/automation-execution.model.js';
import type { AutomationRuleDocument } from '../models/automation-rule.model.js';
import { AiProviderRegistry } from '../providers/provider-registry.js';
import { AutomationRepository } from '../repositories/ai.repository.js';
import type {
  AutomationRuleInput,
  AutomationRuleUpdateInput,
} from '../validation/ai.validation.js';

const automationWriteRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);

export interface AutomationEventPayload {
  readonly workspaceId: Types.ObjectId;
  readonly actorId: Types.ObjectId;
  readonly trigger: AutomationTriggerType;
  readonly taskId?: Types.ObjectId;
  readonly fields: Record<string, string | string[] | boolean | number | null>;
}

export class AutomationService {
  public constructor(
    private readonly automations = new AutomationRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly activity = new ActivityService(),
    private readonly providers = new AiProviderRegistry(),
  ) {}

  public async listRules(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<AutomationRuleSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.automations.list(workspaceId)).map((rule) => this.toRuleSummary(rule));
  }

  public async createRule(
    userId: Types.ObjectId,
    input: AutomationRuleInput,
  ): Promise<AutomationRuleSummary> {
    const workspaceId = new Types.ObjectId(input.workspaceId);
    await this.requireWorkspaceRole(workspaceId, userId, automationWriteRoles);
    await entitlementService.requireFeature(workspaceId, 'automations');
    await entitlementService.requireWithinLimit(workspaceId, 'automations');
    const rule = await this.automations.create({
      workspaceId,
      projectId: input.projectId ? new Types.ObjectId(input.projectId) : null,
      name: input.name,
      description: input.description ?? null,
      enabled: input.enabled,
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
      createdBy: userId,
    });
    return this.toRuleSummary(rule);
  }

  public async updateRule(
    ruleId: Types.ObjectId,
    userId: Types.ObjectId,
    input: AutomationRuleUpdateInput,
  ): Promise<AutomationRuleSummary> {
    const rule = await this.requireRuleWriteAccess(ruleId, userId);
    const update = {
      ...input,
      ...(input.projectId !== undefined
        ? { projectId: input.projectId ? new Types.ObjectId(input.projectId) : null }
        : {}),
    };
    const updated = await this.automations.update(rule._id, update);
    if (!updated) throw new NotFoundError('Automation rule not found');
    return this.toRuleSummary(updated);
  }

  public async deleteRule(ruleId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const rule = await this.requireRuleWriteAccess(ruleId, userId);
    await this.automations.delete(rule._id);
  }

  public async testRule(
    ruleId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<AutomationExecutionSummary> {
    const rule = await this.requireRuleWriteAccess(ruleId, userId);
    const execution = await this.executeRule(rule, {
      workspaceId: rule.workspaceId,
      actorId: userId,
      trigger: rule.trigger as AutomationTriggerType,
      fields: { test: true },
    });
    return this.toExecutionSummary(execution);
  }

  public async runForEvent(payload: AutomationEventPayload): Promise<AutomationExecutionSummary[]> {
    const rules = await this.automations.listEnabledByTrigger(payload.workspaceId, payload.trigger);
    const executions = await Promise.all(rules.map((rule) => this.executeRule(rule, payload)));
    return executions.map((execution) => this.toExecutionSummary(execution));
  }

  private async executeRule(
    rule: AutomationRuleDocument,
    payload: AutomationEventPayload,
  ): Promise<AutomationExecutionDocument> {
    if (!this.matches(rule, payload)) {
      return this.automations.recordExecution({
        ruleId: rule._id,
        workspaceId: rule.workspaceId,
        actorId: payload.actorId,
        status: 'skipped',
        message: 'Conditions did not match',
      });
    }
    try {
      await Promise.all(rule.actions.map((action) => this.executeAction(action, rule, payload)));
      await this.automations.update(rule._id, { lastRunAt: new Date() });
      await this.activity.record({
        workspaceId: rule.workspaceId,
        actorId: payload.actorId,
        event: 'task.updated',
        metadata: { automation: true, ruleId: rule.id, trigger: rule.trigger },
      });
      await auditLogService.record({
        actorId: payload.actorId,
        workspaceId: rule.workspaceId,
        targetType: 'automation_rule',
        targetId: rule.id,
        action: 'automation.executed',
        metadata: { trigger: rule.trigger, actionCount: rule.actions.length },
      });
      return this.automations.recordExecution({
        ruleId: rule._id,
        workspaceId: rule.workspaceId,
        actorId: payload.actorId,
        status: 'success',
        message: `Executed ${rule.actions.length} action(s)`,
      });
    } catch (error) {
      return this.automations.recordExecution({
        ruleId: rule._id,
        workspaceId: rule.workspaceId,
        actorId: payload.actorId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Automation execution failed',
      });
    }
  }

  private matches(rule: AutomationRuleDocument, payload: AutomationEventPayload): boolean {
    return rule.conditions.every((condition) => {
      const value = payload.fields[condition.field];
      if (condition.operator === 'exists') return value !== undefined && value !== null;
      if (value === undefined || value === null) return false;
      const serialized = Array.isArray(value) ? value.join(',') : String(value);
      if (condition.operator === 'equals') return serialized === condition.value;
      if (condition.operator === 'not_equals') return serialized !== condition.value;
      return serialized.includes(condition.value);
    });
  }

  private async executeAction(
    action: AutomationRuleDocument['actions'][number],
    rule: AutomationRuleDocument,
    payload: AutomationEventPayload,
  ): Promise<void> {
    if (action.type === 'webhook' || action.type === 'email') return;
    const taskId = this.param(action.params, 'taskId') ?? payload.taskId?.toString();
    if (
      ['assign_user', 'move_task', 'change_status', 'change_priority', 'create_comment'].includes(
        action.type,
      ) &&
      !taskId
    ) {
      throw new Error(`${action.type} requires a task`);
    }
    if (action.type === 'create_task') {
      const columnId = this.param(action.params, 'columnId');
      const title = this.param(action.params, 'title');
      if (!columnId || !title) throw new Error('create_task requires columnId and title');
      const column = await ColumnModel.findById(columnId).exec();
      if (!column) throw new Error('create_task column not found');
      const board = await BoardModel.findById(column.boardId).exec();
      if (!board || board.workspaceId.toString() !== rule.workspaceId.toString()) {
        throw new Error('create_task column is outside this workspace');
      }
      const lastTask = await TaskModel.findOne({ columnId: column._id, archived: false })
        .sort({ order: -1 })
        .exec();
      await TaskModel.create({
        workspaceId: rule.workspaceId,
        projectId: board.projectId,
        boardId: board._id,
        columnId: column._id,
        title,
        description: this.param(action.params, 'description') ?? null,
        order: lastTask ? lastTask.order + 1 : 0,
        priority: (this.param(action.params, 'priority') as TaskPriority | undefined) ?? 'medium',
        status: 'open',
        assigneeIds: [],
        reporterId: payload.actorId,
        labels: [],
        createdBy: payload.actorId,
      });
    }
    if (action.type === 'assign_user' && taskId) {
      const userId = this.param(action.params, 'userId');
      if (!userId) throw new Error('assign_user requires userId');
      await TaskModel.updateOne(
        { _id: new Types.ObjectId(taskId), workspaceId: rule.workspaceId },
        { $addToSet: { assigneeIds: new Types.ObjectId(userId) } },
      ).exec();
    }
    if (action.type === 'move_task' && taskId) {
      const columnId = this.param(action.params, 'columnId');
      if (!columnId) throw new Error('move_task requires columnId');
      await TaskModel.updateOne(
        { _id: new Types.ObjectId(taskId), workspaceId: rule.workspaceId },
        { columnId: new Types.ObjectId(columnId) },
      ).exec();
    }
    if (action.type === 'change_status' && taskId) {
      await TaskModel.updateOne(
        { _id: new Types.ObjectId(taskId), workspaceId: rule.workspaceId },
        { status: this.param(action.params, 'status') as TaskStatus },
      ).exec();
    }
    if (action.type === 'change_priority' && taskId) {
      await TaskModel.updateOne(
        { _id: new Types.ObjectId(taskId), workspaceId: rule.workspaceId },
        { priority: this.param(action.params, 'priority') as TaskPriority },
      ).exec();
    }
    if (action.type === 'create_comment' && taskId) {
      await CommentModel.create({
        taskId: new Types.ObjectId(taskId),
        authorId: payload.actorId,
        content: this.param(action.params, 'content') ?? 'Automation update',
        mentionedUserIds: [],
      });
    }
    if (action.type === 'send_notification') {
      const userId = this.param(action.params, 'userId') ?? payload.actorId.toString();
      await notificationService.create({
        userId: new Types.ObjectId(userId),
        workspaceId: rule.workspaceId,
        actorId: payload.actorId,
        type: 'system_announcement',
        message: this.param(action.params, 'message') ?? `Automation "${rule.name}" ran`,
      });
    }
    if (action.type === 'call_ai') {
      const provider = this.providers.getProvider();
      await provider.complete({
        references: [
          { type: 'workspace', id: rule.workspaceId.toString(), label: 'Automation workspace' },
        ],
        messages: [
          {
            role: 'system',
            content:
              'You are executing an authorized Zenith automation. Return concise operational output.',
          },
          {
            role: 'user',
            content:
              this.param(action.params, 'prompt') ??
              `Automation ${rule.name} requested an AI summary.`,
          },
        ],
      });
    }
  }

  private param(params: Record<string, unknown>, key: string): string | undefined {
    const value = params[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private async requireRuleWriteAccess(
    ruleId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<AutomationRuleDocument> {
    const rule = await this.automations.findById(ruleId);
    if (!rule) throw new NotFoundError('Automation rule not found');
    await this.requireWorkspaceRole(rule.workspaceId, userId, automationWriteRoles);
    return rule;
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
    if (!roles.has(role)) throw new ForbiddenError('Automation manager access required');
  }

  private toRuleSummary(rule: AutomationRuleDocument): AutomationRuleSummary {
    return {
      id: rule.id,
      workspaceId: rule.workspaceId.toString(),
      projectId: rule.projectId?.toString() ?? null,
      name: rule.name,
      description: rule.description ?? null,
      enabled: rule.enabled,
      trigger: rule.trigger as AutomationTriggerType,
      conditions: rule.conditions,
      actions: rule.actions,
      createdBy: rule.createdBy.toString(),
      lastRunAt: rule.lastRunAt?.toISOString() ?? null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private toExecutionSummary(execution: AutomationExecutionDocument): AutomationExecutionSummary {
    return {
      id: execution.id,
      ruleId: execution.ruleId.toString(),
      workspaceId: execution.workspaceId.toString(),
      actorId: execution.actorId.toString(),
      status: execution.status as AutomationExecutionSummary['status'],
      message: execution.message,
      createdAt: execution.createdAt.toISOString(),
    };
  }
}

export const automationService = new AutomationService();
