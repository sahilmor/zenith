import type { FilterQuery, Types } from 'mongoose';
import {
  CustomFieldDefinitionModel,
  type CustomFieldDefinitionDocument,
} from '../models/custom-field-definition.model.js';
import {
  FormSubmissionModel,
  type FormSubmissionDocument,
} from '../models/form-submission.model.js';
import { IntakeFormModel, type IntakeFormDocument } from '../models/intake-form.model.js';
import { TaskTypeModel, type TaskTypeDocument } from '../models/task-type.model.js';
import { TemplateModel, type TemplateDocument } from '../models/template.model.js';
import { WorkflowModel, type WorkflowDocument } from '../models/workflow.model.js';

export class CustomFieldRepository {
  public async create(input: Record<string, unknown>): Promise<CustomFieldDefinitionDocument> {
    return CustomFieldDefinitionModel.create(input) as Promise<CustomFieldDefinitionDocument>;
  }

  public async findById(fieldId: Types.ObjectId): Promise<CustomFieldDefinitionDocument | null> {
    return CustomFieldDefinitionModel.findById(
      fieldId,
    ).exec() as Promise<CustomFieldDefinitionDocument | null>;
  }

  public async list(workspaceId: Types.ObjectId): Promise<CustomFieldDefinitionDocument[]> {
    return CustomFieldDefinitionModel.find({ workspaceId, archived: false })
      .sort({ name: 1 })
      .exec() as Promise<CustomFieldDefinitionDocument[]>;
  }

  public async listByIds(
    workspaceId: Types.ObjectId,
    fieldIds: Types.ObjectId[],
  ): Promise<CustomFieldDefinitionDocument[]> {
    return CustomFieldDefinitionModel.find({ workspaceId, _id: { $in: fieldIds }, archived: false })
      .sort({ name: 1 })
      .exec() as Promise<CustomFieldDefinitionDocument[]>;
  }

  public async listApplicable(input: {
    workspaceId: Types.ObjectId;
    projectId: Types.ObjectId;
    taskTypeId?: Types.ObjectId | null;
  }): Promise<CustomFieldDefinitionDocument[]> {
    const query: FilterQuery<CustomFieldDefinitionDocument> = {
      workspaceId: input.workspaceId,
      archived: false,
      $and: [
        {
          $or: [{ projectIds: { $size: 0 } }, { projectIds: input.projectId }],
        },
      ],
    };
    if (input.taskTypeId) {
      query.$and?.push({
        $or: [{ taskTypeIds: { $size: 0 } }, { taskTypeIds: input.taskTypeId }],
      });
    }
    return CustomFieldDefinitionModel.find(query).sort({ name: 1 }).exec() as Promise<
      CustomFieldDefinitionDocument[]
    >;
  }

  public async update(
    fieldId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<CustomFieldDefinitionDocument | null> {
    return CustomFieldDefinitionModel.findByIdAndUpdate(fieldId, update, {
      new: true,
    }).exec() as Promise<CustomFieldDefinitionDocument | null>;
  }
}

export class TaskTypeRepository {
  public async create(input: Record<string, unknown>): Promise<TaskTypeDocument> {
    return TaskTypeModel.create(input) as Promise<TaskTypeDocument>;
  }

  public async findById(taskTypeId: Types.ObjectId): Promise<TaskTypeDocument | null> {
    return TaskTypeModel.findById(taskTypeId).exec() as Promise<TaskTypeDocument | null>;
  }

  public async findDefault(workspaceId: Types.ObjectId): Promise<TaskTypeDocument | null> {
    return TaskTypeModel.findOne({
      workspaceId,
      key: 'TASK',
      archived: false,
    }).exec() as Promise<TaskTypeDocument | null>;
  }

  public async list(workspaceId: Types.ObjectId): Promise<TaskTypeDocument[]> {
    return TaskTypeModel.find({ workspaceId, archived: false }).sort({ name: 1 }).exec() as Promise<
      TaskTypeDocument[]
    >;
  }
}

export class WorkflowRepository {
  public async create(input: Record<string, unknown>): Promise<WorkflowDocument> {
    return WorkflowModel.create(input) as Promise<WorkflowDocument>;
  }

  public async findById(workflowId: Types.ObjectId): Promise<WorkflowDocument | null> {
    return WorkflowModel.findById(workflowId).exec() as Promise<WorkflowDocument | null>;
  }

  public async list(workspaceId: Types.ObjectId): Promise<WorkflowDocument[]> {
    return WorkflowModel.find({ workspaceId, archived: false }).sort({ name: 1 }).exec() as Promise<
      WorkflowDocument[]
    >;
  }
}

export class IntakeFormRepository {
  public async create(input: Record<string, unknown>): Promise<IntakeFormDocument> {
    return IntakeFormModel.create(input) as Promise<IntakeFormDocument>;
  }

  public async findById(formId: Types.ObjectId): Promise<IntakeFormDocument | null> {
    return IntakeFormModel.findById(formId).exec() as Promise<IntakeFormDocument | null>;
  }

  public async findPublicBySlug(slug: string): Promise<IntakeFormDocument | null> {
    return IntakeFormModel.findOne({
      slug,
      visibility: 'public',
      active: true,
    }).exec() as Promise<IntakeFormDocument | null>;
  }

  public async list(workspaceId: Types.ObjectId): Promise<IntakeFormDocument[]> {
    return IntakeFormModel.find({ workspaceId }).sort({ createdAt: -1 }).exec() as Promise<
      IntakeFormDocument[]
    >;
  }
}

export class FormSubmissionRepository {
  public async create(input: Record<string, unknown>): Promise<FormSubmissionDocument> {
    return FormSubmissionModel.create(input) as Promise<FormSubmissionDocument>;
  }

  public async list(formId: Types.ObjectId): Promise<FormSubmissionDocument[]> {
    return FormSubmissionModel.find({ formId })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec() as Promise<FormSubmissionDocument[]>;
  }
}

export class TemplateRepository {
  public async create(input: Record<string, unknown>): Promise<TemplateDocument> {
    return TemplateModel.create(input) as Promise<TemplateDocument>;
  }

  public async findById(templateId: Types.ObjectId): Promise<TemplateDocument | null> {
    return TemplateModel.findById(templateId).exec() as Promise<TemplateDocument | null>;
  }

  public async list(workspaceId: Types.ObjectId): Promise<TemplateDocument[]> {
    return TemplateModel.find({ workspaceId, archived: false }).sort({ name: 1 }).exec() as Promise<
      TemplateDocument[]
    >;
  }
}
