import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { customFieldTypes } from './custom-field-definition.model.js';

const formFieldSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    fieldId: { type: Schema.Types.ObjectId, ref: 'CustomFieldDefinition', default: null },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    fieldType: {
      type: String,
      enum: [...customFieldTypes, 'title', 'description', 'priority'],
      required: true,
    },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0, min: 0 },
    instructions: { type: String, default: null, trim: true, maxlength: 500 },
    hidden: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const intakeFormSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    visibility: { type: String, enum: ['internal', 'public'], default: 'internal', index: true },
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    destinationProjectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    destinationBoardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    destinationColumnId: { type: Schema.Types.ObjectId, ref: 'Column', required: true },
    destinationTaskTypeId: { type: Schema.Types.ObjectId, ref: 'TaskType', default: null },
    active: { type: Boolean, default: false, index: true },
    expiresAt: { type: Date, default: null },
    fields: { type: [formFieldSchema], default: [] },
    confirmationMessage: {
      type: String,
      default: 'Thanks. Your request was submitted.',
      trim: true,
      maxlength: 500,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

intakeFormSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });

export type IntakeForm = InferSchemaType<typeof intakeFormSchema>;
export type IntakeFormDocument = HydratedDocument<IntakeForm>;
export const IntakeFormModel = model<IntakeForm>('IntakeForm', intakeFormSchema);
