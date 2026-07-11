import { z } from 'zod';

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number');

export const signupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().toLowerCase(),
    password: strongPassword,
  }),
});

export const loginSchema = z.object({
  body: z.object({ email: z.string().trim().email().toLowerCase(), password: z.string().min(1) }),
});

export const refreshTokenSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1).optional() }).optional(),
  cookies: z.object({ refreshToken: z.string().min(1).optional() }).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().trim().email().toLowerCase() }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(32),
    password: strongPassword,
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().min(32) }),
});

export const resendVerificationSchema = z.object({
  body: z.object({ email: z.string().trim().email().toLowerCase() }),
});

export type SignupInput = z.infer<typeof signupSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>['body'];
