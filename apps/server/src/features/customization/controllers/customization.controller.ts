import { Types } from 'mongoose';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { customizationService } from '../services/customization.service.js';

const requireUserId = (request: { user?: { userId: string } }): Types.ObjectId => {
  if (!request.user?.userId) throw new UnauthorizedError('Authentication required');
  return new Types.ObjectId(request.user.userId);
};

const requireParam = (value: string | undefined, name: string): string => {
  if (!value) throw new BadRequestError(`${name} is required`);
  return value;
};

export const listCustomFields = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Custom fields retrieved',
    await customizationService.listFields(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const createCustomField = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Custom field created',
    await customizationService.createField(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const updateCustomField = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Custom field updated',
    await customizationService.updateField(
      new Types.ObjectId(request.params.fieldId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const listTaskTypes = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Task types retrieved',
    await customizationService.listTaskTypes(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const createTaskType = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Task type created',
    await customizationService.createTaskType(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const listWorkflows = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Workflows retrieved',
    await customizationService.listWorkflows(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const createWorkflow = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Workflow created',
    await customizationService.createWorkflow(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const transitionTask = asyncHandler(async (request, response) => {
  const task = await customizationService.transitionTask(
    new Types.ObjectId(request.params.taskId),
    requireParam(request.params.transitionId, 'transitionId'),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Workflow transition completed', task);
});

export const listForms = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Forms retrieved',
    await customizationService.listForms(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const createForm = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Form created',
    await customizationService.createForm(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
      request.body,
    ),
  );
});

export const getPublicForm = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Form retrieved',
    await customizationService.getPublicForm(requireParam(request.params.slug, 'slug')),
  );
});

export const submitPublicForm = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Form submitted',
    await customizationService.submitPublicForm(
      requireParam(request.params.slug, 'slug'),
      request.body,
    ),
  );
});

export const listTemplates = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Templates retrieved',
    await customizationService.listTemplates(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const createTemplate = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Template created',
    await customizationService.createTemplate(
      new Types.ObjectId(request.params.workspaceId),
      requireUserId(request),
      request.body,
    ),
  );
});
