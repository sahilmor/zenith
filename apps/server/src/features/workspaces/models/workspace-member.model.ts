import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { workspaceMemberStatuses, workspaceRoles } from '../constants.js';

const workspaceMemberSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: workspaceRoles, required: true, default: 'member' },
    status: { type: String, enum: workspaceMemberStatuses, required: true, default: 'active' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    joinedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export type WorkspaceMember = InferSchemaType<typeof workspaceMemberSchema>;
export type WorkspaceMemberDocument = HydratedDocument<WorkspaceMember>;
export const WorkspaceMemberModel = model<WorkspaceMember>(
  'WorkspaceMember',
  workspaceMemberSchema,
);
