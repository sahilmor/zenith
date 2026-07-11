import type {
  CustomFieldDefinitionSummary,
  CustomFieldType,
  CustomFieldValueSummary,
  FormSubmissionSummary,
  IntakeFormSummary,
  TaskTypeSummary,
  TaskSummary,
  TemplateSummary,
  WorkflowSummary,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { realtimeService } from '../../../sockets/realtime.service.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../utils/app-error.js';
import { ActivityService } from '../../activity/services/activity.service.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import { BoardRepository, ColumnRepository } from '../../boards/repositories/board.repository.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { SubtaskRepository, TaskRepository } from '../../tasks/repositories/task.repository.js';
import type { TaskDocument } from '../../tasks/models/task.model.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import type { CustomFieldDefinitionDocument } from '../models/custom-field-definition.model.js';
import type { FormSubmissionDocument } from '../models/form-submission.model.js';
import type { IntakeFormDocument } from '../models/intake-form.model.js';
import type { TaskTypeDocument } from '../models/task-type.model.js';
import type { TemplateDocument } from '../models/template.model.js';
import type { WorkflowDocument } from '../models/workflow.model.js';
import {
  CustomFieldRepository,
  FormSubmissionRepository,
  IntakeFormRepository,
  TaskTypeRepository,
  TemplateRepository,
  WorkflowRepository,
} from '../repositories/customization.repository.js';
import type {
  CreateCustomFieldInput,
  CreateFormInput,
  CreateTaskTypeInput,
  CreateTemplateInput,
  CreateWorkflowInput,
  SubmitPublicFormInput,
  TransitionInput,
  UpdateCustomFieldInput,
} from '../validation/customization.validation.js';

const manageRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);
const transitionRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager', 'member']);
const productionFieldTypes = new Set<CustomFieldType>([
  'short_text',
  'long_text',
  'number',
  'integer',
  'decimal',
  'currency',
  'percentage',
  'boolean',
  'checkbox',
  'single_select',
  'multi_select',
  'date',
  'datetime',
  'user',
  'multi_user',
  'email',
  'phone',
  'url',
  'duration',
  'rating',
]);

export class CustomizationService {
  public constructor(
    private readonly fields = new CustomFieldRepository(),
    private readonly taskTypes = new TaskTypeRepository(),
    private readonly workflows = new WorkflowRepository(),
    private readonly forms = new IntakeFormRepository(),
    private readonly submissions = new FormSubmissionRepository(),
    private readonly templates = new TemplateRepository(),
    private readonly tasks = new TaskRepository(),
    private readonly subtasks = new SubtaskRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly boards = new BoardRepository(),
    private readonly columns = new ColumnRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly activity = new ActivityService(),
  ) {}

  public async createField(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateCustomFieldInput,
  ): Promise<CustomFieldDefinitionSummary> {
    await this.requireManageAccess(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'custom_fields');
    await entitlementService.requireWithinLimit(workspaceId, 'customFields');
    if (!productionFieldTypes.has(input.fieldType)) {
      throw new BadRequestError(
        `${input.fieldType} fields are foundation-only and cannot be created yet`,
      );
    }
    const field = await this.fields.create({
      ...input,
      workspaceId,
      projectIds: input.projectIds.map(toObjectId),
      taskTypeIds: input.taskTypeIds.map(toObjectId),
      createdBy: userId,
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'custom_field',
      targetId: field.id,
      action: 'custom_field.created',
      metadata: { key: field.key, fieldType: field.fieldType },
    });
    this.emitConfigMutation(workspaceId, userId, 'custom_field', field.id, 'created');
    return this.toFieldSummary(field);
  }

  public async updateField(
    fieldId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateCustomFieldInput,
  ): Promise<CustomFieldDefinitionSummary> {
    const field = await this.requireField(fieldId);
    await this.requireManageAccess(field.workspaceId, userId);
    const updated = await this.fields.update(fieldId, {
      ...input,
      ...(input.projectIds ? { projectIds: input.projectIds.map(toObjectId) } : {}),
      ...(input.taskTypeIds ? { taskTypeIds: input.taskTypeIds.map(toObjectId) } : {}),
    });
    if (!updated) throw new NotFoundError('Custom field not found');
    await auditLogService.record({
      actorId: userId,
      workspaceId: updated.workspaceId,
      targetType: 'custom_field',
      targetId: updated.id,
      action: 'custom_field.updated',
      metadata: { fields: Object.keys(input) },
    });
    this.emitConfigMutation(updated.workspaceId, userId, 'custom_field', updated.id, 'updated');
    return this.toFieldSummary(updated);
  }

  public async listFields(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<CustomFieldDefinitionSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.fields.list(workspaceId)).map((field) => this.toFieldSummary(field));
  }

  public async createTaskType(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateTaskTypeInput,
  ): Promise<TaskTypeSummary> {
    await this.requireManageAccess(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'custom_fields');
    await entitlementService.requireWithinLimit(workspaceId, 'taskTypes');
    await this.ensureFieldReferences(workspaceId, [
      ...input.fieldIds.map(toObjectId),
      ...input.requiredFieldIds.map(toObjectId),
    ]);
    if (input.defaultWorkflowId)
      await this.ensureWorkflow(workspaceId, toObjectId(input.defaultWorkflowId));
    const taskType = await this.taskTypes.create({
      ...input,
      workspaceId,
      defaultWorkflowId: input.defaultWorkflowId ? toObjectId(input.defaultWorkflowId) : null,
      fieldIds: input.fieldIds.map(toObjectId),
      requiredFieldIds: input.requiredFieldIds.map(toObjectId),
      createdBy: userId,
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'task_type',
      targetId: taskType.id,
      action: 'task_type.created',
      metadata: { key: taskType.key },
    });
    this.emitConfigMutation(workspaceId, userId, 'task_type', taskType.id, 'created');
    return this.toTaskTypeSummary(taskType);
  }

  public async listTaskTypes(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskTypeSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.taskTypes.list(workspaceId)).map((taskType) =>
      this.toTaskTypeSummary(taskType),
    );
  }

  public async createWorkflow(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateWorkflowInput,
  ): Promise<WorkflowSummary> {
    await this.requireManageAccess(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'custom_workflows');
    await entitlementService.requireWithinLimit(workspaceId, 'workflows');
    await this.ensureFieldReferences(
      workspaceId,
      input.transitions.flatMap((transition) => transition.requiredFieldIds.map(toObjectId)),
    );
    await this.ensureColumnReferences(
      workspaceId,
      input.states.flatMap((state) => (state.columnId ? [toObjectId(state.columnId)] : [])),
    );
    const workflow = await this.workflows.create({
      ...input,
      workspaceId,
      states: input.states.map((state) => ({
        ...state,
        columnId: state.columnId ? toObjectId(state.columnId) : null,
      })),
      transitions: input.transitions.map((transition) => ({
        ...transition,
        requiredFieldIds: transition.requiredFieldIds.map(toObjectId),
      })),
      createdBy: userId,
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'workflow',
      targetId: workflow.id,
      action: 'workflow.created',
      metadata: { name: workflow.name, version: workflow.version },
    });
    this.emitConfigMutation(workspaceId, userId, 'workflow', workflow.id, 'created');
    return this.toWorkflowSummary(workflow);
  }

  public async listWorkflows(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkflowSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.workflows.list(workspaceId)).map((workflow) =>
      this.toWorkflowSummary(workflow),
    );
  }

  public async createForm(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateFormInput,
  ): Promise<IntakeFormSummary> {
    await this.requireManageAccess(workspaceId, userId);
    if (input.active) await entitlementService.requireWithinLimit(workspaceId, 'activeForms');
    if (input.visibility === 'public')
      await entitlementService.requireFeature(workspaceId, 'public_forms');
    await this.ensureDestination(workspaceId, {
      projectId: toObjectId(input.destinationProjectId),
      boardId: toObjectId(input.destinationBoardId),
      columnId: toObjectId(input.destinationColumnId),
    });
    if (input.destinationTaskTypeId) {
      const taskType = await this.ensureTaskType(
        workspaceId,
        toObjectId(input.destinationTaskTypeId),
      );
      if (taskType.defaultWorkflowId)
        await this.ensureWorkflow(workspaceId, taskType.defaultWorkflowId);
    }
    const form = await this.forms.create({
      ...input,
      workspaceId,
      destinationProjectId: toObjectId(input.destinationProjectId),
      destinationBoardId: toObjectId(input.destinationBoardId),
      destinationColumnId: toObjectId(input.destinationColumnId),
      destinationTaskTypeId: input.destinationTaskTypeId
        ? toObjectId(input.destinationTaskTypeId)
        : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      fields: input.fields.map((field) => ({
        ...field,
        fieldId: field.fieldId ? toObjectId(field.fieldId) : null,
      })),
      createdBy: userId,
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'form',
      targetId: form.id,
      action: 'form.created',
      metadata: { visibility: form.visibility, active: form.active },
    });
    this.emitConfigMutation(workspaceId, userId, 'form', form.id, 'created');
    return this.toFormSummary(form);
  }

  public async listForms(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<IntakeFormSummary[]> {
    await this.requireManageAccess(workspaceId, userId);
    return (await this.forms.list(workspaceId)).map((form) => this.toFormSummary(form));
  }

  public async getPublicForm(slug: string): Promise<IntakeFormSummary> {
    const form = await this.forms.findPublicBySlug(slug);
    if (!form || (form.expiresAt && form.expiresAt.getTime() < Date.now())) {
      throw new NotFoundError('Form not found');
    }
    return this.toFormSummary(form, true);
  }

  public async submitPublicForm(
    slug: string,
    input: SubmitPublicFormInput,
    submittedBy: Types.ObjectId | null = null,
  ): Promise<{ confirmationMessage: string; submission: FormSubmissionSummary }> {
    const form = await this.forms.findPublicBySlug(slug);
    if (!form || (form.expiresAt && form.expiresAt.getTime() < Date.now())) {
      throw new NotFoundError('Form not found');
    }
    const taskValues = this.valuesFromForm(form, input.values);
    const { taskService } = await import('../../tasks/services/task.service.js');
    const createInput = {
      title: taskValues.title,
      description: taskValues.description,
      priority: taskValues.priority,
      customFields: taskValues.customFields,
      status: 'open' as const,
      assigneeIds: [],
      labels: [],
    };
    const task = await taskService.createTask(
      form.destinationColumnId,
      form.createdBy,
      form.destinationTaskTypeId
        ? { ...createInput, taskTypeId: form.destinationTaskTypeId.toString() }
        : createInput,
    );
    const submission = await this.submissions.create({
      formId: form._id,
      workspaceId: form.workspaceId,
      submittedBy,
      values: this.redactPublicValues(form, input.values),
      createdTaskId: toObjectId(task.id),
      status: 'accepted',
    });
    await this.activity.record({
      workspaceId: form.workspaceId,
      actorId: submittedBy ?? form.createdBy,
      event: 'task.created',
      metadata: { taskId: task.id, formId: form.id, source: 'form' },
    });
    return {
      confirmationMessage: form.confirmationMessage,
      submission: this.toSubmissionSummary(submission),
    };
  }

  public async createTemplate(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateTemplateInput,
  ): Promise<TemplateSummary> {
    await this.requireManageAccess(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'templates');
    await entitlementService.requireWithinLimit(workspaceId, 'templates');
    const template = await this.templates.create({ ...input, workspaceId, createdBy: userId });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'template',
      targetId: template.id,
      action: 'template.created',
      metadata: { templateType: template.templateType, version: template.version },
    });
    this.emitConfigMutation(workspaceId, userId, 'template', template.id, 'created');
    return this.toTemplateSummary(template);
  }

  public async listTemplates(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TemplateSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.templates.list(workspaceId)).map((template) =>
      this.toTemplateSummary(template),
    );
  }

  public async resolveTaskCustomization(input: {
    workspaceId: Types.ObjectId;
    projectId: Types.ObjectId;
    taskTypeId?: string | null;
    customFields?: Record<string, unknown>;
  }): Promise<{
    taskTypeId: Types.ObjectId | null;
    workflowId: Types.ObjectId | null;
    workflowStateId: string | null;
    customFields: TaskCustomFieldValue[];
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    labels?: string[];
    description?: string | null;
  }> {
    const taskType = input.taskTypeId
      ? await this.ensureTaskType(input.workspaceId, toObjectId(input.taskTypeId))
      : await this.taskTypes.findDefault(input.workspaceId);
    const workflow = taskType?.defaultWorkflowId
      ? await this.ensureWorkflow(input.workspaceId, taskType.defaultWorkflowId)
      : null;
    const fields = await this.fields.listApplicable({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      taskTypeId: taskType?._id ?? null,
    });
    const taskTypeRequired = new Set((taskType?.requiredFieldIds ?? []).map((id) => id.toString()));
    const values = this.normalizeFieldValues(fields, input.customFields ?? {}, taskTypeRequired);
    const result: {
      taskTypeId: Types.ObjectId | null;
      workflowId: Types.ObjectId | null;
      workflowStateId: string | null;
      customFields: TaskCustomFieldValue[];
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      labels?: string[];
      description?: string | null;
    } = {
      taskTypeId: taskType?._id ?? null,
      workflowId: workflow?._id ?? null,
      workflowStateId: workflow?.initialStateId ?? null,
      customFields: values,
    };
    if (taskType?.defaultPriority)
      result.priority = taskType.defaultPriority as NonNullable<typeof result.priority>;
    if (taskType?.defaultLabels?.length) result.labels = taskType.defaultLabels;
    if (taskType?.descriptionTemplate) result.description = taskType.descriptionTemplate;
    return result;
  }

  public async validateTaskCustomFields(input: {
    task: TaskDocument;
    customFields: Record<string, unknown>;
  }): Promise<TaskCustomFieldValue[]> {
    const taskTypeId = input.task.taskTypeId as Types.ObjectId | null;
    const fields = await this.fields.listApplicable({
      workspaceId: input.task.workspaceId,
      projectId: input.task.projectId,
      taskTypeId,
    });
    const taskType = taskTypeId ? await this.taskTypes.findById(taskTypeId) : null;
    const required = new Set((taskType?.requiredFieldIds ?? []).map((id) => id.toString()));
    return this.normalizeFieldValues(
      fields,
      input.customFields,
      required,
      toTaskCustomFieldValues(input.task.customFields),
    );
  }

  public async validateColumnMove(input: {
    task: TaskDocument;
    targetColumnId: Types.ObjectId;
    userId: Types.ObjectId;
  }): Promise<{ workflowStateId?: string }> {
    if (!input.task.workflowId || !input.task.workflowStateId) return {};
    const workflow = await this.ensureWorkflow(input.task.workspaceId, input.task.workflowId);
    const targetState = workflow.states.find(
      (state) => state.columnId?.toString() === input.targetColumnId.toString(),
    );
    if (!targetState || targetState.id === input.task.workflowStateId) return {};
    const transition = workflow.transitions.find(
      (item) =>
        item.fromStateId === input.task.workflowStateId && item.toStateId === targetState.id,
    );
    if (!transition) {
      throw new ConflictError(`Workflow does not allow moving task to ${targetState.name}`);
    }
    await this.validateTransitionRules(input.task, workflow, transition.id, input.userId, {});
    return { workflowStateId: targetState.id };
  }

  public async transitionTask(
    taskId: Types.ObjectId,
    transitionId: string,
    userId: Types.ObjectId,
    input: TransitionInput,
  ): Promise<TaskSummary> {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    await this.requireWorkspaceRole(task.workspaceId, userId, transitionRoles);
    if (!task.workflowId || !task.workflowStateId)
      throw new BadRequestError('Task has no workflow');
    const workflow = await this.ensureWorkflow(task.workspaceId, task.workflowId);
    const transition = await this.validateTransitionRules(
      task,
      workflow,
      transitionId,
      userId,
      input.customFields,
    );
    const customFields = Object.keys(input.customFields).length
      ? await this.validateTaskCustomFields({ task, customFields: input.customFields })
      : task.customFields;
    const nextState = workflow.states.find((state) => state.id === transition.toStateId);
    const update: Record<string, unknown> = {
      workflowStateId: transition.toStateId,
      customFields,
    };
    if (nextState?.columnId) update.columnId = nextState.columnId;
    if (nextState?.category === 'done') update.status = 'done';
    else if (nextState?.category === 'in_progress') update.status = 'in_progress';
    const updated = await this.tasks.update(taskId, update);
    if (!updated) throw new NotFoundError('Task not found');
    await this.activity.record({
      workspaceId: updated.workspaceId,
      actorId: userId,
      event: 'task.updated',
      metadata: { taskId: updated.id, workflowTransitionId: transition.id },
    });
    realtimeService.emitMutation({
      resource: 'task',
      action: 'updated',
      workspaceId: updated.workspaceId.toString(),
      projectId: updated.projectId.toString(),
      boardId: updated.boardId.toString(),
      taskId: updated.id,
      actorId: userId.toString(),
      data: null,
    });
    const { taskService } = await import('../../tasks/services/task.service.js');
    return taskService.getTask(updated._id, userId);
  }

  private async validateTransitionRules(
    task: TaskDocument,
    workflow: WorkflowDocument,
    transitionId: string,
    userId: Types.ObjectId,
    incomingFields: Record<string, unknown>,
  ) {
    const transition = workflow.transitions.find(
      (item) => item.id === transitionId && item.fromStateId === task.workflowStateId,
    );
    if (!transition) throw new ConflictError('Invalid workflow transition');
    if (transition.requiredRoles.length > 0) {
      const membership = await this.workspaces.findMembership(task.workspaceId, userId);
      if (!membership || !transition.requiredRoles.includes(membership.role)) {
        throw new ForbiddenError('You do not have permission to execute this transition');
      }
    }
    if (
      transition.requireAssignee &&
      !task.assigneeIds.some((id) => id.toString() === userId.toString())
    ) {
      throw new ForbiddenError('Only an assignee can execute this transition');
    }
    if (transition.requireReporter && task.reporterId.toString() !== userId.toString()) {
      throw new ForbiddenError('Only the reporter can execute this transition');
    }
    if (transition.requireAllSubtasksComplete) {
      const subtasks = await this.subtasks.listByTask(task._id);
      const incomplete = subtasks.filter((subtask) => !subtask.completed);
      if (incomplete.length > 0)
        throw new ConflictError(`${incomplete.length} subtasks are incomplete`);
    }
    const mergedValues = new Map(
      toTaskCustomFieldValues(task.customFields).map((value) => [value.fieldId.toString(), value]),
    );
    const normalizedIncoming = Object.keys(incomingFields).length
      ? await this.validateTaskCustomFields({ task, customFields: incomingFields })
      : [];
    normalizedIncoming.forEach((value) => mergedValues.set(value.fieldId.toString(), value));
    const missing = transition.requiredFieldIds.filter((fieldId) => {
      const value = mergedValues.get(fieldId.toString());
      return !value || valueIsEmpty(value);
    });
    if (missing.length > 0) throw new ConflictError('Required custom fields are missing');
    return transition;
  }

  private normalizeFieldValues(
    fields: CustomFieldDefinitionDocument[],
    rawValues: Record<string, unknown>,
    requiredFieldIds: Set<string>,
    existing: readonly TaskCustomFieldValue[] = [],
  ): TaskCustomFieldValue[] {
    const byKey = new Map(fields.map((field) => [field.key, field]));
    const byId = new Map(fields.map((field) => [field.id, field]));
    const current = new Map(existing.map((value) => [value.fieldId.toString(), value]));
    for (const [key, value] of Object.entries(rawValues)) {
      const field = byKey.get(key) ?? byId.get(key);
      if (!field) throw new BadRequestError(`Unknown custom field: ${key}`);
      current.set(field.id, this.normalizeValue(field, value));
    }
    for (const field of fields) {
      if (current.has(field.id)) continue;
      const defaultValue = field.defaultValue;
      if (defaultValue !== undefined && defaultValue !== null) {
        current.set(field.id, this.normalizeValue(field, defaultValue));
      }
    }
    for (const field of fields) {
      if (!field.required && !requiredFieldIds.has(field.id)) continue;
      const value = current.get(field.id);
      if (!value || valueIsEmpty(value)) throw new BadRequestError(`${field.name} is required`);
    }
    return [...current.values()];
  }

  private normalizeValue(
    field: CustomFieldDefinitionDocument,
    value: unknown,
  ): TaskCustomFieldValue {
    const base = {
      fieldId: field._id,
      key: field.key,
      fieldType: field.fieldType as CustomFieldType,
      stringValue: null,
      numberValue: null,
      booleanValue: null,
      dateValue: null,
      userIdValue: null,
      optionIdValue: null,
      arrayValue: [],
    };
    if (value === null || value === undefined || value === '') return base;
    if (['short_text', 'long_text', 'email', 'phone', 'url'].includes(field.fieldType)) {
      const stringValue = String(value).trim();
      if (field.validation?.minLength && stringValue.length < field.validation.minLength) {
        throw new BadRequestError(`${field.name} is too short`);
      }
      if (field.validation?.maxLength && stringValue.length > field.validation.maxLength) {
        throw new BadRequestError(`${field.name} is too long`);
      }
      if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(stringValue)) {
        throw new BadRequestError(`${field.name} format is invalid`);
      }
      return { ...base, stringValue };
    }
    if (
      ['number', 'integer', 'decimal', 'currency', 'percentage', 'duration', 'rating'].includes(
        field.fieldType,
      )
    ) {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue))
        throw new BadRequestError(`${field.name} must be a number`);
      if (field.fieldType === 'integer' && !Number.isInteger(numberValue)) {
        throw new BadRequestError(`${field.name} must be an integer`);
      }
      const min = field.validation?.min;
      const max = field.validation?.max;
      if (min !== undefined && min !== null && numberValue < min) {
        throw new BadRequestError(`${field.name} is below minimum`);
      }
      if (max !== undefined && max !== null && numberValue > max) {
        throw new BadRequestError(`${field.name} is above maximum`);
      }
      return { ...base, numberValue };
    }
    if (['boolean', 'checkbox'].includes(field.fieldType))
      return { ...base, booleanValue: Boolean(value) };
    if (['date', 'datetime'].includes(field.fieldType)) {
      const dateValue = new Date(String(value));
      if (Number.isNaN(dateValue.getTime()))
        throw new BadRequestError(`${field.name} must be a date`);
      return { ...base, dateValue };
    }
    if (field.fieldType === 'single_select') {
      const optionId = String(value);
      this.ensureOption(field, optionId);
      return { ...base, optionIdValue: optionId };
    }
    if (field.fieldType === 'multi_select') {
      const values = Array.isArray(value) ? value.map(String) : String(value).split(',');
      values.forEach((optionId) => this.ensureOption(field, optionId));
      return { ...base, arrayValue: values };
    }
    if (field.fieldType === 'user') return { ...base, userIdValue: toObjectId(String(value)) };
    if (field.fieldType === 'multi_user') {
      const values = Array.isArray(value) ? value.map(String) : String(value).split(',');
      values.forEach((id) => toObjectId(id));
      return { ...base, arrayValue: values };
    }
    throw new BadRequestError(`${field.fieldType} fields are foundation-only`);
  }

  private ensureOption(field: CustomFieldDefinitionDocument, optionId: string): void {
    if (!field.options.some((option) => option.id === optionId && !option.archived)) {
      throw new BadRequestError(`${field.name} option is invalid`);
    }
  }

  private valuesFromForm(form: IntakeFormDocument, values: Record<string, unknown>) {
    let title = 'Untitled request';
    let description: string | null = null;
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    const customFields: Record<string, unknown> = {};
    for (const field of form.fields) {
      const rawValue = values[field.id] ?? field.defaultValue;
      if (field.required && (rawValue === undefined || rawValue === null || rawValue === '')) {
        throw new BadRequestError(`${field.label} is required`);
      }
      if (field.fieldType === 'title') title = String(rawValue || title).trim();
      else if (field.fieldType === 'description') description = rawValue ? String(rawValue) : null;
      else if (field.fieldType === 'priority' && rawValue)
        priority = String(rawValue) as typeof priority;
      else if (field.fieldId) customFields[field.fieldId.toString()] = rawValue;
    }
    if (title.length < 2) throw new BadRequestError('Title is required');
    return { title, description, priority, customFields };
  }

  private redactPublicValues(
    form: IntakeFormDocument,
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    const allowed = new Set(form.fields.map((field) => field.id));
    return Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
  }

  private async requireField(fieldId: Types.ObjectId): Promise<CustomFieldDefinitionDocument> {
    const field = await this.fields.findById(fieldId);
    if (!field) throw new NotFoundError('Custom field not found');
    return field;
  }

  private async ensureFieldReferences(
    workspaceId: Types.ObjectId,
    fieldIds: Types.ObjectId[],
  ): Promise<void> {
    if (fieldIds.length === 0) return;
    const fields = await this.fields.listByIds(workspaceId, fieldIds);
    if (fields.length !== new Set(fieldIds.map(String)).size)
      throw new BadRequestError('Invalid custom field reference');
  }

  private async ensureTaskType(
    workspaceId: Types.ObjectId,
    taskTypeId: Types.ObjectId,
  ): Promise<TaskTypeDocument> {
    const taskType = await this.taskTypes.findById(taskTypeId);
    if (!taskType || taskType.workspaceId.toString() !== workspaceId.toString()) {
      throw new NotFoundError('Task type not found');
    }
    return taskType;
  }

  private async ensureWorkflow(
    workspaceId: Types.ObjectId,
    workflowId: Types.ObjectId,
  ): Promise<WorkflowDocument> {
    const workflow = await this.workflows.findById(workflowId);
    if (!workflow || workflow.workspaceId.toString() !== workspaceId.toString()) {
      throw new NotFoundError('Workflow not found');
    }
    return workflow;
  }

  private async ensureColumnReferences(
    workspaceId: Types.ObjectId,
    columnIds: Types.ObjectId[],
  ): Promise<void> {
    for (const columnId of columnIds) {
      const column = await this.columns.findById(columnId);
      if (!column) throw new NotFoundError('Column not found');
      const board = await this.boards.findById(column.boardId);
      if (!board || board.workspaceId.toString() !== workspaceId.toString()) {
        throw new BadRequestError('Workflow column must belong to the workspace');
      }
    }
  }

  private async ensureDestination(
    workspaceId: Types.ObjectId,
    input: { projectId: Types.ObjectId; boardId: Types.ObjectId; columnId: Types.ObjectId },
  ): Promise<void> {
    const [project, board, column] = await Promise.all([
      this.projects.findById(input.projectId),
      this.boards.findById(input.boardId),
      this.columns.findById(input.columnId),
    ]);
    if (!project || project.workspaceId.toString() !== workspaceId.toString())
      throw new BadRequestError('Invalid form project');
    if (!board || board.workspaceId.toString() !== workspaceId.toString())
      throw new BadRequestError('Invalid form board');
    if (!column || column.boardId.toString() !== board.id)
      throw new BadRequestError('Invalid form column');
  }

  private async requireWorkspaceMembership(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access required');
    return membership;
  }

  private async requireWorkspaceRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    roles: Set<WorkspaceRole>,
  ) {
    const membership = await this.requireWorkspaceMembership(workspaceId, userId);
    if (!roles.has(membership.role)) throw new ForbiddenError('Insufficient workspace role');
    return membership;
  }

  private async requireManageAccess(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    return this.requireWorkspaceRole(workspaceId, userId, manageRoles);
  }

  private emitConfigMutation(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    resource: string,
    resourceId: string,
    action: 'created' | 'updated',
  ) {
    realtimeService.emitMutation({
      resource: 'workspace',
      action,
      workspaceId: workspaceId.toString(),
      actorId: actorId.toString(),
      data: { resource, id: resourceId },
    });
  }

  private toFieldSummary(field: CustomFieldDefinitionDocument): CustomFieldDefinitionSummary {
    return {
      id: field.id,
      workspaceId: field.workspaceId.toString(),
      projectIds: field.projectIds.map(String),
      taskTypeIds: field.taskTypeIds.map(String),
      key: field.key,
      name: field.name,
      description: field.description ?? null,
      fieldType: field.fieldType as CustomFieldType,
      required: field.required,
      defaultValue: field.defaultValue,
      options: field.options.map((option) => ({
        id: option.id,
        label: option.label,
        color: option.color ?? null,
        description: option.description ?? null,
        order: option.order,
        archived: option.archived,
      })),
      validation: compactValidation(field.validation),
      visibility: field.visibility as 'always' | 'internal',
      searchable: field.searchable,
      filterable: field.filterable,
      sortable: field.sortable,
      groupable: field.groupable,
      analyticsEnabled: field.analyticsEnabled,
      archived: field.archived,
      createdBy: field.createdBy.toString(),
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString(),
    };
  }

  private toTaskTypeSummary(taskType: TaskTypeDocument): TaskTypeSummary {
    return {
      id: taskType.id,
      workspaceId: taskType.workspaceId.toString(),
      name: taskType.name,
      key: taskType.key,
      description: taskType.description ?? null,
      icon: taskType.icon ?? null,
      color: taskType.color,
      category: taskType.category as TaskTypeSummary['category'],
      defaultWorkflowId: taskType.defaultWorkflowId?.toString() ?? null,
      fieldIds: taskType.fieldIds.map(String),
      requiredFieldIds: taskType.requiredFieldIds.map(String),
      defaultPriority: taskType.defaultPriority as TaskTypeSummary['defaultPriority'],
      defaultLabels: taskType.defaultLabels,
      descriptionTemplate: taskType.descriptionTemplate ?? null,
      archived: taskType.archived,
      createdBy: taskType.createdBy.toString(),
      createdAt: taskType.createdAt.toISOString(),
      updatedAt: taskType.updatedAt.toISOString(),
    };
  }

  private toWorkflowSummary(workflow: WorkflowDocument): WorkflowSummary {
    return {
      id: workflow.id,
      workspaceId: workflow.workspaceId.toString(),
      name: workflow.name,
      description: workflow.description ?? null,
      states: workflow.states.map((state) => ({
        id: state.id,
        name: state.name,
        category: state.category as WorkflowSummary['states'][number]['category'],
        color: state.color,
        description: state.description ?? null,
        order: state.order,
        terminal: state.terminal,
        columnId: state.columnId?.toString() ?? null,
      })),
      transitions: workflow.transitions.map((transition) => ({
        id: transition.id,
        name: transition.name,
        fromStateId: transition.fromStateId,
        toStateId: transition.toStateId,
        requiredRoles: transition.requiredRoles as WorkspaceRole[],
        requiredFieldIds: transition.requiredFieldIds.map(String),
        requireAssignee: transition.requireAssignee,
        requireReporter: transition.requireReporter,
        requireAllSubtasksComplete: transition.requireAllSubtasksComplete,
      })),
      initialStateId: workflow.initialStateId,
      terminalStateIds: workflow.states.filter((state) => state.terminal).map((state) => state.id),
      version: workflow.version,
      active: workflow.active,
      archived: workflow.archived,
      createdBy: workflow.createdBy.toString(),
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    };
  }

  private toFormSummary(form: IntakeFormDocument, publicSafe = false): IntakeFormSummary {
    return {
      id: form.id,
      workspaceId: publicSafe ? '' : form.workspaceId.toString(),
      name: form.name,
      description: form.description ?? null,
      visibility: form.visibility as 'internal' | 'public',
      slug: form.slug,
      destinationProjectId: publicSafe ? '' : form.destinationProjectId.toString(),
      destinationBoardId: publicSafe ? '' : form.destinationBoardId.toString(),
      destinationColumnId: publicSafe ? '' : form.destinationColumnId.toString(),
      destinationTaskTypeId: publicSafe ? null : (form.destinationTaskTypeId?.toString() ?? null),
      active: form.active,
      expiresAt: form.expiresAt?.toISOString() ?? null,
      fields: form.fields
        .filter((field) => !publicSafe || !field.hidden)
        .map((field) => ({
          id: field.id,
          fieldId: publicSafe ? null : (field.fieldId?.toString() ?? null),
          label: field.label,
          fieldType: field.fieldType as IntakeFormSummary['fields'][number]['fieldType'],
          required: field.required,
          order: field.order,
          instructions: field.instructions ?? null,
          hidden: field.hidden,
          defaultValue: publicSafe ? null : field.defaultValue,
        })),
      confirmationMessage: form.confirmationMessage,
      createdBy: publicSafe ? '' : form.createdBy.toString(),
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    };
  }

  private toSubmissionSummary(submission: FormSubmissionDocument): FormSubmissionSummary {
    return {
      id: submission.id,
      formId: submission.formId.toString(),
      workspaceId: submission.workspaceId.toString(),
      submittedBy: submission.submittedBy?.toString() ?? null,
      createdTaskId: submission.createdTaskId?.toString() ?? null,
      status: submission.status as 'accepted' | 'failed',
      createdAt: submission.createdAt.toISOString(),
    };
  }

  private toTemplateSummary(template: TemplateDocument): TemplateSummary {
    return {
      id: template.id,
      workspaceId: template.workspaceId.toString(),
      name: template.name,
      description: template.description ?? null,
      templateType: template.templateType as TemplateSummary['templateType'],
      version: template.version,
      active: template.active,
      archived: template.archived,
      createdBy: template.createdBy.toString(),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
}

export interface TaskCustomFieldValue {
  fieldId: Types.ObjectId;
  key: string;
  fieldType: CustomFieldType;
  stringValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
  dateValue: Date | null;
  userIdValue: Types.ObjectId | null;
  optionIdValue: string | null;
  arrayValue: string[];
}

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);

const toTaskCustomFieldValues = (values: readonly unknown[]): TaskCustomFieldValue[] =>
  values.map((value) => {
    const item = value as Partial<TaskCustomFieldValue>;
    return {
      fieldId:
        item.fieldId instanceof Types.ObjectId
          ? item.fieldId
          : new Types.ObjectId(String(item.fieldId)),
      key: String(item.key),
      fieldType: item.fieldType as CustomFieldType,
      stringValue: item.stringValue ?? null,
      numberValue: item.numberValue ?? null,
      booleanValue: item.booleanValue ?? null,
      dateValue: item.dateValue ? new Date(item.dateValue) : null,
      userIdValue:
        item.userIdValue instanceof Types.ObjectId
          ? item.userIdValue
          : item.userIdValue
            ? new Types.ObjectId(String(item.userIdValue))
            : null,
      optionIdValue: item.optionIdValue ?? null,
      arrayValue: item.arrayValue ?? [],
    };
  });

const compactValidation = (
  validation: CustomFieldDefinitionDocument['validation'] | undefined,
): CustomFieldDefinitionSummary['validation'] => {
  if (!validation) return {};
  const rawValidation =
    'toObject' in validation && typeof validation.toObject === 'function'
      ? validation.toObject()
      : validation;
  const entries = Object.entries(rawValidation).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  return Object.fromEntries(entries) as CustomFieldDefinitionSummary['validation'];
};

const valueIsEmpty = (value: TaskCustomFieldValue): boolean =>
  value.stringValue === null &&
  value.numberValue === null &&
  value.booleanValue === null &&
  value.dateValue === null &&
  value.userIdValue === null &&
  value.optionIdValue === null &&
  value.arrayValue.length === 0;

export const customFieldValueToSummary = (value: TaskCustomFieldValue): CustomFieldValueSummary => {
  let actualValue: unknown = null;
  if (value.stringValue !== null) actualValue = value.stringValue;
  else if (value.numberValue !== null) actualValue = value.numberValue;
  else if (value.booleanValue !== null) actualValue = value.booleanValue;
  else if (value.dateValue !== null) actualValue = value.dateValue.toISOString();
  else if (value.userIdValue !== null) actualValue = value.userIdValue.toString();
  else if (value.optionIdValue !== null) actualValue = value.optionIdValue;
  else if (value.arrayValue.length > 0) actualValue = value.arrayValue;
  return {
    fieldId: value.fieldId.toString(),
    key: value.key,
    fieldType: value.fieldType,
    value: actualValue,
  };
};

export const customizationService = new CustomizationService();
