import { z } from 'zod';
import { customFieldTypes } from '../models/custom-field-definition.model.js';
import { taskTypeCategories } from '../models/task-type.model.js';
import { workflowStateCategories } from '../models/workflow.model.js';
import { templateTypes } from '../models/template.model.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const stableId = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_-]{1,62}$/i, 'Invalid stable id');
const fieldKey = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_]{1,62}$/);
const color = z.string().trim().max(40).default('#64748b');
const customFieldType = z.enum(customFieldTypes);

export const customFieldValueSchema = z.union([
  z.string().max(5000),
  z.number(),
  z.boolean(),
  z.array(z.string().max(160)).max(100),
  z.null(),
]);

const fieldOptionSchema = z.object({
  id: stableId,
  label: z.string().trim().min(1).max(80),
  color: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  order: z.coerce.number().int().min(0).default(0),
  archived: z.boolean().default(false),
});

const fieldValidationSchema = z
  .object({
    minLength: z.coerce.number().int().min(0).optional(),
    maxLength: z.coerce.number().int().min(0).optional(),
    pattern: z.string().trim().max(500).optional(),
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
    precision: z.coerce.number().int().min(0).max(8).optional(),
    minDate: z.string().datetime({ offset: true }).optional(),
    maxDate: z.string().datetime({ offset: true }).optional(),
    minSelections: z.coerce.number().int().min(0).optional(),
    maxSelections: z.coerce.number().int().min(0).optional(),
  })
  .default({});

const customFieldFields = {
  projectIds: z.array(objectId).max(100).default([]),
  taskTypeIds: z.array(objectId).max(100).default([]),
  key: fieldKey,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  fieldType: customFieldType,
  required: z.boolean().default(false),
  defaultValue: customFieldValueSchema.optional().nullable(),
  options: z.array(fieldOptionSchema).max(200).default([]),
  validation: fieldValidationSchema,
  visibility: z.enum(['always', 'internal']).default('always'),
  searchable: z.boolean().default(false),
  filterable: z.boolean().default(true),
  sortable: z.boolean().default(false),
  groupable: z.boolean().default(false),
  analyticsEnabled: z.boolean().default(false),
};

const customFieldBody = z.object(customFieldFields).refine((value) => {
  const ids = value.options.map((option) => option.id);
  return new Set(ids).size === ids.length;
}, 'Option ids must be unique');

export const workspaceCustomizationParamsSchema = z.object({
  params: z.object({ workspaceId: objectId }),
});

export const fieldParamsSchema = z.object({
  params: z.object({ fieldId: objectId }),
});

export const createCustomFieldRouteSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: customFieldBody,
});

export const updateCustomFieldRouteSchema = z.object({
  params: z.object({ fieldId: objectId }),
  body: z
    .object(customFieldFields)
    .partial()
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export const createTaskTypeRouteSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(80),
    key: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9_]{1,15}$/),
    description: z.string().trim().max(1000).optional().nullable(),
    icon: z.string().trim().max(40).optional().nullable(),
    color,
    category: z.enum(taskTypeCategories).default('custom'),
    defaultWorkflowId: objectId.optional().nullable(),
    fieldIds: z.array(objectId).max(100).default([]),
    requiredFieldIds: z.array(objectId).max(100).default([]),
    defaultPriority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    defaultLabels: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    descriptionTemplate: z.string().trim().max(5000).optional().nullable(),
  }),
});

export const workflowStateSchema = z.object({
  id: stableId,
  name: z.string().trim().min(1).max(80),
  category: z.enum(workflowStateCategories),
  color,
  description: z.string().trim().max(500).optional().nullable(),
  order: z.coerce.number().int().min(0).default(0),
  terminal: z.boolean().default(false),
  columnId: objectId.optional().nullable(),
});

export const workflowTransitionSchema = z.object({
  id: stableId,
  name: z.string().trim().min(1).max(80),
  fromStateId: stableId,
  toStateId: stableId,
  requiredRoles: z.array(z.enum(['owner', 'admin', 'manager', 'member', 'guest'])).default([]),
  requiredFieldIds: z.array(objectId).max(50).default([]),
  requireAssignee: z.boolean().default(false),
  requireReporter: z.boolean().default(false),
  requireAllSubtasksComplete: z.boolean().default(false),
});

export const createWorkflowRouteSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z
    .object({
      name: z.string().trim().min(1).max(120),
      description: z.string().trim().max(1000).optional().nullable(),
      states: z.array(workflowStateSchema).min(1).max(100),
      transitions: z.array(workflowTransitionSchema).max(300).default([]),
      initialStateId: stableId,
      active: z.boolean().default(true),
    })
    .superRefine((value, context) => {
      const stateIds = new Set(value.states.map((state) => state.id));
      if (!stateIds.has(value.initialStateId)) {
        context.addIssue({ code: 'custom', message: 'Initial state must exist' });
      }
      for (const transition of value.transitions) {
        if (!stateIds.has(transition.fromStateId) || !stateIds.has(transition.toStateId)) {
          context.addIssue({ code: 'custom', message: 'Transitions must reference valid states' });
        }
      }
    }),
});

export const transitionParamsRouteSchema = z.object({
  params: z.object({ taskId: objectId, transitionId: stableId }),
  body: z.object({ customFields: z.record(customFieldValueSchema).default({}) }),
});

export const formFieldSchema = z.object({
  id: stableId,
  fieldId: objectId.optional().nullable(),
  label: z.string().trim().min(1).max(120),
  fieldType: z.union([customFieldType, z.enum(['title', 'description', 'priority'])]),
  required: z.boolean().default(false),
  order: z.coerce.number().int().min(0).default(0),
  instructions: z.string().trim().max(500).optional().nullable(),
  hidden: z.boolean().default(false),
  defaultValue: customFieldValueSchema.optional().nullable(),
});

export const createFormRouteSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    visibility: z.enum(['internal', 'public']).default('internal'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9-]{2,80}$/),
    destinationProjectId: objectId,
    destinationBoardId: objectId,
    destinationColumnId: objectId,
    destinationTaskTypeId: objectId.optional().nullable(),
    active: z.boolean().default(false),
    expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
    fields: z.array(formFieldSchema).min(1).max(100),
    confirmationMessage: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .default('Thanks. Your request was submitted.'),
  }),
});

export const publicFormParamsRouteSchema = z.object({
  params: z.object({ slug: z.string().trim().toLowerCase().min(3).max(100) }),
});

export const submitPublicFormRouteSchema = z.object({
  params: z.object({ slug: z.string().trim().toLowerCase().min(3).max(100) }),
  body: z.object({ values: z.record(customFieldValueSchema).default({}) }),
});

export const createTemplateRouteSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    templateType: z.enum(templateTypes),
    config: z.record(z.unknown()).default({}),
    active: z.boolean().default(true),
  }),
});

export const templateParamsRouteSchema = z.object({
  params: z.object({ templateId: objectId }),
});

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldRouteSchema>['body'];
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldRouteSchema>['body'];
export type CreateTaskTypeInput = z.infer<typeof createTaskTypeRouteSchema>['body'];
export type CreateWorkflowInput = z.infer<typeof createWorkflowRouteSchema>['body'];
export type TransitionInput = z.infer<typeof transitionParamsRouteSchema>['body'];
export type CreateFormInput = z.infer<typeof createFormRouteSchema>['body'];
export type SubmitPublicFormInput = z.infer<typeof submitPublicFormRouteSchema>['body'];
export type CreateTemplateInput = z.infer<typeof createTemplateRouteSchema>['body'];
