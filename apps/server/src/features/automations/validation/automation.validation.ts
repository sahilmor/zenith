import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const automationConditionSchema = z.object({
  field: z.string().trim().min(1).max(80),
  operator: z.enum(['equals', 'not_equals', 'contains', 'exists']),
  value: z.string().trim().max(240),
});

const automationActionSchema = z.object({
  type: z.enum([
    'assign_user',
    'move_task',
    'change_status',
    'change_priority',
    'create_task',
    'create_comment',
    'send_notification',
    'webhook',
    'email',
  ]),
  params: z.record(z.union([z.string(), z.array(z.string()), z.boolean(), z.number(), z.null()])),
});

export const automationRuleSchema = z.object({
  body: z.object({
    workspaceId: objectId,
    projectId: objectId.optional().nullable(),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    enabled: z.boolean().default(true),
    trigger: z.enum([
      'task_created',
      'task_updated',
      'task_moved',
      'task_assigned',
      'task_completed',
      'due_date_reached',
      'comment_added',
      'attachment_uploaded',
      'workspace_invitation_accepted',
    ]),
    conditions: z.array(automationConditionSchema).max(12).default([]),
    actions: z.array(automationActionSchema).min(1).max(10),
  }),
});

export const updateAutomationRuleSchema = z.object({
  params: z.object({ ruleId: objectId }),
  body: automationRuleSchema.shape.body.partial(),
});

export const automationParamsSchema = z.object({
  params: z.object({ ruleId: objectId }),
});

export const listAutomationsSchema = z.object({
  query: z.object({ workspaceId: objectId }),
});

export type AutomationRuleInput = z.infer<typeof automationRuleSchema>['body'];
export type AutomationRuleUpdateInput = z.infer<typeof updateAutomationRuleSchema>['body'];
