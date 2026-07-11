import { z } from 'zod';

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default('7d'),
  REFRESH_COOKIE_DOMAIN: z.string().min(1).optional(),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().min(1).optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  WEBHOOK_SIGNING_SECRET: z.string().min(16).default('development-webhook-signing-secret'),
  PUBLIC_API_KEY_PREFIX: z.string().min(2).default('zenith'),
  BILLING_ENABLED: z.coerce.boolean().default(false),
  BILLING_PROVIDER: z.enum(['local', 'stripe']).default('local'),
  BILLING_SUCCESS_URL: z.string().url().optional(),
  BILLING_CANCEL_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().min(1).optional(),
  STRIPE_PRO_ANNUAL_PRICE_ID: z.string().min(1).optional(),
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: z.string().min(1).optional(),
  STRIPE_BUSINESS_ANNUAL_PRICE_ID: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
  AI_PROVIDER: z.enum(['local', 'openai', 'anthropic', 'gemini']).default('local'),
  AI_MODEL: z.string().min(1).default('local-deterministic'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
});

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().default('http://localhost:4000'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
