import { hashPassword, verifyPassword } from '../../../utils/password.js';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import type { AuthProvider, UserRole } from '../../../types/auth.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String, default: null },
    role: {
      type: String,
      enum: ['user', 'admin'] satisfies UserRole[],
      default: 'user',
      index: true,
    },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null, select: false },
    emailVerificationExpiresAt: { type: Date, default: null, select: false },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    provider: {
      type: String,
      enum: ['local', 'google', 'github'] satisfies AuthProvider[],
      default: 'local',
    },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashUserPassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  this.password = await hashPassword(this.password);
  next();
});

userSchema.methods.comparePassword = function comparePassword(
  candidatePassword: string,
): Promise<boolean> {
  return verifyPassword(candidatePassword, this.password as string);
};

export type User = InferSchemaType<typeof userSchema>;
export interface UserDocument extends HydratedDocument<User> {
  comparePassword(candidatePassword: string): Promise<boolean>;
}
export const UserModel = model<User>('User', userSchema);
