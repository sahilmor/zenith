import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { workspaceInvitationStatuses, workspaceRoles } from '../constants.js';

const workspaceInvitationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: workspaceRoles, required: true, default: 'member' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: workspaceInvitationStatuses,
      required: true,
      default: 'pending',
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

workspaceInvitationSchema.index({ workspaceId: 1, email: 1, status: 1 });

export type WorkspaceInvitation = InferSchemaType<typeof workspaceInvitationSchema>;
export type WorkspaceInvitationDocument = HydratedDocument<WorkspaceInvitation>;
export const WorkspaceInvitationModel = model<WorkspaceInvitation>(
  'WorkspaceInvitation',
  workspaceInvitationSchema,
);
