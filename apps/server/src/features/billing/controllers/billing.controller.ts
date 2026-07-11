import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { billingService } from '../services/billing.service.js';
import { billingWebhookService } from '../services/billing-webhook.service.js';
import type { CheckoutInput } from '../validation/billing.validation.js';

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

export const listPlans: RequestHandler = asyncHandler(async (_request, response) => {
  sendSuccess(response, 200, 'Billing plans retrieved', billingService.listPlans());
});

export const getWorkspaceBilling: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Workspace billing retrieved',
    await billingService.getBilling(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const getWorkspaceUsage: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Workspace usage retrieved',
    await billingService.getUsage(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const listInvoices: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Billing invoices retrieved',
    await billingService.listInvoices(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const createCheckout: RequestHandler = asyncHandler(async (request, response) => {
  const body = request.body as CheckoutInput;
  sendSuccess(
    response,
    201,
    'Checkout session created',
    await billingService.createCheckout({
      workspaceId: paramObjectId(request.params.workspaceId),
      userId: requireUserId(request),
      customerEmail: request.user?.email ?? '',
      planCode: body.planCode,
      billingInterval: body.billingInterval,
    }),
  );
});

export const createPortal: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    201,
    'Billing portal session created',
    await billingService.createPortal(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const cancelSubscription: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Subscription cancellation scheduled',
    await billingService.cancel(paramObjectId(request.params.workspaceId), requireUserId(request)),
  );
});

export const reactivateSubscription: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Subscription reactivated',
    await billingService.reactivate(
      paramObjectId(request.params.workspaceId),
      requireUserId(request),
    ),
  );
});

export const handleBillingWebhook: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Billing webhook processed',
    await billingWebhookService.handle(
      request.params.provider as 'local' | 'stripe',
      request.body,
      request.header('stripe-signature') ?? request.header('x-billing-signature') ?? undefined,
    ),
  );
});
