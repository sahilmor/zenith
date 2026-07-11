import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const attachmentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    fileType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 1 },
    cloudinaryPublicId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type Attachment = InferSchemaType<typeof attachmentSchema>;
export type AttachmentDocument = HydratedDocument<Attachment>;
export const AttachmentModel = model<Attachment>('Attachment', attachmentSchema);
