import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  archiveProject,
  deleteProject,
  getProject,
  restoreProject,
  updateProject,
} from '../controllers/project.controller.js';
import {
  archiveProjectSchema,
  projectParamsSchema,
  restoreProjectSchema,
  updateProjectSchema,
} from '../validation/project.validation.js';
import { createBoard, listBoards } from '../../boards/controllers/board.controller.js';
import {
  createBoardSchema,
  projectBoardParamsSchema,
} from '../../boards/validation/board.validation.js';

export const projectRouter = Router();

projectRouter.use(verifyToken);

projectRouter.post('/:projectId/boards', validate(createBoardSchema), createBoard);
projectRouter.get('/:projectId/boards', validate(projectBoardParamsSchema), listBoards);
projectRouter.get('/:projectId', validate(projectParamsSchema), getProject);
projectRouter.patch('/:projectId', validate(updateProjectSchema), updateProject);
projectRouter.delete('/:projectId', validate(projectParamsSchema), deleteProject);
projectRouter.post('/:projectId/archive', validate(archiveProjectSchema), archiveProject);
projectRouter.post('/:projectId/restore', validate(restoreProjectSchema), restoreProject);
