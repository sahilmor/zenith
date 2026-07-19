import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default('7d'),
  REFRESH_COOKIE_DOMAIN: optionalString,
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: optionalString,
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  SEARCH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  SEARCH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  DOCUMENT_OPERATION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  DOCUMENT_OPERATION_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  DOCUMENT_HEAVY_OPERATION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  DOCUMENT_HEAVY_OPERATION_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  WEBHOOK_SIGNING_SECRET: z.string().min(16).default('development-webhook-signing-secret'),
  PUBLIC_API_KEY_PREFIX: z.string().min(2).default('zenith'),
  BILLING_ENABLED: z.coerce.boolean().default(false),
  BILLING_PROVIDER: z.enum(['local', 'stripe']).default('local'),
  BILLING_SUCCESS_URL: optionalUrl,
  BILLING_CANCEL_URL: optionalUrl,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRO_MONTHLY_PRICE_ID: optionalString,
  STRIPE_PRO_ANNUAL_PRICE_ID: optionalString,
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: optionalString,
  STRIPE_BUSINESS_ANNUAL_PRICE_ID: optionalString,
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_FROM: optionalEmail,
  RESEND_API_KEY: optionalString,
  APP_URL: z.string().url().default('http://localhost:3000'),
  AI_PROVIDER: z.enum(['local', 'openai', 'anthropic', 'gemini']).default('local'),
  AI_MODEL: z.string().min(1).default('local-deterministic'),
  OPENAI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
});

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().default('http://localhost:4000'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
