import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const taskTypeCategories = [
  'task',
  'bug',
  'story',
  'feature',
  'incident',
  'request',
  'custom',
] as const;

const taskTypeSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z][A-Z0-9_]{1,15}$/,
    },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    icon: { type: String, default: null, trim: true, maxlength: 40 },
    color: { type: String, default: '#64748b', trim: true },
    category: { type: String, enum: taskTypeCategories, default: 'custom', index: true },
    defaultWorkflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', default: null },
    fieldIds: [{ type: Schema.Types.ObjectId, ref: 'CustomFieldDefinition' }],
    requiredFieldIds: [{ type: Schema.Types.ObjectId, ref: 'CustomFieldDefinition' }],
    defaultPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    defaultLabels: [{ type: String, trim: true, maxlength: 40 }],
    descriptionTemplate: { type: String, default: null, trim: true, maxlength: 5000 },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

taskTypeSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export type TaskType = InferSchemaType<typeof taskTypeSchema>;
export type TaskTypeDocument = HydratedDocument<TaskType>;
export const TaskTypeModel = model<TaskType>('TaskType', taskTypeSchema);
