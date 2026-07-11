# Billing Architecture

Zenith billing is workspace-scoped and provider-independent at the application boundary.

## Domain

Plans are resolved through `PricingService`. Controllers and feature services should not branch on
raw plan names. Feature access and limits must flow through `EntitlementService`.

Implemented plan codes:

- `free`
- `pro`
- `business`
- `enterprise`

Subscriptions are persisted in MongoDB through the `Subscription` model. Webhook idempotency is
persisted in `BillingWebhookEvent`. Invoice metadata is persisted in `Invoice` when provider events
include invoice information.

## Providers

The billing domain depends on `BillingProvider`, not provider SDK types.

Implemented adapters:

- `local`: development/test provider. It can simulate checkout and signed webhook payloads.
- `stripe`: checkout and billing portal are implemented through Stripe HTTP APIs when Stripe
  environment variables are configured. Webhook signature verification uses the configured webhook
  secret and a canonical JSON payload in this codebase.

The Stripe adapter is ready for test-mode integration but has not been externally smoke-tested
without real Stripe test credentials and webhook forwarding.

## Entitlements

Backend enforcement exists for:

- Project creation: `projects`
- Member invitations and invitation acceptance: `members`
- Attachment upload: `storageBytes`
- AI chat/actions: `ai`, `aiRequests`
- Natural-language AI search: `advanced_search`
- Automation creation: `automations`
- API key creation: `public_api`, `apiKeys`
- Webhook creation: `webhooks`

When a limit is reached, the API returns a `403` with an error object:

```json
{
  "code": "PLAN_LIMIT_REACHED",
  "feature": "projects",
  "currentUsage": 3,
  "limit": 3,
  "plan": "free",
  "upgradeRequired": true
}
```

Existing data remains readable after downgrades. The policy is to block new premium writes or new
resources that exceed the destination plan. Zenith does not automatically delete customer data to
force compliance.

## APIs

```text
GET  /api/billing/plans
GET  /api/workspaces/:workspaceId/billing
GET  /api/workspaces/:workspaceId/billing/usage
GET  /api/workspaces/:workspaceId/billing/invoices
POST /api/workspaces/:workspaceId/billing/checkout
POST /api/workspaces/:workspaceId/billing/portal
POST /api/workspaces/:workspaceId/billing/cancel
POST /api/workspaces/:workspaceId/billing/reactivate
POST /api/billing/webhooks/:provider
```

Billing modifications require workspace owner/admin access. Webhooks are unauthenticated but must
pass provider signature verification when the provider secret is configured.

## Environment

Billing can be disabled without crashing unrelated application features:

```bash
BILLING_ENABLED=false
BILLING_PROVIDER=local
BILLING_SUCCESS_URL=http://localhost:3000/dashboard/workspace/billing?checkout=success
BILLING_CANCEL_URL=http://localhost:3000/dashboard/workspace/billing?checkout=cancelled
```

Stripe test mode:

```bash
BILLING_ENABLED=true
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_...
```

Never expose Stripe secret keys or webhook secrets through `NEXT_PUBLIC_*`.

## Local Webhook Testing

For the local provider, POST a signed or unsigned payload to:

```text
POST /api/billing/webhooks/local
```

Example payload:

```json
{
  "id": "evt_local_1",
  "type": "subscription.updated",
  "data": {
    "workspaceId": "WORKSPACE_OBJECT_ID",
    "planCode": "business",
    "billingInterval": "monthly",
    "status": "active"
  }
}
```

For Stripe, use Stripe test mode and webhook forwarding. Provider events are authoritative for paid
subscription state. A frontend checkout redirect alone must not be treated as payment confirmation.

## Reconciliation

The current implementation stores local subscription state and processes webhook updates
idempotently. A provider reconciliation job should be added before production billing launch to pull
authoritative subscription state from the provider and repair drift.

## Security Notes

- The backend resolves plans, intervals, price IDs, and currency server-side.
- The browser never submits trusted amounts or provider price IDs.
- Workspace billing reads require active membership.
- Billing writes require owner/admin membership.
- No card details are collected or stored by Zenith.
- Duplicate webhook event IDs are recorded and skipped.

## Manual Test Mode Checklist

- Create a free workspace and verify Free limits on the billing page.
- Hit a known limit and verify the API returns `PLAN_LIMIT_REACHED`.
- Start checkout for Pro monthly.
- Complete provider test checkout.
- Send/receive webhook and verify subscription changes locally.
- Confirm Billing page updates to the paid plan.
- Create a previously restricted resource.
- Schedule cancellation.
- Reactivate subscription.
- Simulate payment failure and verify `past_due` warning.
