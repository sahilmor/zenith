import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const optionalObjectId = objectId.optional().nullable();
const isoDate = z.string().datetime();
const tags = z.array(z.string().trim().min(1).max(60).toLowerCase()).max(50).default([]);

const customFields = z
  .array(
    z.object({
      key: z.string().trim().min(1).max(80).toLowerCase(),
      value: z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]),
    }),
  )
  .max(100)
  .default([]);

export const workspaceCrmParamsSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  query: z.object({
    search: z.string().trim().max(120).optional(),
    status: z.string().trim().max(80).optional(),
    stage: z.string().trim().max(80).optional(),
    accountId: objectId.optional(),
  }),
});

export const crmAccountParamsSchema = z.object({ params: z.object({ accountId: objectId }) });
export const crmLeadParamsSchema = z.object({ params: z.object({ leadId: objectId }) });
export const crmDealParamsSchema = z.object({ params: z.object({ dealId: objectId }) });

export const createAccountSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    name: z.string().trim().min(2).max(180),
    domain: z.string().trim().toLowerCase().max(180).optional().nullable(),
    website: z.string().url().optional().nullable(),
    industry: z.string().trim().max(120).optional().nullable(),
    size: z.string().trim().max(80).optional().nullable(),
    status: z.enum(['prospect', 'customer', 'partner', 'former']).default('prospect'),
    ownerId: objectId.optional(),
    healthScore: z.coerce.number().int().min(0).max(100).default(75),
    lifecycleStage: z.string().trim().max(80).default('lead'),
    renewalDate: isoDate.optional().nullable(),
    onboardingProjectId: optionalObjectId,
    tags,
    customFields,
  }),
});

export const updateAccountSchema = z.object({
  params: z.object({ accountId: objectId }),
  body: createAccountSchema.shape.body.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
});

export const createContactSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    accountId: optionalObjectId,
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().max(80).optional().nullable(),
    email: z.string().trim().email().toLowerCase().max(180),
    phone: z.string().trim().max(60).optional().nullable(),
    title: z.string().trim().max(120).optional().nullable(),
    ownerId: objectId.optional(),
    tags,
    customFields,
  }),
});

export const createLeadSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    companyName: z.string().trim().min(2).max(180),
    contactName: z.string().trim().min(2).max(160),
    email: z.string().trim().email().toLowerCase().max(180),
    source: z.string().trim().max(120).optional().nullable(),
    status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).default('new'),
    score: z.coerce.number().int().min(0).max(100).default(0),
    estimatedValue: z.coerce.number().min(0).default(0),
    ownerId: objectId.optional(),
    tags,
    customFields,
  }),
});

export const updateLeadSchema = z.object({
  params: z.object({ leadId: objectId }),
  body: createLeadSchema.shape.body.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
});

export const createDealSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    accountId: objectId,
    contactId: optionalObjectId,
    projectId: optionalObjectId,
    name: z.string().trim().min(2).max(180),
    stage: z
      .enum(['qualification', 'discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
      .default('qualification'),
    forecastCategory: z.enum(['pipeline', 'best_case', 'commit', 'closed']).default('pipeline'),
    value: z.coerce.number().min(0).default(0),
    currency: z.string().trim().length(3).toLowerCase().default('usd'),
    probability: z.coerce.number().int().min(0).max(100).default(10),
    expectedCloseDate: isoDate.optional().nullable(),
    ownerId: objectId.optional(),
    nextStep: z.string().trim().max(500).optional().nullable(),
    tags,
    customFields,
  }),
});

export const updateDealSchema = z.object({
  params: z.object({ dealId: objectId }),
  body: createDealSchema.shape.body.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
});

export const createCrmActivitySchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z
    .object({
      accountId: optionalObjectId,
      contactId: optionalObjectId,
      leadId: optionalObjectId,
      dealId: optionalObjectId,
      taskId: optionalObjectId,
      type: z.enum(['note', 'email', 'call', 'meeting', 'task', 'follow_up']),
      title: z.string().trim().min(2).max(180),
      body: z.string().trim().max(5000).optional().nullable(),
      occurredAt: isoDate.optional(),
      dueAt: isoDate.optional().nullable(),
      completedAt: isoDate.optional().nullable(),
      ownerId: objectId.optional(),
    })
    .refine(
      (value) => value.accountId || value.contactId || value.leadId || value.dealId || value.taskId,
      { message: 'At least one CRM or task target is required' },
    ),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>['body'];
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>['body'];
export type CreateContactInput = z.infer<typeof createContactSchema>['body'];
export type CreateLeadInput = z.infer<typeof createLeadSchema>['body'];
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>['body'];
export type CreateDealInput = z.infer<typeof createDealSchema>['body'];
export type UpdateDealInput = z.infer<typeof updateDealSchema>['body'];
export type CreateCrmActivityInput = z.infer<typeof createCrmActivitySchema>['body'];
