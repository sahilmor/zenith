import { Router } from 'express';
import { aiRouter } from '../features/ai/routes/ai.routes.js';
import { analyticsRouter } from '../features/analytics/routes/analytics.routes.js';
import { authRouter } from '../features/auth/routes/auth.routes.js';
import { billingRouter } from '../features/billing/routes/billing.routes.js';
import { boardRouter } from '../features/boards/routes/board.routes.js';
import {
  customizationRouter,
  publicCustomizationRouter,
} from '../features/customization/routes/customization.routes.js';
import { notificationRouter } from '../features/notifications/routes/notification.routes.js';
import { opsRouter } from '../features/ops/routes/ops.routes.js';
import { publicApiRouter } from '../features/public-api/routes/public-api.routes.js';
import { strategicRouter } from '../features/strategic/routes/strategic.routes.js';
import { columnRouter } from '../features/boards/routes/column.routes.js';
import { projectRouter } from '../features/projects/routes/project.routes.js';
import { attachmentRouter } from '../features/tasks/routes/attachment.routes.js';
import { columnTaskRouter } from '../features/tasks/routes/column-task.routes.js';
import { commentRouter } from '../features/tasks/routes/comment.routes.js';
import { labelRouter } from '../features/tasks/routes/label.routes.js';
import { subtaskRouter } from '../features/tasks/routes/subtask.routes.js';
import { taskRouter } from '../features/tasks/routes/task.routes.js';
import { workspaceRouter } from '../features/workspaces/routes/workspace.routes.js';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/', billingRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/ops', opsRouter);
apiRouter.use('/v1', publicApiRouter);
apiRouter.use('/public', publicCustomizationRouter);
apiRouter.use('/', customizationRouter);
apiRouter.use('/', strategicRouter);
apiRouter.use('/workspaces', workspaceRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/boards', boardRouter);
apiRouter.use('/columns', columnRouter);
apiRouter.use('/columns', columnTaskRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/subtasks', subtaskRouter);
apiRouter.use('/comments', commentRouter);
apiRouter.use('/attachments', attachmentRouter);
apiRouter.use('/labels', labelRouter);
