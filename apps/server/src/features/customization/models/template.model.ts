import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const templateTypes = ['workspace', 'project', 'board', 'task', 'form', 'workflow'] as const;

const templateSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    templateType: { type: String, enum: templateTypes, required: true, index: true },
    version: { type: Number, default: 1, min: 1 },
    config: { type: Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

templateSchema.index({ workspaceId: 1, templateType: 1, name: 1 });

export type Template = InferSchemaType<typeof templateSchema>;
export type TemplateDocument = HydratedDocument<Template>;
export const TemplateModel = model<Template>('Template', templateSchema);
