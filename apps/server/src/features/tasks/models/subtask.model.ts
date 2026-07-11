import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const subtaskSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    completed: { type: Boolean, default: false, index: true },
    order: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

subtaskSchema.index({ taskId: 1, order: 1 });

export type Subtask = InferSchemaType<typeof subtaskSchema>;
export type SubtaskDocument = HydratedDocument<Subtask>;
export const SubtaskModel = model<Subtask>('Subtask', subtaskSchema);
