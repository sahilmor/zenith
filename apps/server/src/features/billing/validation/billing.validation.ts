import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const workspaceBillingParamsSchema = z.object({
  params: z.object({
    workspaceId: objectId,
  }),
});

export const checkoutSchema = z.object({
  params: z.object({
    workspaceId: objectId,
  }),
  body: z.object({
    planCode: z.enum(['pro', 'business']),
    billingInterval: z.enum(['monthly', 'annual']),
  }),
});

export const billingWebhookSchema = z.object({
  params: z.object({
    provider: z.enum(['local', 'stripe']),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>['body'];
