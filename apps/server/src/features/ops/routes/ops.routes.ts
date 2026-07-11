import { Router } from 'express';
import { requirePlatformAdmin } from '../../../middleware/admin.middleware.js';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  createApiKey,
  createWebhook,
  deleteWebhook,
  enqueueJob,
  evaluateFeatureFlag,
  listAuditLogs,
  listFeatureFlags,
  listJobs,
  listWebhooks,
  processJobs,
  revokeApiKey,
  upsertFeatureFlag,
} from '../controllers/ops.controller.js';
import {
  apiKeyParamsRouteSchema,
  createApiKeyRouteSchema,
  createWebhookRouteSchema,
  enqueueJobRouteSchema,
  evaluateFeatureFlagRouteSchema,
  listAuditLogsRouteSchema,
  listJobsRouteSchema,
  upsertFeatureFlagRouteSchema,
  webhookParamsRouteSchema,
  workspaceQueryRouteSchema,
} from '../validation/ops.validation.js';

export const opsRouter = Router();

opsRouter.use(verifyToken);

opsRouter.get(
  '/audit-logs',
  requirePlatformAdmin,
  validate(listAuditLogsRouteSchema),
  listAuditLogs,
);
opsRouter.get('/feature-flags', requirePlatformAdmin, listFeatureFlags);
opsRouter.put(
  '/feature-flags',
  requirePlatformAdmin,
  validate(upsertFeatureFlagRouteSchema),
  upsertFeatureFlag,
);
opsRouter.get(
  '/feature-flags/:key/evaluate',
  validate(evaluateFeatureFlagRouteSchema),
  evaluateFeatureFlag,
);
opsRouter.get('/jobs', requirePlatformAdmin, validate(listJobsRouteSchema), listJobs);
opsRouter.post('/jobs', requirePlatformAdmin, validate(enqueueJobRouteSchema), enqueueJob);
opsRouter.post('/jobs/process', requirePlatformAdmin, processJobs);
opsRouter.get('/webhooks', validate(workspaceQueryRouteSchema), listWebhooks);
opsRouter.post('/webhooks', validate(createWebhookRouteSchema), createWebhook);
opsRouter.delete('/webhooks/:webhookId', validate(webhookParamsRouteSchema), deleteWebhook);
opsRouter.post('/api-keys', validate(createApiKeyRouteSchema), createApiKey);
opsRouter.delete('/api-keys/:keyId', validate(apiKeyParamsRouteSchema), revokeApiKey);
