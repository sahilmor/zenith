import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { attachmentUpload } from '../../../middleware/upload.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  createComment,
  createLabel,
  listActivity,
  listAttachments,
  listComments,
  listLabels,
  removeLabel,
  unwatchTask,
  uploadAttachment,
  watchTask,
} from '../controllers/task-collaboration.controller.js';
import {
  archiveTask,
  bulkUpdateTasks,
  createSubtask,
  deleteTask,
  getTask,
  listAdvancedTasks,
  listSubtasks,
  reorderTasks,
  restoreTask,
  updateTask,
} from '../controllers/task.controller.js';
import {
  createCommentSchema,
  createLabelSchema,
  taskLabelParamsSchema,
  taskParamsSchema as collaborationTaskParamsSchema,
} from '../validation/task-collaboration.validation.js';
import {
  archiveTaskSchema,
  bulkUpdateTasksSchema,
  createSubtaskSchema,
  listTasksSchema,
  reorderTasksSchema,
  restoreTaskSchema,
  taskParamsSchema,
  updateTaskSchema,
} from '../validation/task.validation.js';

export const taskRouter = Router();

taskRouter.use(verifyToken);

taskRouter.get('/', validate(listTasksSchema), listAdvancedTasks);
taskRouter.patch('/bulk', validate(bulkUpdateTasksSchema), bulkUpdateTasks);
taskRouter.post('/reorder', validate(reorderTasksSchema), reorderTasks);
taskRouter.get('/:taskId', validate(taskParamsSchema), getTask);
taskRouter.patch('/:taskId', validate(updateTaskSchema), updateTask);
taskRouter.delete('/:taskId', validate(taskParamsSchema), deleteTask);
taskRouter.post('/:taskId/archive', validate(archiveTaskSchema), archiveTask);
taskRouter.post('/:taskId/restore', validate(restoreTaskSchema), restoreTask);
taskRouter.post('/:taskId/subtasks', validate(createSubtaskSchema), createSubtask);
taskRouter.get('/:taskId/subtasks', validate(taskParamsSchema), listSubtasks);
taskRouter.post('/:taskId/comments', validate(createCommentSchema), createComment);
taskRouter.get('/:taskId/comments', validate(collaborationTaskParamsSchema), listComments);
taskRouter.post(
  '/:taskId/attachments',
  validate(collaborationTaskParamsSchema),
  attachmentUpload.single('file'),
  uploadAttachment,
);
taskRouter.get('/:taskId/attachments', validate(collaborationTaskParamsSchema), listAttachments);
taskRouter.get('/:taskId/activity', validate(collaborationTaskParamsSchema), listActivity);
taskRouter.post('/:taskId/watch', validate(collaborationTaskParamsSchema), watchTask);
taskRouter.delete('/:taskId/watch', validate(collaborationTaskParamsSchema), unwatchTask);
taskRouter.get('/:taskId/labels', validate(collaborationTaskParamsSchema), listLabels);
taskRouter.post('/:taskId/labels', validate(createLabelSchema), createLabel);
taskRouter.delete('/:taskId/labels/:labelId', validate(taskLabelParamsSchema), removeLabel);
