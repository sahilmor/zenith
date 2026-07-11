import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const taskLabelSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    color: { type: String, required: true, trim: true, default: '#64748b' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

taskLabelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export type TaskLabel = InferSchemaType<typeof taskLabelSchema>;
export type TaskLabelDocument = HydratedDocument<TaskLabel>;
export const TaskLabelModel = model<TaskLabel>('TaskLabel', taskLabelSchema);
