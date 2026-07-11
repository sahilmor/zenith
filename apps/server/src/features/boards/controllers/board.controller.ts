import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { BoardService } from '../services/board.service.js';

const boardService = new BoardService();

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

export const createBoard: RequestHandler = asyncHandler(async (request, response) => {
  const board = await boardService.createBoard(
    paramObjectId(request.params.projectId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Board created', board);
});

export const listBoards: RequestHandler = asyncHandler(async (request, response) => {
  const boards = await boardService.listBoards(
    paramObjectId(request.params.projectId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Boards retrieved', boards);
});

export const getBoard: RequestHandler = asyncHandler(async (request, response) => {
  const board = await boardService.getBoard(
    paramObjectId(request.params.boardId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Board retrieved', board);
});

export const updateBoard: RequestHandler = asyncHandler(async (request, response) => {
  const board = await boardService.updateBoard(
    paramObjectId(request.params.boardId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Board updated', board);
});

export const archiveBoard: RequestHandler = asyncHandler(async (request, response) => {
  const board = await boardService.archiveBoard(
    paramObjectId(request.params.boardId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Board archived', board);
});

export const restoreBoard: RequestHandler = asyncHandler(async (request, response) => {
  const board = await boardService.restoreBoard(
    paramObjectId(request.params.boardId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Board restored', board);
});

export const createColumn: RequestHandler = asyncHandler(async (request, response) => {
  const column = await boardService.createColumn(
    paramObjectId(request.params.boardId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Column created', column);
});

export const listColumns: RequestHandler = asyncHandler(async (request, response) => {
  const columns = await boardService.listColumns(
    paramObjectId(request.params.boardId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Columns retrieved', columns);
});

export const updateColumn: RequestHandler = asyncHandler(async (request, response) => {
  const column = await boardService.updateColumn(
    paramObjectId(request.params.columnId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Column updated', column);
});

export const deleteColumn: RequestHandler = asyncHandler(async (request, response) => {
  await boardService.deleteColumn(paramObjectId(request.params.columnId), requireUserId(request));
  sendSuccess(response, 200, 'Column deleted');
});

export const reorderColumns: RequestHandler = asyncHandler(async (request, response) => {
  const columns = await boardService.reorderColumns(
    paramObjectId(request.params.boardId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Columns reordered', columns);
});
