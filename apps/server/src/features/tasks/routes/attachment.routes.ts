import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { deleteAttachment } from '../controllers/task-collaboration.controller.js';
import { attachmentParamsSchema } from '../validation/task-collaboration.validation.js';

export const attachmentRouter = Router();

attachmentRouter.use(verifyToken);

attachmentRouter.delete('/:attachmentId', validate(attachmentParamsSchema), deleteAttachment);
