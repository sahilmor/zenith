# CRM And Customer Success

Zenith includes a workspace-scoped CRM foundation for managing accounts, contacts, leads, deals,
sales activity, and customer health alongside projects, tasks, documents, analytics, notifications,
audit logs, and realtime updates.

## Architecture

CRM data is owned by a workspace. Backend implementation follows the existing feature structure:

```text
apps/server/src/features/crm/
  controllers/  Express request handlers
  models/       Mongoose account, contact, lead, deal, and activity models
  repositories/ Workspace-scoped MongoDB access
  routes/       Authenticated REST route wiring
  services/     Permission, entitlement, activity, audit, realtime, and dashboard logic
  validation/   Zod request schemas
apps/web/src/features/crm/
  api/          TanStack Query CRM hooks
  components/   Workspace CRM console
```

The domain is intentionally independent of future email/calendar providers. Email, calls, meetings,
quotes, products, portals, and imports can be expanded through the same service and activity model
without changing existing workspace/project/task ownership rules.

## Permissions

All CRM APIs require authentication and active workspace membership.

- `owner`, `admin`, and `manager` can create and update CRM records.
- `member` and `guest` can view CRM records where they belong to the workspace.
- Every linked account, contact, deal, task, project, and owner is verified to belong to the same
  workspace before mutation.

Backend checks are mandatory. Frontend visibility is only a usability layer.

## Entitlements

CRM access is controlled through the billing entitlement service using the `crm` feature flag and
these configurable limits:

```text
crmAccounts
crmContacts
crmLeads
crmDeals
```

Limits are enforced server-side before creating records.

## Models

- `CrmAccount`: organizations/customers, lifecycle stage, health score/status, owner, renewal date,
  onboarding project link, tags, custom fields, archive state.
- `CrmContact`: people linked to optional accounts, email, phone, title, owner, tags, custom fields.
- `CrmLead`: pre-sales prospects, source, qualification status, score, estimated value, conversion
  references.
- `CrmDeal`: opportunities linked to accounts, optional contacts/projects, stage, forecast category,
  value, probability, expected close date, next step.
- `CrmActivity`: notes, emails, calls, meetings, tasks, and follow-ups linked to CRM records or
  tasks.

## API

All responses use the standard Zenith API envelope.

```text
GET   /api/workspaces/:workspaceId/crm
GET   /api/workspaces/:workspaceId/crm/accounts
POST  /api/workspaces/:workspaceId/crm/accounts
PATCH /api/crm/accounts/:accountId
GET   /api/workspaces/:workspaceId/crm/contacts
POST  /api/workspaces/:workspaceId/crm/contacts
GET   /api/workspaces/:workspaceId/crm/leads
POST  /api/workspaces/:workspaceId/crm/leads
PATCH /api/crm/leads/:leadId
POST  /api/crm/leads/:leadId/convert
GET   /api/workspaces/:workspaceId/crm/deals
POST  /api/workspaces/:workspaceId/crm/deals
PATCH /api/crm/deals/:dealId
POST  /api/workspaces/:workspaceId/crm/activities
```

## Realtime, Activity, And Audit

CRM mutations emit workspace-scoped realtime events for accounts, contacts, leads, deals, and
activities. They also create activity records for CRM lifecycle events. Administrative CRM account
creation is recorded in the audit log.

## Frontend

The dashboard CRM page is available at:

```text
/dashboard/crm
```

It uses existing workspace state, TanStack Query, global mutation feedback metadata, shared cards,
buttons, empty states, and dark/light theme tokens.

## Testing

Focused backend service coverage lives in:

```text
apps/server/src/features/crm/services/crm.service.test.ts
```

Run it with:

```bash
npm run test --workspace @pm/server -- src/features/crm/services/crm.service.test.ts
```

## Current Limitations

This implementation is the CRM foundation for Phase 25. The following items are intentionally not
claimed as complete yet: provider-backed email sync, call recording, calendar sync, quote generation,
product catalog, price books, customer portal, territory rules, bulk import/export, and full
end-to-end browser coverage.
