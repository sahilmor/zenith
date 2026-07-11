import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { workspacePlans, workspaceVisibilities } from '../constants.js';

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: null, trim: true, maxlength: 500 },
    logo: { type: String, default: null, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visibility: {
      type: String,
      enum: workspaceVisibilities,
      default: 'private',
    },
    plan: {
      type: String,
      enum: workspacePlans,
      default: 'free',
    },
    settings: {
      allowPublicDiscovery: { type: Boolean, default: false },
    },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type Workspace = InferSchemaType<typeof workspaceSchema>;
export type WorkspaceDocument = HydratedDocument<Workspace>;
export const WorkspaceModel = model<Workspace>('Workspace', workspaceSchema);
