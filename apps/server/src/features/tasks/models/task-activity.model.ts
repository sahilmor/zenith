import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const taskActivitySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

taskActivitySchema.index({ taskId: 1, createdAt: -1 });

export type TaskActivity = InferSchemaType<typeof taskActivitySchema>;
export type TaskActivityDocument = HydratedDocument<TaskActivity>;
export const TaskActivityModel = model<TaskActivity>('TaskActivity', taskActivitySchema);
