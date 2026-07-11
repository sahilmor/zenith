import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { strategicService } from '../services/strategic.service.js';

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

export const createGoal: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Goal created',
    await strategicService.createGoal(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const listGoals: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Goals retrieved',
    await strategicService.listGoals(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
      request.query,
    ),
  );
});

export const getGoal: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Goal retrieved',
    await strategicService.getGoal(paramObjectId(request.params.goalId), requireUserId(request)),
  );
});

export const updateGoal: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Goal updated',
    await strategicService.updateGoal(
      paramObjectId(request.params.goalId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const archiveGoal: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Goal archived',
    await strategicService.archiveGoal(
      paramObjectId(request.params.goalId),
      requireUserId(request),
    ),
  );
});

export const restoreGoal: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Goal restored',
    await strategicService.restoreGoal(
      paramObjectId(request.params.goalId),
      requireUserId(request),
    ),
  );
});

export const createKeyResult: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Key result created',
    await strategicService.createKeyResult(
      paramObjectId(request.params.goalId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const listKeyResults: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Key results retrieved',
    await strategicService.listKeyResults(
      paramObjectId(request.params.goalId),
      requireUserId(request),
    ),
  );
});

export const updateKeyResult: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Key result updated',
    await strategicService.updateKeyResult(
      paramObjectId(request.params.keyResultId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const deleteKeyResult: RequestHandler = asyncHandler(async (request, response) => {
  await strategicService.deleteKeyResult(
    paramObjectId(request.params.keyResultId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Key result deleted');
});

export const createCheckIn: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Check-in posted',
    await strategicService.createCheckIn(
      paramObjectId(request.params.goalId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const listCheckIns: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Check-ins retrieved',
    await strategicService.listCheckIns(
      paramObjectId(request.params.goalId),
      requireUserId(request),
    ),
  );
});

export const createInitiative: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Initiative created',
    await strategicService.createInitiative(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const listInitiatives: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Initiatives retrieved',
    await strategicService.listInitiatives(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
      request.query,
    ),
  );
});

export const getInitiative: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Initiative retrieved',
    await strategicService.getInitiative(
      paramObjectId(request.params.initiativeId),
      requireUserId(request),
    ),
  );
});

export const updateInitiative: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Initiative updated',
    await strategicService.updateInitiative(
      paramObjectId(request.params.initiativeId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const archiveInitiative: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Initiative archived',
    await strategicService.archiveInitiative(
      paramObjectId(request.params.initiativeId),
      requireUserId(request),
    ),
  );
});

export const restoreInitiative: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Initiative restored',
    await strategicService.restoreInitiative(
      paramObjectId(request.params.initiativeId),
      requireUserId(request),
    ),
  );
});

export const createPortfolio: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Portfolio created',
    await strategicService.createPortfolio(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const listPortfolios: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Portfolios retrieved',
    await strategicService.listPortfolios(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
      request.query,
    ),
  );
});

export const getPortfolio: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Portfolio retrieved',
    await strategicService.getPortfolio(
      paramObjectId(request.params.portfolioId),
      requireUserId(request),
    ),
  );
});

export const updatePortfolio: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Portfolio updated',
    await strategicService.updatePortfolio(
      paramObjectId(request.params.portfolioId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const archivePortfolio: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Portfolio archived',
    await strategicService.archivePortfolio(
      paramObjectId(request.params.portfolioId),
      requireUserId(request),
    ),
  );
});

export const restorePortfolio: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Portfolio restored',
    await strategicService.restorePortfolio(
      paramObjectId(request.params.portfolioId),
      requireUserId(request),
    ),
  );
});

export const createStrategicLink: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Strategic link created',
    await strategicService.createLink(request.body, requireUserId(request)),
  );
});

export const deleteStrategicLink: RequestHandler = asyncHandler(async (request, response) => {
  await strategicService.deleteLink(paramObjectId(request.params.linkId), requireUserId(request));
  sendSuccess(response, 200, 'Strategic link deleted');
});

export const listStrategicLinks: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Strategic links retrieved',
    await strategicService.listLinks(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const strategicDashboard: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Strategic dashboard retrieved',
    await strategicService.dashboard(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});
