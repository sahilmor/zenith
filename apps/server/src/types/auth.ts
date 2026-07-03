import type { Types } from 'mongoose';

export type UserRole = 'user' | 'admin';
export type AuthProvider = 'local' | 'google' | 'github';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser extends JwtPayload {
  id: string;
  _id: Types.ObjectId;
}
