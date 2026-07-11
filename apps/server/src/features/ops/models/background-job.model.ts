import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const backgroundJobSchema = new Schema(
  {
    type: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'succeeded', 'failed'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    runAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    error: { type: String, default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

backgroundJobSchema.index({ status: 1, runAt: 1 });

export type BackgroundJob = InferSchemaType<typeof backgroundJobSchema>;
export type BackgroundJobDocument = HydratedDocument<BackgroundJob>;
export const BackgroundJobModel = model<BackgroundJob>('BackgroundJob', backgroundJobSchema);
