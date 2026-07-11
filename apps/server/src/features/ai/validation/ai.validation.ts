import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const referenceSchema = z.object({
  type: z.enum(['workspace', 'project', 'board', 'task']),
  id: objectId,
  label: z.string().trim().min(1).max(160),
});

export const chatSchema = z.object({
  body: z.object({
    workspaceId: objectId,
    conversationId: objectId.optional(),
    message: z.string().trim().min(1).max(8000),
    references: z.array(referenceSchema).max(12).default([]),
  }),
});

export const conversationParamsSchema = z.object({
  params: z.object({ conversationId: objectId }),
});

export const listConversationsSchema = z.object({
  query: z.object({ workspaceId: objectId }),
});

export const updateConversationSchema = z.object({
  params: z.object({ conversationId: objectId }),
  body: z.object({
    title: z.string().trim().min(2).max(120).optional(),
    pinned: z.boolean().optional(),
  }),
});

export const aiActionSchema = z.object({
  body: z.object({
    workspaceId: objectId,
    projectId: objectId.optional(),
    boardId: objectId.optional(),
    taskId: objectId.optional(),
    action: z.enum([
      'generate_tasks',
      'break_task_into_subtasks',
      'summarize_task',
      'summarize_project',
      'summarize_workspace',
      'summarize_comments',
      'meeting_notes',
      'release_notes',
      'suggest_priority',
      'suggest_labels',
      'suggest_due_date',
      'suggest_assignees',
      'project_description',
      'board_description',
      'improve_task_title',
      'rewrite_description',
      'translate_comment',
      'detect_duplicates',
      'related_tasks',
      'generate_checklist',
      'recurring_template',
    ]),
    input: z.string().trim().min(1).max(8000),
  }),
});

export const aiSearchSchema = z.object({
  body: z.object({
    workspaceId: objectId,
    query: z.string().trim().min(2).max(500),
  }),
});

export const promptSchema = z.object({
  body: z.object({
    workspaceId: objectId,
    projectId: objectId.optional().nullable(),
    scope: z.enum(['global', 'workspace', 'project']),
    name: z.string().trim().min(2).max(120),
    content: z.string().trim().min(5).max(12000),
    variables: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  }),
});

export const listPromptsSchema = z.object({
  query: z.object({
    workspaceId: objectId,
    projectId: objectId.optional(),
  }),
});

export const promptParamsSchema = z.object({
  params: z.object({ promptId: objectId }),
});

export const updatePromptSchema = z.object({
  params: z.object({ promptId: objectId }),
  body: promptSchema.shape.body.partial(),
});

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
    'call_ai',
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

export type ChatInput = z.infer<typeof chatSchema>['body'];
export type AiActionInput = z.infer<typeof aiActionSchema>['body'];
export type AiSearchInput = z.infer<typeof aiSearchSchema>['body'];
export type PromptInput = z.infer<typeof promptSchema>['body'];
export type PromptUpdateInput = z.infer<typeof updatePromptSchema>['body'];
export type AutomationRuleInput = z.infer<typeof automationRuleSchema>['body'];
export type AutomationRuleUpdateInput = z.infer<typeof updateAutomationRuleSchema>['body'];
