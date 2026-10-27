import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { sendSuccess } from '../../../utils/api-response.js';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { automationService } from '../services/automation.service.js';

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const objectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

const queryObjectId = (value: unknown): Types.ObjectId | undefined =>
  typeof value === 'string' ? new Types.ObjectId(value) : undefined;

export const listAutomations: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = queryObjectId(request.query.workspaceId);
  if (!workspaceId) throw new BadRequestError('workspaceId is required');
  const rules = await automationService.listRules(workspaceId, requireUserId(request));
  sendSuccess(response, 200, 'Automation rules retrieved', rules);
});

export const createAutomation: RequestHandler = asyncHandler(async (request, response) => {
  const rule = await automationService.createRule(requireUserId(request), request.body);
  sendSuccess(response, 201, 'Automation rule created', rule);
});

export const updateAutomation: RequestHandler = asyncHandler(async (request, response) => {
  const rule = await automationService.updateRule(
    objectId(request.params.ruleId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Automation rule updated', rule);
});

export const deleteAutomation: RequestHandler = asyncHandler(async (request, response) => {
  await automationService.deleteRule(objectId(request.params.ruleId), requireUserId(request));
  sendSuccess(response, 200, 'Automation rule deleted');
});

export const testAutomation: RequestHandler = asyncHandler(async (request, response) => {
  const execution = await automationService.testRule(
    objectId(request.params.ruleId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Automation rule tested', execution);
});
