import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { customFieldTypes } from '../../customization/models/custom-field-definition.model.js';

const customFieldValueSchema = new Schema(
  {
    fieldId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomFieldDefinition',
      required: true,
      index: true,
    },
    key: { type: String, required: true, trim: true, lowercase: true, index: true },
    fieldType: { type: String, enum: customFieldTypes, required: true },
    stringValue: { type: String, default: null, trim: true },
    numberValue: { type: Number, default: null },
    booleanValue: { type: Boolean, default: null },
    dateValue: { type: Date, default: null },
    userIdValue: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    optionIdValue: { type: String, default: null, trim: true },
    arrayValue: [{ type: String, trim: true }],
  },
  { _id: false },
);

const taskSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    columnId: { type: Schema.Types.ObjectId, ref: 'Column', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    description: { type: String, default: null, trim: true, maxlength: 5000 },
    order: { type: Number, required: true, min: 0 },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'done', 'archived'],
      default: 'open',
      index: true,
    },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    labels: [{ type: String, trim: true, maxlength: 40 }],
    labelIds: [{ type: Schema.Types.ObjectId, ref: 'TaskLabel' }],
    dueDate: { type: Date, default: null },
    startDate: { type: Date, default: null },
    estimate: { type: Number, default: null, min: 0 },
    coverImage: { type: String, default: null, trim: true },
    taskTypeId: { type: Schema.Types.ObjectId, ref: 'TaskType', default: null, index: true },
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', default: null, index: true },
    workflowStateId: { type: String, default: null, trim: true, index: true },
    customFields: { type: [customFieldValueSchema], default: [] },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

taskSchema.index({ columnId: 1, order: 1 });
taskSchema.index({ workspaceId: 1, 'customFields.key': 1, 'customFields.stringValue': 1 });
taskSchema.index({ workspaceId: 1, 'customFields.key': 1, 'customFields.numberValue': 1 });
taskSchema.index({ workspaceId: 1, 'customFields.key': 1, 'customFields.dateValue': 1 });

export type Task = InferSchemaType<typeof taskSchema>;
export type TaskDocument = HydratedDocument<Task>;
export const TaskModel = model<Task>('Task', taskSchema);
