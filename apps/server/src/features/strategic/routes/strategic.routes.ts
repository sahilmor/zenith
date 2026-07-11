import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  archiveGoal,
  archiveInitiative,
  archivePortfolio,
  createCheckIn,
  createGoal,
  createInitiative,
  createKeyResult,
  createPortfolio,
  createStrategicLink,
  deleteKeyResult,
  deleteStrategicLink,
  getGoal,
  getInitiative,
  getPortfolio,
  listCheckIns,
  listGoals,
  listInitiatives,
  listKeyResults,
  listPortfolios,
  listStrategicLinks,
  restoreGoal,
  restoreInitiative,
  restorePortfolio,
  strategicDashboard,
  updateGoal,
  updateInitiative,
  updateKeyResult,
  updatePortfolio,
} from '../controllers/strategic.controller.js';
import {
  createCheckInSchema,
  createGoalSchema,
  createInitiativeSchema,
  createKeyResultSchema,
  createPortfolioSchema,
  createStrategicLinkSchema,
  goalParamsSchema,
  initiativeParamsSchema,
  keyResultParamsSchema,
  portfolioParamsSchema,
  strategicLinkParamsSchema,
  updateGoalSchema,
  updateInitiativeSchema,
  updateKeyResultSchema,
  updatePortfolioSchema,
  workspaceStrategicParamsSchema,
} from '../validation/strategic.validation.js';

export const strategicRouter = Router();

strategicRouter.use(verifyToken);

strategicRouter.get(
  '/workspaces/:workspaceId/goals',
  validate(workspaceStrategicParamsSchema),
  listGoals,
);
strategicRouter.post('/workspaces/:workspaceId/goals', validate(createGoalSchema), createGoal);
strategicRouter.get(
  '/workspaces/:workspaceId/initiatives',
  validate(workspaceStrategicParamsSchema),
  listInitiatives,
);
strategicRouter.post(
  '/workspaces/:workspaceId/initiatives',
  validate(createInitiativeSchema),
  createInitiative,
);
strategicRouter.get(
  '/workspaces/:workspaceId/portfolios',
  validate(workspaceStrategicParamsSchema),
  listPortfolios,
);
strategicRouter.post(
  '/workspaces/:workspaceId/portfolios',
  validate(createPortfolioSchema),
  createPortfolio,
);
strategicRouter.get(
  '/workspaces/:workspaceId/strategic-links',
  validate(workspaceStrategicParamsSchema),
  listStrategicLinks,
);
strategicRouter.get(
  '/workspaces/:workspaceId/strategic-dashboard',
  validate(workspaceStrategicParamsSchema),
  strategicDashboard,
);

strategicRouter.get('/goals/:goalId', validate(goalParamsSchema), getGoal);
strategicRouter.patch('/goals/:goalId', validate(updateGoalSchema), updateGoal);
strategicRouter.delete('/goals/:goalId', validate(goalParamsSchema), archiveGoal);
strategicRouter.post('/goals/:goalId/archive', validate(goalParamsSchema), archiveGoal);
strategicRouter.post('/goals/:goalId/restore', validate(goalParamsSchema), restoreGoal);
strategicRouter.get('/goals/:goalId/key-results', validate(goalParamsSchema), listKeyResults);
strategicRouter.post(
  '/goals/:goalId/key-results',
  validate(createKeyResultSchema),
  createKeyResult,
);
strategicRouter.get('/goals/:goalId/check-ins', validate(goalParamsSchema), listCheckIns);
strategicRouter.post('/goals/:goalId/check-ins', validate(createCheckInSchema), createCheckIn);

strategicRouter.patch(
  '/key-results/:keyResultId',
  validate(updateKeyResultSchema),
  updateKeyResult,
);
strategicRouter.delete(
  '/key-results/:keyResultId',
  validate(keyResultParamsSchema),
  deleteKeyResult,
);

strategicRouter.get('/initiatives/:initiativeId', validate(initiativeParamsSchema), getInitiative);
strategicRouter.patch(
  '/initiatives/:initiativeId',
  validate(updateInitiativeSchema),
  updateInitiative,
);
strategicRouter.post(
  '/initiatives/:initiativeId/archive',
  validate(initiativeParamsSchema),
  archiveInitiative,
);
strategicRouter.post(
  '/initiatives/:initiativeId/restore',
  validate(initiativeParamsSchema),
  restoreInitiative,
);

strategicRouter.get('/portfolios/:portfolioId', validate(portfolioParamsSchema), getPortfolio);
strategicRouter.patch('/portfolios/:portfolioId', validate(updatePortfolioSchema), updatePortfolio);
strategicRouter.post(
  '/portfolios/:portfolioId/archive',
  validate(portfolioParamsSchema),
  archivePortfolio,
);
strategicRouter.post(
  '/portfolios/:portfolioId/restore',
  validate(portfolioParamsSchema),
  restorePortfolio,
);

strategicRouter.post('/strategic-links', validate(createStrategicLinkSchema), createStrategicLink);
strategicRouter.delete(
  '/strategic-links/:linkId',
  validate(strategicLinkParamsSchema),
  deleteStrategicLink,
);
