import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { deleteColumn, updateColumn } from '../controllers/board.controller.js';
import { columnParamsSchema, updateColumnSchema } from '../validation/board.validation.js';

export const columnRouter = Router();

columnRouter.use(verifyToken);

columnRouter.patch('/:columnId', validate(updateColumnSchema), updateColumn);
columnRouter.delete('/:columnId', validate(columnParamsSchema), deleteColumn);
