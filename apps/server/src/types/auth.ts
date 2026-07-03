import type { Types } from 'mongoose';

export type UserRole = 'user' | 'admin';
export type AuthProvider = 'local' | 'google' | 'github';

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedUser = JwtPayload & { id: string; _id: Types.ObjectId };
