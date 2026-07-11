import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const taskWatcherSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

taskWatcherSchema.index({ taskId: 1, userId: 1 }, { unique: true });

export type TaskWatcher = InferSchemaType<typeof taskWatcherSchema>;
export type TaskWatcherDocument = HydratedDocument<TaskWatcher>;
export const TaskWatcherModel = model<TaskWatcher>('TaskWatcher', taskWatcherSchema);
