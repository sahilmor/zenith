# Strategic Planning

Zenith's strategic-planning module connects workspace goals, measurable key results, initiatives,
portfolios, and execution work without duplicating project, board, or task data.

## Architecture

Backend code lives in `apps/server/src/features/strategic` and follows the same layered structure as
the workspace, project, board, task, analytics, and billing modules:

```text
models/          Mongoose schemas and indexes
repositories/    Database access
services/        Authorization, entitlements, rollups, notifications, activity, realtime
controllers/     Request handlers
routes/          Express route registration
validation/      Zod schemas
```

Frontend code lives in `apps/web/src/features/strategic` with API hooks and reusable panels consumed
by dashboard routes.

## Domain Model

- `Goal`: workspace-level objective or OKR goal with owner, contributors, parent goal, health,
  confidence, target date, archive state, and manual or automatic progress.
- `KeyResult`: measurable outcome under a goal. Numeric, percentage, currency, boolean, task
  completion, and project progress measurement types are supported.
- `StrategicCheckIn`: dated update against a goal or key result, including progress, health,
  confidence, blockers, and next steps.
- `Initiative`: cross-project strategic bet with owner, contributors, priority, health, and progress.
- `Portfolio`: collection-level planning object for initiatives and projects.
- `StrategicLink`: weighted relationship between strategic objects and execution objects.

Supported link entity types are `goal`, `key_result`, `initiative`, `portfolio`, `project`, `board`,
and `task`. Future entity names such as `epic`, `milestone`, and `release` are included in shared
types for forward compatibility, but the service rejects those link targets until the corresponding
modules exist.

## Progress Rollups

- Key results with numeric-style measurements calculate progress from start, current, and target
  values.
- Boolean key results report either `0` or `100`.
- Task-completion key results can roll up linked tasks.
- Project-progress key results can roll up linked projects.
- Goals average key results, child goals, and weighted linked projects.
- Initiatives average weighted linked goals and projects.
- Portfolios average weighted linked initiatives and projects.

The existing task, project, and board records remain the source of truth.

## Authorization And Entitlements

All strategic endpoints require authentication and active workspace membership.

- Owners, admins, and managers can create, update, archive, restore, and link strategic resources.
- Members can read strategic resources and post check-ins.
- Guests can read strategic resources.

Billing entitlements are enforced server-side:

- `strategic_planning` is required to create strategic resources and links.
- `goals`, `initiatives`, and `portfolios` limits are enforced before creation.
- Free workspaces have strategic planning disabled by default.
- Pro and Business workspaces include strategic planning limits.
- Business and Enterprise include the `strategic_analytics` entitlement foundation.

## API Endpoints

```text
GET    /api/workspaces/:workspaceId/goals
POST   /api/workspaces/:workspaceId/goals
GET    /api/goals/:goalId
PATCH  /api/goals/:goalId
DELETE /api/goals/:goalId
POST   /api/goals/:goalId/archive
POST   /api/goals/:goalId/restore

GET    /api/goals/:goalId/key-results
POST   /api/goals/:goalId/key-results
PATCH  /api/key-results/:keyResultId
DELETE /api/key-results/:keyResultId

GET    /api/goals/:goalId/check-ins
POST   /api/goals/:goalId/check-ins

GET    /api/workspaces/:workspaceId/initiatives
POST   /api/workspaces/:workspaceId/initiatives
GET    /api/initiatives/:initiativeId
PATCH  /api/initiatives/:initiativeId
POST   /api/initiatives/:initiativeId/archive
POST   /api/initiatives/:initiativeId/restore

GET    /api/workspaces/:workspaceId/portfolios
POST   /api/workspaces/:workspaceId/portfolios
GET    /api/portfolios/:portfolioId
PATCH  /api/portfolios/:portfolioId
POST   /api/portfolios/:portfolioId/archive
POST   /api/portfolios/:portfolioId/restore

GET    /api/workspaces/:workspaceId/strategic-links
POST   /api/strategic-links
DELETE /api/strategic-links/:linkId

GET    /api/workspaces/:workspaceId/strategic-dashboard
```

## Frontend Routes

```text
/dashboard/goals
/dashboard/goals/:goalId
/dashboard/initiatives
/dashboard/portfolios
/dashboard/roadmap
```

The frontend uses TanStack Query hooks from
`apps/web/src/features/strategic/api/strategic-hooks.ts` and the global mutation-feedback system for
loading, success, and error toasts.

## Activity, Realtime, And Notifications

Strategic mutations create activity events for goal, key-result, check-in, initiative, portfolio, and
strategic-link changes. Mutations also emit workspace-scoped realtime events so open clients can
reconcile cached data. Owner assignments create in-app notifications using the existing notification
service.

## Testing

Focused backend coverage lives in
`apps/server/src/features/strategic/services/strategic.service.test.ts` and verifies entitlement
enforcement, goal/key-result/check-in flows, cycle prevention, initiative and portfolio rollups, and
duplicate link rejection.

Run the focused suite with:

```bash
npm run test -w @pm/server -- src/features/strategic/services/strategic.service.test.ts
```

Run the normal quality gates with:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Current Boundaries

Epics, milestones, releases, dependency visualizations, capacity planning, and editable roadmap
timelines are not implemented as separate product modules yet. Strategic types are prepared for those
future resources, while current production behavior is limited to workspaces, projects, boards,
tasks, goals, key results, initiatives, portfolios, and weighted links between supported entities.
