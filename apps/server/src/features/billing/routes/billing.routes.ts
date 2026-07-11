import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  cancelSubscription,
  createCheckout,
  createPortal,
  getWorkspaceBilling,
  getWorkspaceUsage,
  handleBillingWebhook,
  listInvoices,
  listPlans,
  reactivateSubscription,
} from '../controllers/billing.controller.js';
import {
  billingWebhookSchema,
  checkoutSchema,
  workspaceBillingParamsSchema,
} from '../validation/billing.validation.js';

export const billingRouter = Router();

billingRouter.get('/billing/plans', listPlans);
billingRouter.post(
  '/billing/webhooks/:provider',
  validate(billingWebhookSchema),
  handleBillingWebhook,
);

billingRouter.use('/workspaces/:workspaceId/billing', verifyToken);
billingRouter.get(
  '/workspaces/:workspaceId/billing',
  validate(workspaceBillingParamsSchema),
  getWorkspaceBilling,
);
billingRouter.get(
  '/workspaces/:workspaceId/billing/usage',
  validate(workspaceBillingParamsSchema),
  getWorkspaceUsage,
);
billingRouter.get(
  '/workspaces/:workspaceId/billing/invoices',
  validate(workspaceBillingParamsSchema),
  listInvoices,
);
billingRouter.post(
  '/workspaces/:workspaceId/billing/checkout',
  validate(checkoutSchema),
  createCheckout,
);
billingRouter.post(
  '/workspaces/:workspaceId/billing/portal',
  validate(workspaceBillingParamsSchema),
  createPortal,
);
billingRouter.post(
  '/workspaces/:workspaceId/billing/cancel',
  validate(workspaceBillingParamsSchema),
  cancelSubscription,
);
billingRouter.post(
  '/workspaces/:workspaceId/billing/reactivate',
  validate(workspaceBillingParamsSchema),
  reactivateSubscription,
);
