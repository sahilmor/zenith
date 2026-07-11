import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  exportReport,
  getBoardAnalytics,
  getDashboardAnalytics,
  getProjectAnalytics,
  getUserAnalytics,
  getWorkspaceAnalytics,
} from '../controllers/analytics.controller.js';
import {
  analyticsDashboardSchema,
  boardAnalyticsSchema,
  projectAnalyticsSchema,
  reportSchema,
  userAnalyticsSchema,
  workspaceAnalyticsSchema,
} from '../validation/analytics.validation.js';

export const analyticsRouter = Router();

analyticsRouter.use(verifyToken);

analyticsRouter.get('/dashboard', validate(analyticsDashboardSchema), getDashboardAnalytics);
analyticsRouter.get(
  '/workspace/:workspaceId',
  validate(workspaceAnalyticsSchema),
  getWorkspaceAnalytics,
);
analyticsRouter.get('/projects/:projectId', validate(projectAnalyticsSchema), getProjectAnalytics);
analyticsRouter.get('/boards/:boardId', validate(boardAnalyticsSchema), getBoardAnalytics);
analyticsRouter.get('/users/:userId', validate(userAnalyticsSchema), getUserAnalytics);
analyticsRouter.get('/reports', validate(reportSchema), exportReport);
