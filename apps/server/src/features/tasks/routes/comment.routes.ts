import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  createReply,
  deleteComment,
  updateComment,
} from '../controllers/task-collaboration.controller.js';
import {
  commentParamsSchema,
  createReplySchema,
  updateCommentSchema,
} from '../validation/task-collaboration.validation.js';

export const commentRouter = Router();

commentRouter.use(verifyToken);

commentRouter.patch('/:commentId', validate(updateCommentSchema), updateComment);
commentRouter.delete('/:commentId', validate(commentParamsSchema), deleteComment);
commentRouter.post('/:commentId/replies', validate(createReplySchema), createReply);
