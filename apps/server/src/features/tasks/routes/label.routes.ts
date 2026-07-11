import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { updateLabel } from '../controllers/task-collaboration.controller.js';
import { updateLabelSchema } from '../validation/task-collaboration.validation.js';

export const labelRouter = Router();

labelRouter.use(verifyToken);

labelRouter.patch('/:labelId', validate(updateLabelSchema), updateLabel);
