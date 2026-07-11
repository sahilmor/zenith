import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const dateString = z.string().datetime({ offset: true });
const optionalDate = dateString.optional().nullable();
const label = z.string().trim().min(1).max(40);

export const columnTaskParamsSchema = z.object({
  params: z.object({
    columnId: objectId,
  }),
});

export const taskParamsSchema = z.object({
  params: z.object({
    taskId: objectId,
  }),
});

export const subtaskParamsSchema = z.object({
  params: z.object({
    subtaskId: objectId,
  }),
});

export const createTaskSchema = z.object({
  params: z.object({
    columnId: objectId,
  }),
  body: z
    .object({
      title: z.string().trim().min(2).max(180),
      description: z.string().trim().max(5000).optional().nullable(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      status: z.enum(['open', 'in_progress', 'done']).default('open'),
      assigneeIds: z.array(objectId).max(50).default([]),
      labels: z.array(label).max(20).default([]),
      dueDate: optionalDate,
      startDate: optionalDate,
      estimate: z.coerce.number().int().min(0).max(100000).optional().nullable(),
      coverImage: z.string().trim().url().optional().nullable(),
      taskTypeId: objectId.optional().nullable(),
      customFields: z.record(z.unknown()).default({}),
    })
    .refine(
      (value) =>
        !value.startDate ||
        !value.dueDate ||
        new Date(value.startDate).getTime() <= new Date(value.dueDate).getTime(),
      'Start date must be before due date',
    ),
});

export const updateTaskSchema = z.object({
  params: z.object({
    taskId: objectId,
  }),
  body: z
    .object({
      columnId: objectId.optional(),
      title: z.string().trim().min(2).max(180).optional(),
      description: z.string().trim().max(5000).optional().nullable(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['open', 'in_progress', 'done', 'archived']).optional(),
      assigneeIds: z.array(objectId).max(50).optional(),
      labels: z.array(label).max(20).optional(),
      dueDate: optionalDate,
      startDate: optionalDate,
      estimate: z.coerce.number().int().min(0).max(100000).optional().nullable(),
      coverImage: z.string().trim().url().optional().nullable(),
      taskTypeId: objectId.optional().nullable(),
      customFields: z.record(z.unknown()).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required')
    .refine(
      (value) =>
        !value.startDate ||
        !value.dueDate ||
        new Date(value.startDate).getTime() <= new Date(value.dueDate).getTime(),
      'Start date must be before due date',
    ),
});

export const reorderTasksSchema = z.object({
  body: z.object({
    boardId: objectId,
    columns: z
      .array(
        z.object({
          columnId: objectId,
          taskIds: z.array(objectId),
        }),
      )
      .min(1),
  }),
});

const commaList = z
  .string()
  .trim()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

export const listTasksSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    workspaceId: objectId.optional(),
    projectId: objectId.optional(),
    boardId: objectId.optional(),
    columnId: objectId.optional(),
    status: z.enum(['open', 'in_progress', 'done', 'archived']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigneeId: objectId.optional(),
    reporterId: objectId.optional(),
    createdBy: objectId.optional(),
    watchingUserId: objectId.optional(),
    labels: commaList.optional(),
    search: z.string().trim().max(120).optional(),
    archived: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    dueFrom: dateString.optional(),
    dueTo: dateString.optional(),
    createdFrom: dateString.optional(),
    createdTo: dateString.optional(),
    updatedFrom: dateString.optional(),
    updatedTo: dateString.optional(),
    sort: z
      .enum(['priority', 'dueDate', 'createdAt', 'updatedAt', 'title', 'manual'])
      .default('updatedAt'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const bulkUpdateTasksSchema = z.object({
  body: z
    .object({
      taskIds: z.array(objectId).min(1).max(200),
      columnId: objectId.optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['open', 'in_progress', 'done', 'archived']).optional(),
      assigneeIds: z.array(objectId).max(50).optional(),
      labels: z.array(label).max(20).optional(),
      dueDate: optionalDate,
      startDate: optionalDate,
      archived: z.boolean().optional(),
    })
    .refine(
      (value) =>
        !value.startDate ||
        !value.dueDate ||
        new Date(value.startDate).getTime() <= new Date(value.dueDate).getTime(),
      'Start date must be before due date',
    )
    .refine(
      (value) => Object.keys(value).some((key) => key !== 'taskIds'),
      'At least one update field is required',
    ),
});

export const createSubtaskSchema = z.object({
  params: z.object({
    taskId: objectId,
  }),
  body: z.object({
    title: z.string().trim().min(2).max(180),
    completed: z.boolean().default(false),
  }),
});

export const updateSubtaskSchema = z.object({
  params: z.object({
    subtaskId: objectId,
  }),
  body: z
    .object({
      title: z.string().trim().min(2).max(180).optional(),
      completed: z.boolean().optional(),
      order: z.coerce.number().int().min(0).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export const archiveTaskSchema = taskParamsSchema;
export const restoreTaskSchema = taskParamsSchema;

type CreateTaskBody = z.infer<typeof createTaskSchema>['body'];
export type CreateTaskInput = Omit<CreateTaskBody, 'customFields'> & {
  customFields?: Record<string, unknown>;
};
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>['body'];
export type ListTasksQuery = z.infer<typeof listTasksSchema>['query'];
export type BulkUpdateTasksInput = z.infer<typeof bulkUpdateTasksSchema>['body'];
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>['body'];
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>['body'];
