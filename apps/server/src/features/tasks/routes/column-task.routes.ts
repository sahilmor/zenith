import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { createTask, listTasks } from '../controllers/task.controller.js';
import { columnTaskParamsSchema, createTaskSchema } from '../validation/task.validation.js';

export const columnTaskRouter = Router();

columnTaskRouter.use(verifyToken);

columnTaskRouter.post('/:columnId/tasks', validate(createTaskSchema), createTask);
columnTaskRouter.get('/:columnId/tasks', validate(columnTaskParamsSchema), listTasks);
