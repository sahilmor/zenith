import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  createCustomField,
  createForm,
  createTaskType,
  createTemplate,
  createWorkflow,
  getPublicForm,
  listCustomFields,
  listForms,
  listTaskTypes,
  listTemplates,
  listWorkflows,
  submitPublicForm,
  transitionTask,
  updateCustomField,
} from '../controllers/customization.controller.js';
import {
  createCustomFieldRouteSchema,
  createFormRouteSchema,
  createTaskTypeRouteSchema,
  createTemplateRouteSchema,
  createWorkflowRouteSchema,
  publicFormParamsRouteSchema,
  submitPublicFormRouteSchema,
  transitionParamsRouteSchema,
  updateCustomFieldRouteSchema,
  workspaceCustomizationParamsSchema,
} from '../validation/customization.validation.js';

export const customizationRouter = Router();
export const publicCustomizationRouter = Router();

publicCustomizationRouter.get('/forms/:slug', validate(publicFormParamsRouteSchema), getPublicForm);
publicCustomizationRouter.post(
  '/forms/:slug/submissions',
  validate(submitPublicFormRouteSchema),
  submitPublicForm,
);

customizationRouter.use(verifyToken);
customizationRouter.get(
  '/workspaces/:workspaceId/custom-fields',
  validate(workspaceCustomizationParamsSchema),
  listCustomFields,
);
customizationRouter.post(
  '/workspaces/:workspaceId/custom-fields',
  validate(createCustomFieldRouteSchema),
  createCustomField,
);
customizationRouter.patch(
  '/custom-fields/:fieldId',
  validate(updateCustomFieldRouteSchema),
  updateCustomField,
);
customizationRouter.get(
  '/workspaces/:workspaceId/task-types',
  validate(workspaceCustomizationParamsSchema),
  listTaskTypes,
);
customizationRouter.post(
  '/workspaces/:workspaceId/task-types',
  validate(createTaskTypeRouteSchema),
  createTaskType,
);
customizationRouter.get(
  '/workspaces/:workspaceId/workflows',
  validate(workspaceCustomizationParamsSchema),
  listWorkflows,
);
customizationRouter.post(
  '/workspaces/:workspaceId/workflows',
  validate(createWorkflowRouteSchema),
  createWorkflow,
);
customizationRouter.post(
  '/tasks/:taskId/transitions/:transitionId',
  validate(transitionParamsRouteSchema),
  transitionTask,
);
customizationRouter.get(
  '/workspaces/:workspaceId/forms',
  validate(workspaceCustomizationParamsSchema),
  listForms,
);
customizationRouter.post(
  '/workspaces/:workspaceId/forms',
  validate(createFormRouteSchema),
  createForm,
);
customizationRouter.get(
  '/workspaces/:workspaceId/templates',
  validate(workspaceCustomizationParamsSchema),
  listTemplates,
);
customizationRouter.post(
  '/workspaces/:workspaceId/templates',
  validate(createTemplateRouteSchema),
  createTemplate,
);
