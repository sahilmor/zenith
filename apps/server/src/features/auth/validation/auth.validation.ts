import { z } from 'zod';

export const signupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8).max(128),
  }),
});

export const loginSchema = z.object({
  body: z.object({ email: z.string().trim().email().toLowerCase(), password: z.string().min(1) }),
});

export const refreshTokenSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1).optional() }).optional(),
  cookies: z.object({ refreshToken: z.string().min(1).optional() }).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
