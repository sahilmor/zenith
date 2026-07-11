import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const promptSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    scope: { type: String, enum: ['global', 'workspace', 'project'], required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    content: { type: String, required: true, trim: true, minlength: 5, maxlength: 12000 },
    variables: [{ type: String, trim: true, maxlength: 80 }],
    version: { type: Number, required: true, default: 1, min: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

promptSchema.index({ workspaceId: 1, scope: 1, name: 1 });

export type Prompt = InferSchemaType<typeof promptSchema>;
export type PromptDocument = HydratedDocument<Prompt>;
export const PromptModel = model<Prompt>('Prompt', promptSchema);
