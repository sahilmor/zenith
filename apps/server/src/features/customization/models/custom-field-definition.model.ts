import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const customFieldTypes = [
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
  'relation',
  'formula',
] as const;

const optionSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    color: { type: String, default: null, trim: true },
    description: { type: String, default: null, trim: true, maxlength: 500 },
    order: { type: Number, default: 0, min: 0 },
    archived: { type: Boolean, default: false },
  },
  { _id: false },
);

const validationSchema = new Schema(
  {
    minLength: { type: Number, min: 0 },
    maxLength: { type: Number, min: 0 },
    pattern: { type: String, trim: true },
    min: { type: Number },
    max: { type: Number },
    precision: { type: Number, min: 0, max: 8 },
    minDate: { type: Date },
    maxDate: { type: Date },
    minSelections: { type: Number, min: 0 },
    maxSelections: { type: Number, min: 0 },
  },
  { _id: false },
);

const customFieldDefinitionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectIds: [{ type: Schema.Types.ObjectId, ref: 'Project', index: true }],
    taskTypeIds: [{ type: Schema.Types.ObjectId, ref: 'TaskType', index: true }],
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z][a-z0-9_]{1,62}$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    fieldType: { type: String, enum: customFieldTypes, required: true, index: true },
    required: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed, default: null },
    options: { type: [optionSchema], default: [] },
    validation: { type: validationSchema, default: {} },
    visibility: { type: String, enum: ['always', 'internal'], default: 'always' },
    searchable: { type: Boolean, default: false, index: true },
    filterable: { type: Boolean, default: true },
    sortable: { type: Boolean, default: false },
    groupable: { type: Boolean, default: false },
    analyticsEnabled: { type: Boolean, default: false },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

customFieldDefinitionSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export type CustomFieldDefinition = InferSchemaType<typeof customFieldDefinitionSchema>;
export type CustomFieldDefinitionDocument = HydratedDocument<CustomFieldDefinition>;
export const CustomFieldDefinitionModel = model<CustomFieldDefinition>(
  'CustomFieldDefinition',
  customFieldDefinitionSchema,
);
