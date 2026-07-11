import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { deleteSubtask, updateSubtask } from '../controllers/task.controller.js';
import { subtaskParamsSchema, updateSubtaskSchema } from '../validation/task.validation.js';

export const subtaskRouter = Router();

subtaskRouter.use(verifyToken);

subtaskRouter.patch('/:subtaskId', validate(updateSubtaskSchema), updateSubtask);
subtaskRouter.delete('/:subtaskId', validate(subtaskParamsSchema), deleteSubtask);
