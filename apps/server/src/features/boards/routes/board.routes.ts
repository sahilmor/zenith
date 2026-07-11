import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  archiveBoard,
  createColumn,
  getBoard,
  listColumns,
  reorderColumns,
  restoreBoard,
  updateBoard,
} from '../controllers/board.controller.js';
import {
  archiveBoardSchema,
  boardParamsSchema,
  createColumnSchema,
  reorderColumnsSchema,
  restoreBoardSchema,
  updateBoardSchema,
} from '../validation/board.validation.js';

export const boardRouter = Router();

boardRouter.use(verifyToken);

boardRouter.get('/:boardId', validate(boardParamsSchema), getBoard);
boardRouter.patch('/:boardId', validate(updateBoardSchema), updateBoard);
boardRouter.delete('/:boardId', validate(boardParamsSchema), archiveBoard);
boardRouter.post('/:boardId/archive', validate(archiveBoardSchema), archiveBoard);
boardRouter.post('/:boardId/restore', validate(restoreBoardSchema), restoreBoard);
boardRouter.post('/:boardId/columns', validate(createColumnSchema), createColumn);
boardRouter.get('/:boardId/columns', validate(boardParamsSchema), listColumns);
boardRouter.post('/:boardId/reorder-columns', validate(reorderColumnsSchema), reorderColumns);
