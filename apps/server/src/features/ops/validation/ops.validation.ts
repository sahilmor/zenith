import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listAuditLogsSchema = {
  query: z.object({
    workspaceId: objectId.optional(),
    actorId: objectId.optional(),
    targetType: z.string().trim().min(1).max(80).optional(),
    action: z.string().trim().min(1).max(120).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }),
};

export const upsertFeatureFlagSchema = {
  body: z.object({
    key: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9_.-]+$/),
    description: z.string().trim().max(500).nullable().optional(),
    enabled: z.boolean(),
    rolloutPercentage: z.number().int().min(0).max(100).default(100),
    workspaceIds: z.array(objectId).default([]),
    userIds: z.array(objectId).default([]),
    metadata: z.record(z.unknown()).default({}),
  }),
};

export const evaluateFeatureFlagSchema = {
  params: z.object({ key: z.string().trim().min(2).max(80) }),
  query: z.object({ workspaceId: objectId.optional() }),
};

export const createWebhookSchema = {
  body: z.object({
    workspaceId: objectId,
    url: z.string().url(),
    events: z.array(z.string().trim().min(2).max(100)).min(1).max(50),
  }),
};

export const webhookParamsSchema = {
  params: z.object({ webhookId: objectId }),
  query: z.object({ workspaceId: objectId }),
};

export const workspaceQuerySchema = {
  query: z.object({ workspaceId: objectId }),
};

export const listJobsSchema = {
  query: z.object({
    status: z.enum(['queued', 'running', 'succeeded', 'failed']).optional(),
    type: z.string().trim().min(1).max(80).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }),
};

export const enqueueJobSchema = {
  body: z.object({
    type: z.string().trim().min(2).max(80),
    payload: z.record(z.unknown()).default({}),
    runAt: z.string().datetime().optional(),
    maxAttempts: z.number().int().min(1).max(10).default(3),
  }),
};

export const createApiKeySchema = {
  body: z.object({
    workspaceId: objectId,
    name: z.string().trim().min(2).max(120),
    scopes: z.array(z.string().trim().min(2).max(80)).min(1).max(50),
  }),
};

export const apiKeyParamsSchema = {
  params: z.object({ keyId: objectId }),
  query: z.object({ workspaceId: objectId }),
};

export const listAuditLogsRouteSchema = z.object(listAuditLogsSchema);
export const upsertFeatureFlagRouteSchema = z.object(upsertFeatureFlagSchema);
export const evaluateFeatureFlagRouteSchema = z.object(evaluateFeatureFlagSchema);
export const createWebhookRouteSchema = z.object(createWebhookSchema);
export const webhookParamsRouteSchema = z.object(webhookParamsSchema);
export const workspaceQueryRouteSchema = z.object(workspaceQuerySchema);
export const listJobsRouteSchema = z.object(listJobsSchema);
export const enqueueJobRouteSchema = z.object(enqueueJobSchema);
export const createApiKeyRouteSchema = z.object(createApiKeySchema);
export const apiKeyParamsRouteSchema = z.object(apiKeyParamsSchema);

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsSchema.query>;
export type UpsertFeatureFlagInput = z.infer<typeof upsertFeatureFlagSchema.body>;
export type EvaluateFeatureFlagQuery = z.infer<typeof evaluateFeatureFlagSchema.query>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema.body>;
export type ListJobsQuery = z.infer<typeof listJobsSchema.query>;
export type EnqueueJobInput = z.infer<typeof enqueueJobSchema.body>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema.body>;
