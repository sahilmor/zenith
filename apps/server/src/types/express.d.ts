import type { AuthenticatedUser } from './auth.js';
import type { WorkspaceMemberDocument } from '../features/workspaces/models/workspace-member.model.js';
import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthenticatedUser;
      apiKey?: {
        id: string;
        workspaceId: Types.ObjectId;
        scopes: string[];
      };
      workspaceMembership?: WorkspaceMemberDocument;
    }
  }
}

export {};
