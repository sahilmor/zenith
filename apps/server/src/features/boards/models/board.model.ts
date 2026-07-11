import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const boardSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    isDefault: { type: Boolean, default: false },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export type Board = InferSchemaType<typeof boardSchema>;
export type BoardDocument = HydratedDocument<Board>;
export const BoardModel = model<Board>('Board', boardSchema);
