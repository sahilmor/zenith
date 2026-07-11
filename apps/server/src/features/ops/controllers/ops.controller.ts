import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { auditLogService } from '../services/audit-log.service.js';
import { backgroundJobService } from '../services/background-job.service.js';
import { featureFlagService } from '../services/feature-flag.service.js';
import { webhookService } from '../services/webhook.service.js';
import { apiKeyService } from '../services/api-key.service.js';
import type {
  EvaluateFeatureFlagQuery,
  ListAuditLogsQuery,
  ListJobsQuery,
} from '../validation/ops.validation.js';

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

export const listAuditLogs: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Audit logs retrieved',
    await auditLogService.list(request.query as unknown as ListAuditLogsQuery),
  );
});

export const listFeatureFlags: RequestHandler = asyncHandler(async (_request, response) => {
  sendSuccess(response, 200, 'Feature flags retrieved', await featureFlagService.list());
});

export const upsertFeatureFlag: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Feature flag saved',
    await featureFlagService.upsert(requireUserId(request), request.body),
  );
});

export const evaluateFeatureFlag: RequestHandler = asyncHandler(async (request, response) => {
  const query = request.query as unknown as EvaluateFeatureFlagQuery;
  sendSuccess(
    response,
    200,
    'Feature flag evaluated',
    await featureFlagService.evaluate({
      key: String(request.params.key),
      userId: requireUserId(request),
      ...(query.workspaceId ? { workspaceId: new Types.ObjectId(query.workspaceId) } : {}),
    }),
  );
});

export const enqueueJob: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    202,
    'Background job queued',
    await backgroundJobService.enqueue(request.body),
  );
});

export const listJobs: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Background jobs retrieved',
    await backgroundJobService.list(request.query as unknown as ListJobsQuery),
  );
});

export const processJobs: RequestHandler = asyncHandler(async (_request, response) => {
  await backgroundJobService.processDue();
  sendSuccess(response, 202, 'Background job processor tick completed');
});

export const createWebhook: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Webhook created',
    await webhookService.create(requireUserId(request), request.body),
  );
});

export const listWebhooks: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = String(request.query.workspaceId);
  sendSuccess(
    response,
    200,
    'Webhooks retrieved',
    await webhookService.list(new Types.ObjectId(workspaceId), requireUserId(request)),
  );
});

export const deleteWebhook: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = String(request.query.workspaceId);
  await webhookService.delete(
    new Types.ObjectId(workspaceId),
    new Types.ObjectId(request.params.webhookId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Webhook deleted');
});

export const createApiKey: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'API key created',
    await apiKeyService.create(requireUserId(request), request.body),
  );
});

export const revokeApiKey: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = String(request.query.workspaceId);
  await apiKeyService.revoke(
    new Types.ObjectId(workspaceId),
    new Types.ObjectId(request.params.keyId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'API key revoked');
});
