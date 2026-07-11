import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const projectSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    key: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    icon: { type: String, default: null, trim: true, maxlength: 16 },
    color: { type: String, default: null, trim: true },
    coverImage: { type: String, default: null, trim: true },
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export type Project = InferSchemaType<typeof projectSchema>;
export type ProjectDocument = HydratedDocument<Project>;
export const ProjectModel = model<Project>('Project', projectSchema);
