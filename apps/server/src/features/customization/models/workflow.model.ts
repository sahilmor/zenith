import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const workflowStateCategories = [
  'backlog',
  'todo',
  'in_progress',
  'done',
  'canceled',
] as const;

const workflowStateSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, enum: workflowStateCategories, required: true },
    color: { type: String, default: '#64748b', trim: true },
    description: { type: String, default: null, trim: true, maxlength: 500 },
    order: { type: Number, default: 0, min: 0 },
    terminal: { type: Boolean, default: false },
    columnId: { type: Schema.Types.ObjectId, ref: 'Column', default: null },
  },
  { _id: false },
);

const workflowTransitionSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    fromStateId: { type: String, required: true, trim: true },
    toStateId: { type: String, required: true, trim: true },
    requiredRoles: [
      { type: String, enum: ['owner', 'admin', 'manager', 'member', 'guest'], required: true },
    ],
    requiredFieldIds: [{ type: Schema.Types.ObjectId, ref: 'CustomFieldDefinition' }],
    requireAssignee: { type: Boolean, default: false },
    requireReporter: { type: Boolean, default: false },
    requireAllSubtasksComplete: { type: Boolean, default: false },
  },
  { _id: false },
);

const workflowSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    states: { type: [workflowStateSchema], required: true },
    transitions: { type: [workflowTransitionSchema], default: [] },
    initialStateId: { type: String, required: true, trim: true },
    version: { type: Number, default: 1, min: 1 },
    active: { type: Boolean, default: true, index: true },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

workflowSchema.index({ workspaceId: 1, name: 1 });

export type Workflow = InferSchemaType<typeof workflowSchema>;
export type WorkflowDocument = HydratedDocument<Workflow>;
export const WorkflowModel = model<Workflow>('Workflow', workflowSchema);
