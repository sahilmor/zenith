# Customization Platform

Zenith's customization platform lets workspaces configure task metadata, task types, workflow states,
intake forms, and reusable templates without changing application code.

## Architecture

Backend code lives in `apps/server/src/features/customization`:

```text
models/          Mongoose schemas for fields, task types, workflows, forms, submissions, templates
repositories/    Database access
services/        Entitlements, validation, transitions, public form submission, audit/realtime
controllers/     HTTP handlers
routes/          Authenticated customization routes and public form routes
validation/      Zod request schemas
```

Tasks store references to `taskTypeId`, `workflowId`, and `workflowStateId`, plus typed
`customFields` embedded in the task document. Field definitions remain reusable workspace
configuration. This hybrid approach keeps task reads efficient while avoiding a loose unvalidated
JSON blob.

## Value Storage

Each task custom-field value stores:

- `fieldId`
- `key`
- `fieldType`
- one typed value slot such as `stringValue`, `numberValue`, `booleanValue`, `dateValue`,
  `userIdValue`, `optionIdValue`, or `arrayValue`

Indexes exist for common custom-field filtering/search foundations:

- `workspaceId + customFields.key + customFields.stringValue`
- `workspaceId + customFields.key + customFields.numberValue`
- `workspaceId + customFields.key + customFields.dateValue`

## Field Types

Production-ready backend validation and persistence is implemented for:

- Text: `short_text`, `long_text`, `email`, `phone`, `url`
- Numeric: `number`, `integer`, `decimal`, `currency`, `percentage`, `duration`, `rating`
- Boolean: `boolean`, `checkbox`
- Choice: `single_select`, `multi_select`
- Date: `date`, `datetime`
- User references: `user`, `multi_user`

`relation` and `formula` are shared type foundations only. The API rejects creation of those fields
until relation resolution and formula execution are implemented end-to-end.

Select fields use stable option IDs, so renaming an option label does not corrupt existing task
values.

## Inheritance

Configuration resolution follows:

1. Task type field configuration and required fields
2. Project-scoped field definitions
3. Workspace-scoped field definitions
4. System task defaults

Definitions are not copied into every project or task type. Tasks store values against stable
definition IDs and keys.

## Task Types

Task types configure:

- Stable `key`
- Name, category, color, icon, description
- Default workflow
- Available field IDs
- Required field IDs
- Default priority, labels, and description template

Task creation resolves task type defaults and validates required custom fields server-side.

## Workflows

Workflows contain stable states and explicit transitions.

States include:

- Stable state ID
- Name
- Category: `backlog`, `todo`, `in_progress`, `done`, `canceled`
- Color, order, terminal flag
- Optional board column mapping

Transitions include:

- Stable transition ID
- From/to state IDs
- Required workspace roles
- Required custom fields
- Assignee/reporter validators
- All-subtasks-complete validator

`POST /api/tasks/:taskId/transitions/:transitionId` executes a transition. Moving a task card between
columns also checks workflow rules when the task has a workflow and the target column is mapped to a
workflow state. Columns remain fixed and non-draggable.

## Forms

Forms can be internal or public. Public forms are available at:

```text
GET  /api/public/forms/:slug
POST /api/public/forms/:slug/submissions
```

Public form responses hide workspace internals. Submission validates the configured fields, creates a
task through the normal task service path, stores a submission record, records activity, and emits a
realtime task mutation.

Public forms do not expose member directories or hidden form fields.

## Templates

Templates store reusable typed configuration with version and active/archive state. Current
implementation supports safe creation and listing for workspace, project, board, task, form, and
workflow template records. Large template application and migration are documented foundations and
not represented as complete marketplace behavior.

## APIs

```text
GET   /api/workspaces/:workspaceId/custom-fields
POST  /api/workspaces/:workspaceId/custom-fields
PATCH /api/custom-fields/:fieldId

GET   /api/workspaces/:workspaceId/task-types
POST  /api/workspaces/:workspaceId/task-types

GET   /api/workspaces/:workspaceId/workflows
POST  /api/workspaces/:workspaceId/workflows
POST  /api/tasks/:taskId/transitions/:transitionId

GET   /api/workspaces/:workspaceId/forms
POST  /api/workspaces/:workspaceId/forms
GET   /api/public/forms/:slug
POST  /api/public/forms/:slug/submissions

GET   /api/workspaces/:workspaceId/templates
POST  /api/workspaces/:workspaceId/templates
```

## Entitlements

Backend enforcement uses the centralized `EntitlementService`:

- `custom_fields`
- `custom_workflows`
- `public_forms`
- `templates`
- limits for `customFields`, `taskTypes`, `workflows`, `activeForms`, and `templates`

Frontend visibility is not security; write operations are enforced server-side.

## Frontend

Dashboard route:

```text
/dashboard/customization
```

Public form route:

```text
/forms/:slug
```

The dashboard console supports creating and listing custom fields, task types, templates, workflows,
forms, and current counts. Mutations use the global toast/request-feedback system through TanStack
Query metadata.

## Testing

Focused backend coverage lives in:

```text
apps/server/src/features/customization/services/customization.service.test.ts
```

It verifies:

- Custom field creation
- Stable select option IDs
- Task type creation
- Workflow creation
- Task creation with custom fields
- Rejected invalid transition with missing required field
- Valid transition after required field is supplied
- Public form retrieval without workspace internals
- Public form submission creating a task

Run it with:

```bash
npm run test -w @pm/server -- src/features/customization/services/customization.service.test.ts
```

## Current Boundaries

The implemented core is real and integrated with tasks, workflow transitions, billing, activity,
audit logs, realtime, forms, and frontend configuration. The following are intentionally foundations
only and are not documented as complete:

- Formula execution
- Relation field resolution
- Full visual workflow builder
- Full form conditional logic builder
- Template application for large project/board/workspace generation
- Custom-field analytics aggregation
- CSV import mapping for custom fields
- AI-generated schema mutation with confirmation
