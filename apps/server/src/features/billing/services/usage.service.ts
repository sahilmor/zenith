import type { BillingUsage } from '@pm/types';
import type { Types } from 'mongoose';
import { AutomationRuleModel } from '../../ai/models/automation-rule.model.js';
import { BoardModel } from '../../boards/models/board.model.js';
import { CustomFieldDefinitionModel } from '../../customization/models/custom-field-definition.model.js';
import { IntakeFormModel } from '../../customization/models/intake-form.model.js';
import { TaskTypeModel } from '../../customization/models/task-type.model.js';
import { TemplateModel } from '../../customization/models/template.model.js';
import { WorkflowModel } from '../../customization/models/workflow.model.js';
import { ApiKeyModel } from '../../ops/models/api-key.model.js';
import { WebhookEndpointModel } from '../../ops/models/webhook-endpoint.model.js';
import { ProjectModel } from '../../projects/models/project.model.js';
import { GoalModel } from '../../strategic/models/goal.model.js';
import { InitiativeModel } from '../../strategic/models/initiative.model.js';
import { PortfolioModel } from '../../strategic/models/portfolio.model.js';
import { AttachmentModel } from '../../tasks/models/attachment.model.js';
import { TaskModel } from '../../tasks/models/task.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';

export class UsageService {
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
      goals,
      initiatives,
      portfolios,
      customFields,
      taskTypes,
      workflows,
      activeForms,
      templates,
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
      GoalModel.countDocuments({ workspaceId, archived: false }),
      InitiativeModel.countDocuments({ workspaceId, archived: false }),
      PortfolioModel.countDocuments({ workspaceId, archived: false }),
      CustomFieldDefinitionModel.countDocuments({ workspaceId, archived: false }),
      TaskTypeModel.countDocuments({ workspaceId, archived: false }),
      WorkflowModel.countDocuments({ workspaceId, archived: false }),
      IntakeFormModel.countDocuments({ workspaceId, active: true }),
      TemplateModel.countDocuments({ workspaceId, archived: false }),
    ]);

    return {
      members,
      projects,
      boards,
      tasks,
      storageBytes: storage[0]?.total ?? 0,
      aiRequests: 0,
      automations,
      apiKeys,
      webhooks,
      reportExports: 0,
      goals,
      initiatives,
      portfolios,
      customFields,
      taskTypes,
      workflows,
      activeForms,
      templates,
    };
  }
}

export const usageService = new UsageService();
