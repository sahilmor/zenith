# Resource Management, Workforce Planning, and Time Intelligence

Phase 24 introduces Zenith's first Resource Management module. It is implemented as a normal
feature module and reuses the existing workspace membership, RBAC, billing entitlement, activity,
audit, realtime, validation, and frontend query/toast infrastructure.

## Architecture

Backend feature folder:

```text
apps/server/src/features/resources/
  models/resource.model.ts
  repositories/resource.repository.ts
  services/resource.service.ts
  controllers/resource.controller.ts
  routes/resource.routes.ts
  validation/resource.validation.ts
```

Frontend feature folder:

```text
apps/web/src/features/resources/
  api/resource-hooks.ts
  components/resource-console.tsx
apps/web/src/app/dashboard/resources/page.tsx
```

Shared contracts are exported from `packages/types`.

## Data Models

The module currently persists:

- `TimeEntry`: manual and timer-generated time logs scoped to workspace, project, task, and user.
- `RunningTimer`: one active timer per user per workspace.
- `ResourceProfile`: capacity, working hours, department, skills, competencies, and rate metadata.
- `ResourceAllocation`: planned or active project allocation by user.
- `ResourceAvailability`: leave, holidays, training, focus time, and unavailable windows.

Indexes are workspace-first and include common user, project, task, date-range, and status access
patterns.

## Permissions

All APIs require authentication and active workspace membership.

- Members may start/stop their own timers and log their own time.
- Owners, admins, and managers may manage resource profiles, allocations, availability, and view
  other users' timesheets.
- Workspace membership is validated for every referenced user.
- Project and task references are checked against the same workspace to prevent cross-workspace
  resource linking.

The `resource_planning` billing feature is resolved through the existing entitlement service. It is
enabled in the initial plan catalog so existing workspaces can use the module while plan packaging
is refined.

## API

```text
GET  /api/workspaces/:workspaceId/resources
GET  /api/workspaces/:workspaceId/resources/forecast
GET  /api/workspaces/:workspaceId/resources/profiles
PUT  /api/workspaces/:workspaceId/resources/profiles/:userId

GET  /api/workspaces/:workspaceId/time/timer
POST /api/workspaces/:workspaceId/time/timer/start
POST /api/workspaces/:workspaceId/time/timer/heartbeat
POST /api/workspaces/:workspaceId/time/timer/stop
GET  /api/workspaces/:workspaceId/time/entries
POST /api/workspaces/:workspaceId/time/entries
GET  /api/workspaces/:workspaceId/time/timesheet

POST /api/workspaces/:workspaceId/resources/allocations
POST /api/workspaces/:workspaceId/resources/availability
```

Range-aware endpoints accept `from`, `to`, and where appropriate `userId`, `projectId`, and
`taskId` query parameters.

## Time Tracking

Running timers are exclusive per user/workspace. Starting a timer updates the existing active timer
for that user in that workspace. Stopping a timer creates a durable `TimeEntry` and removes the
timer. Manual entries calculate minutes from `startedAt` and `endedAt` unless explicit minutes are
provided.

Timesheets aggregate total, billable, and non-billable minutes with daily totals.

## Capacity and Forecasting

Resource summaries calculate:

- Workspace capacity minutes.
- Allocated minutes.
- Logged minutes.
- Utilization percentage.
- Over-allocated people.
- Under-utilized people.
- A short date-based capacity heatmap.

Forecasting is deterministic at this stage. It reports delivery risk, remaining capacity,
projected utilization, and recommended assignees based on current capacity and allocation data.
AI-powered staffing recommendations remain a future enhancement and should use the provider-agnostic
AI layer when added.

## Realtime and Activity

The service emits existing Socket.io mutation events for timer, time entry, profile, and allocation
changes. Activity events are recorded for profile updates, allocation creation, availability
creation, timer starts, and time entry creation. Resource profile updates also create audit-log
entries.

## Frontend

The `/dashboard/resources` page provides:

- Capacity, allocation, logged time, and utilization metrics.
- Running timer start/stop controls.
- Current timesheet totals.
- Forecast insights.
- Workload list with allocation status.
- Capacity heatmap.
- Staffing recommendations.

The UI reuses TanStack Query and the global mutation-feedback metadata used by the rest of the app.

## Testing

Focused backend coverage is in:

```text
apps/server/src/features/resources/services/resource.service.test.ts
```

Covered scenarios:

- Running timer start/stop creates accurate time entries.
- Members cannot manage resource profiles or allocations.
- Managers can create profiles and allocations.
- Capacity summaries detect over-allocation and availability reductions.
- Forecasts expose delivery risk and insights.

Run:

```bash
npm run test --workspace @pm/server -- src/features/resources/services/resource.service.test.ts
npm run typecheck
npm run lint
npm run build
```

## Current Limitations

- Calendar provider integrations are not implemented.
- Offline synchronization for resource data is not implemented.
- Import/export and bulk operations for resource data are not implemented.
- Forecasting is deterministic and does not call the AI provider yet.
- No load test or browser-based accessibility test has been executed for this module.
