# Project Management SaaS

A production-oriented Project Management SaaS monorepo built with Turborepo, Next.js 15, React 19, Express, Socket.io, MongoDB, and shared TypeScript packages.

## Repository Structure

```text
apps/
  web/       Next.js App Router application
  server/    Express, Socket.io, MongoDB, and authentication API
packages/
  config/    Shared environment schemas
  types/     Shared TypeScript contracts
  ui/        Shared UI utilities and primitives
  utils/     Shared framework-agnostic utilities
docker/      Development container definitions
docs/        Architecture notes
```

## Prerequisites

- Node.js 22 LTS
- npm 10
- MongoDB Atlas connection string
- Docker and Docker Compose for containerized development

## Setup

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
npm install
```

## Backend Environment Variables

| Variable                   | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `PORT`                     | Express HTTP port. Defaults to `4000`.                    |
| `NODE_ENV`                 | `development`, `test`, or `production`.                   |
| `MONGODB_URI`              | MongoDB Atlas connection URI used by Mongoose.            |
| `JWT_SECRET`               | Access-token signing secret, at least 32 characters.      |
| `JWT_REFRESH_SECRET`       | Refresh-token signing secret, at least 32 characters.     |
| `ACCESS_TOKEN_EXPIRES_IN`  | Access-token lifetime such as `15m`.                      |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh-token lifetime such as `7d`.                      |
| `REFRESH_COOKIE_DOMAIN`    | Optional cookie domain for shared parent-domain deploys.  |
| `CLIENT_URL`               | Canonical browser URL for links and defaults.             |
| `CORS_ORIGINS`             | Comma-separated trusted browser origins for REST/socket.  |
| `CLOUDINARY_CLOUD_NAME`    | Cloudinary cloud name from the Cloudinary dashboard.      |
| `CLOUDINARY_API_KEY`       | Cloudinary API key used for attachment uploads.           |
| `CLOUDINARY_API_SECRET`    | Cloudinary API secret used for attachment uploads.        |
| `SMTP_HOST`                | SMTP host used to send workspace invitations.             |
| `SMTP_PORT`                | SMTP port, commonly `587` or `465`.                       |
| `SMTP_USER`                | SMTP username.                                            |
| `SMTP_PASS`                | SMTP password.                                            |
| `SMTP_FROM`                | Verified sender email for workspace invitations.          |
| `RESEND_API_KEY`           | Preferred staging/prod email provider API key.            |
| `APP_URL`                  | Frontend URL used to build invitation accept links.       |
| `AI_PROVIDER`              | AI provider: `local`, `openai`, `anthropic`, or `gemini`. |
| `AI_MODEL`                 | Provider model name. Defaults to `local-deterministic`.   |
| `OPENAI_API_KEY`           | Optional OpenAI API key when `AI_PROVIDER=openai`.        |
| `ANTHROPIC_API_KEY`        | Optional Anthropic API key when `AI_PROVIDER=anthropic`.  |
| `GEMINI_API_KEY`           | Optional Gemini API key when `AI_PROVIDER=gemini`.        |
| `BILLING_ENABLED`          | Enables checkout and billing mutations when `true`.       |
| `BILLING_PROVIDER`         | Billing provider adapter: `local` or `stripe`.            |
| `BILLING_SUCCESS_URL`      | Checkout success redirect URL.                            |
| `BILLING_CANCEL_URL`       | Checkout cancellation redirect URL.                       |
| `STRIPE_SECRET_KEY`        | Server-only Stripe API key for test/prod checkout.        |
| `STRIPE_WEBHOOK_SECRET`    | Server-only Stripe webhook signing secret.                |
| `STRIPE_*_PRICE_ID`        | Server-only Stripe price IDs for Pro/Business intervals.  |

Cloudinary credentials are server-only values. Do not add them to `apps/web/.env`, commit them to
`.env.example`, or expose them in client-side code. If a Cloudinary API secret is pasted into chat,
logs, or source control, rotate it in the Cloudinary dashboard before using uploads again.

## Development

```bash
npm run dev
```

- Web: http://localhost:3000
- Server: http://localhost:4000
- Health check: http://localhost:4000/health and readiness at http://localhost:4000/health/ready

Run only the backend with:

```bash
npm run dev -w @pm/server
```

## Deployment

Staging and production deployment guidance is maintained in
[docs/deployment.md](docs/deployment.md). It covers the Vercel frontend, Railway backend,
MongoDB Atlas, Cloudinary, Resend, AI providers, cross-origin authentication, Socket.io, health
checks, staging smoke tests, production checklists, and rollback procedures.

Billing architecture, entitlement enforcement, provider setup, and test-mode guidance are documented
in [docs/billing.md](docs/billing.md).

Strategic planning architecture for Goals, OKRs, Initiatives, Portfolios, and cross-project roadmap
views is documented in [docs/strategic-planning.md](docs/strategic-planning.md).

Customization architecture for custom fields, task types, workflows, forms, and templates is
documented in [docs/customization.md](docs/customization.md).

Documents, spaces, pages, blocks, publishing, and document comments are documented in
[docs/documents.md](docs/documents.md).

Universal search, saved searches, knowledge indexing, search analytics, and AI retrieval are
documented in [docs/search.md](docs/search.md).

Resource management, time tracking, capacity planning, and workforce forecasting are documented in
[docs/resource-management.md](docs/resource-management.md).

CRM accounts, contacts, leads, deals, sales activity, customer health, and customer-success
foundation APIs are documented in [docs/crm.md](docs/crm.md).

## Authentication API

All API responses use this envelope:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {},
  "errors": null,
  "timestamp": "2026-07-03T00:00:00.000Z"
}
```

### `POST /api/auth/signup`

Request body:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "SecurePass1"
}
```

Creates a local user, hashes the password with bcrypt, stores a hashed email-verification token,
returns an access token and refresh token, and sets the refresh token as an HTTP-only cookie.
Passwords must be 8-128 characters and include uppercase, lowercase, and numeric characters.

### `POST /api/auth/login`

Request body:

```json
{
  "email": "ada@example.com",
  "password": "SecurePass1"
}
```

Validates credentials and returns a new access token and refresh token.

### `POST /api/auth/refresh`

Request body may include `refreshToken`; otherwise the backend reads the HTTP-only `refreshToken` cookie. Returns a fresh access token and refresh token.

### `POST /api/auth/logout`

Clears the refresh-token cookie and returns a success response.

### Account Recovery And Verification

```text
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-email
POST /api/auth/resend-verification
```

Password reset and email verification links are delivered through SMTP when SMTP variables are
configured. Tokens are stored hashed in MongoDB and expire automatically by validation window.

## Workspace API

All workspace routes require a bearer access token. Workspaces are soft-deleted by setting
`archived: true`, so archived workspaces are excluded from normal list responses.

### Roles

Workspace roles are `owner`, `admin`, `manager`, `member`, and `guest`.

- `owner`: full access.
- `admin`: manages members, projects, and workspace settings.
- `manager`: foundation role for managing projects, boards, and tasks.
- `member`: foundation role for creating and updating tasks.
- `guest`: read-only foundation role.

Only owners and admins can invite members, remove members, update workspace settings, or archive a
workspace. The last owner cannot leave, be removed, or be demoted.

### Endpoints

```text
POST   /api/workspaces
GET    /api/workspaces
GET    /api/workspaces/:workspaceId
PATCH  /api/workspaces/:workspaceId
DELETE /api/workspaces/:workspaceId
POST   /api/workspaces/:workspaceId/invitations
GET    /api/workspaces/:workspaceId/invitations
GET    /api/workspaces/:workspaceId/members
PATCH  /api/workspaces/:workspaceId/members/:memberId
DELETE /api/workspaces/:workspaceId/members/:memberId
POST   /api/workspaces/invitations/accept
POST   /api/workspaces/:workspaceId/leave
```

Workspace names do not need to be unique. Slugs are generated automatically and made unique with a
numeric suffix such as `design`, `design-1`, and `design-2`.

Invitation emails are sent through SMTP. The accept link points to
`/invitations/accept?token=...`; accepting requires the signed-in user email to match the invited
email address.

## Project API

Projects belong to exactly one workspace. Project keys are uppercase and unique within a workspace,
such as `ZEN`, `WEB`, or `API`. Archived projects remain readable but cannot be modified until they
are restored.

Owners, admins, and managers can create, update, archive, restore, and delete projects. Members and
guests can view projects in workspaces where they have active membership.

```text
POST   /api/workspaces/:workspaceId/projects
GET    /api/workspaces/:workspaceId/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
POST   /api/projects/:projectId/archive
POST   /api/projects/:projectId/restore
```

## Board And Column API

Boards belong to one project and one workspace. Each new board creates four ordered default columns:
`Todo`, `In Progress`, `Review`, and `Done`. Deleting a board archives it instead of permanently
removing it. Columns are ordered by `order`, can be reordered through the API, and are soft-archived
when deleted.

Owners, admins, and managers can create boards, update boards, archive or restore boards, and manage
columns. Members and guests can view boards and columns for projects in workspaces where they have
active membership.

```text
POST   /api/projects/:projectId/boards
GET    /api/projects/:projectId/boards
GET    /api/boards/:boardId
PATCH  /api/boards/:boardId
DELETE /api/boards/:boardId
POST   /api/boards/:boardId/archive
POST   /api/boards/:boardId/restore
POST   /api/boards/:boardId/columns
GET    /api/boards/:boardId/columns
PATCH  /api/columns/:columnId
DELETE /api/columns/:columnId
POST   /api/boards/:boardId/reorder-columns
```

## Task And Subtask API

Tasks belong to one column and inherit workspace, project, and board ownership from that column.
Tasks are soft-deleted with `archived: true`, keep a persisted numeric `order`, and can move within
the same column or across columns. Columns remain fixed; only task cards are draggable in the web
Kanban view.

Owners, admins, managers, and members can create, update, archive, restore, and reorder tasks.
Guests can read tasks and subtasks only.

```text
POST   /api/columns/:columnId/tasks
GET    /api/columns/:columnId/tasks
GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId
POST   /api/tasks/:taskId/archive
POST   /api/tasks/:taskId/restore
GET    /api/tasks
PATCH  /api/tasks/bulk
POST   /api/tasks/reorder
POST   /api/tasks/:taskId/subtasks
GET    /api/tasks/:taskId/subtasks
PATCH  /api/subtasks/:subtaskId
DELETE /api/subtasks/:subtaskId
```

`POST /api/tasks/reorder` accepts a board snapshot:

```json
{
  "boardId": "64f000000000000000000001",
  "columns": [
    { "columnId": "64f000000000000000000010", "taskIds": ["64f000000000000000000100"] },
    { "columnId": "64f000000000000000000011", "taskIds": [] }
  ]
}
```

The backend validates that every supplied column and task belongs to the board and rejects duplicate
task IDs before persisting placement changes.

`GET /api/tasks` powers Calendar, Table, Timeline, and My Tasks from the same task records used by
Kanban. It supports workspace/project/board/column scope, status, priority, labels, assignee,
reporter, creator, watcher, date-range, search, sorting, and pagination filters. `PATCH
/api/tasks/bulk` applies shared task updates such as priority, labels, due dates, assignment,
archive state, and column movement after checking workspace permissions for every selected task.

## Task Collaboration API

Tasks support comments with nested replies, mention metadata, Cloudinary-backed attachments, task
activity, reusable labels, watchers, realtime sync, and persistent notification delivery.

Attachment uploads use multipart form data with a `file` field. Supported upload types are images,
PDF, DOCX, XLSX, PPTX, and ZIP, with a 10 MB maximum file size. Attachment deletion also removes the
Cloudinary asset.

Mentions are parsed from comment content using `@[Name](user:<userId>)` or `@<userId>` syntax and
stored as `mentionedUserIds`.

```text
POST   /api/tasks/:taskId/comments
GET    /api/tasks/:taskId/comments
PATCH  /api/comments/:commentId
DELETE /api/comments/:commentId
POST   /api/comments/:commentId/replies
POST   /api/tasks/:taskId/attachments
GET    /api/tasks/:taskId/attachments
DELETE /api/attachments/:attachmentId
GET    /api/tasks/:taskId/activity
POST   /api/tasks/:taskId/watch
DELETE /api/tasks/:taskId/watch
GET    /api/tasks/:taskId/labels
POST   /api/tasks/:taskId/labels
PATCH  /api/labels/:labelId
DELETE /api/tasks/:taskId/labels/:labelId
```

## Notification API

Notifications are stored in MongoDB and delivered through Socket.io to user-specific rooms. They
support pagination, read state synchronization, search, filtering, sorting, and user preference flags
for in-app, email foundation, assignments, comments, mentions, due dates, and workspace events.

```text
GET    /api/notifications
GET    /api/notifications/unread-count
GET    /api/notifications/preferences
PATCH  /api/notifications/preferences
PATCH  /api/notifications/:notificationId/read
PATCH  /api/notifications/read-all
DELETE /api/notifications/:notificationId
DELETE /api/notifications
```

Implemented notification types include task assignment changes, task mentions, comment mentions,
comment replies, task movement, due-date foundations, workspace invitations, workspace role changes,
project creation, board creation, attachment uploads, task archival/restoration, and system
announcements.

## Analytics And Reporting API

Analytics are computed from the existing workspace, project, board, column, task, member, and
activity models. No duplicate task records are created. All routes require authentication and verify
active workspace membership before returning scoped data or exports.

```text
GET /api/analytics/dashboard?workspaceId=:workspaceId
GET /api/analytics/workspace/:workspaceId
GET /api/analytics/projects/:projectId
GET /api/analytics/boards/:boardId
GET /api/analytics/users/:userId?workspaceId=:workspaceId
GET /api/analytics/reports
```

Dashboard and scoped analytics responses include:

- KPI metrics: total, open, completed, archived, overdue, upcoming, completion rate, cycle time,
  lead time, velocity, overdue percentage, and productivity score foundation.
- Distributions by status, priority, assignee, label, and column.
- Completed-task and activity trends.
- Recently updated tasks, team activity, project progress, board progress, and workload signals.

Reports support `scope=workspace|project|board|user|labels|dueDates|completion`, optional date,
status, priority, and search filters, plus `format=json|csv|xlsx|pdf`. CSV, Excel, and PDF responses
are returned as authenticated downloads.

## Strategic Planning API

Goals, key results, initiatives, portfolios, and strategic links belong to one workspace and are
protected by workspace membership, role checks, and billing entitlements. Strategic resources can
roll progress up from key results, child goals, weighted links, projects, and tasks without creating
duplicate task or project records.

```text
GET    /api/workspaces/:workspaceId/goals
POST   /api/workspaces/:workspaceId/goals
GET    /api/goals/:goalId
PATCH  /api/goals/:goalId
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
GET    /api/workspaces/:workspaceId/portfolios
POST   /api/workspaces/:workspaceId/portfolios
GET    /api/workspaces/:workspaceId/strategic-links
POST   /api/strategic-links
DELETE /api/strategic-links/:linkId
GET    /api/workspaces/:workspaceId/strategic-dashboard
```

Frontend routes `/dashboard/goals`, `/dashboard/goals/:goalId`, `/dashboard/initiatives`,
`/dashboard/portfolios`, and `/dashboard/roadmap` provide the initial strategic planning workspace.
See [docs/strategic-planning.md](docs/strategic-planning.md) for rollup rules, entitlements, and
current boundaries.

## Customization API

Custom fields, task types, workflows, intake forms, and templates are workspace-scoped and protected
by workspace membership, role checks, and billing entitlements. Tasks store task type, workflow state,
and typed custom-field values; field definitions remain reusable workspace configuration.

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

Frontend routes `/dashboard/customization` and `/forms/:slug` provide the initial configuration
console and public form experience. See [docs/customization.md](docs/customization.md) for value
storage, production-ready field types, workflow behavior, and current foundations.

## AI Copilot, Prompts, And Automation API

The AI layer is provider-agnostic. Application services talk to a shared provider interface, while
provider adapters handle OpenAI, Anthropic, Gemini, or the deterministic local provider used for
development and tests. Provider selection is controlled by environment variables, so business logic
does not depend on a single SDK.

AI context is built from existing workspace, project, board, and task records after checking active
workspace membership. Prompts explicitly exclude secrets, credentials, and hidden metadata. AI and
automation actions write audit-style activity records where applicable.

```text
GET   /api/ai/conversations?workspaceId=:workspaceId
POST  /api/ai/chat
POST  /api/ai/chat/stream
PATCH /api/ai/conversations/:conversationId
POST  /api/ai/actions
POST  /api/ai/search

GET    /api/ai/prompts?workspaceId=:workspaceId
POST   /api/ai/prompts
PATCH  /api/ai/prompts/:promptId
DELETE /api/ai/prompts/:promptId

GET    /api/ai/automations?workspaceId=:workspaceId
POST   /api/ai/automations
PATCH  /api/ai/automations/:ruleId
DELETE /api/ai/automations/:ruleId
POST   /api/ai/automations/:ruleId/test
```

Supported AI action categories include task generation, subtask/checklist generation, task/project/
workspace summaries, comment-thread summaries, meeting notes, release notes, priority/label/due-date/
assignee suggestions, description rewriting, translation, duplicate detection, related-task
suggestions, and recurring-template foundation.

Natural-language AI search converts requests such as “show high-priority backend bugs” into the
existing task-list filters, then returns only tasks the current user can access.

Automation rules support triggers such as task created, task updated, task moved, task assigned, task
completed, due-date reached, comment added, attachment uploaded, and invitation accepted. Actions
include assigning users, moving tasks, changing status or priority, creating comments, sending
notifications, calling AI, and webhook/email foundations.

## Backend Folder Structure

```text
apps/server/src/
  config/       Environment loading and validation
  db/           Mongoose connection, retry, state, and shutdown utilities
  features/     Feature modules with routes, controllers, services, repositories, and validation
  middleware/   Auth, validation, security, 404, and global error middleware
  routes/       API router composition and health routes
  sockets/      Socket.io auth, rooms, presence, event handlers, and emitters
  types/        Express and authentication TypeScript declarations
  utils/        API responses, errors, logger, and async controller helpers
```

Board and column code lives in `apps/server/src/features/boards` and follows the same model,
repository, service, controller, route, and validation structure as workspace and project features.
Task and subtask code lives in `apps/server/src/features/tasks` with the same layered structure.
Task collaboration models include `Comment`, `Attachment`, `TaskActivity`, `TaskWatcher`, and
`TaskLabel`.
Notification code lives in `apps/server/src/features/notifications` with `Notification` and
`NotificationPreference` models plus repository, service, controller, route, validation, factory, and
event-mapping helpers.
Analytics code lives in `apps/server/src/features/analytics` with repository, service, controller,
route, validation, and export helpers layered over the existing task hierarchy.
AI and automation code lives in `apps/server/src/features/ai` with provider adapters, prompt/context
services, conversation management, automation rules, execution audit records, controllers, routes,
and Zod validation.
Strategic planning code lives in `apps/server/src/features/strategic` with models for goals, key
results, check-ins, initiatives, portfolios, strategic links, and status updates.
Customization code lives in `apps/server/src/features/customization` with models for custom field
definitions, task types, workflows, intake forms, form submissions, and templates.

## Frontend Foundation

The Next.js app includes the authenticated application shell for this phase:

- `/login` and `/signup` provide responsive authentication forms backed by React Hook Form and Zod.
- `/dashboard` is a protected workspace dashboard shell with sidebar navigation, navbar, breadcrumbs, profile dropdown, workspace switcher, and theme toggle.
- `/dashboard/projects` lists and creates projects for the selected workspace.
- `/dashboard/projects/:projectId` shows project details.
- `/dashboard/projects/:projectId/settings` manages project identity, visibility, archive, restore, and delete actions.
- `/dashboard/projects/:projectId/boards` manages project boards, fixed workflow columns, draggable task cards, task creation, rich task details, subtasks, comments, attachments, labels, watch state, and activity.
- `/dashboard/tasks/calendar`, `/dashboard/tasks/table`, `/dashboard/tasks/timeline`,
  `/dashboard/tasks/my`, and `/dashboard/tasks/saved-views` provide alternate task views backed by
  the same Task API and persisted view/filter preferences.
- `/dashboard/insights` provides a customizable executive widget dashboard with persisted layout,
  date ranges, widget resizing, reordering, addition, and removal.
- `/dashboard/analytics` provides workspace charts for status, priority, velocity, flow, project
  progress, and board progress.
- `/dashboard/reports` previews filtered task reports and exports CSV, Excel, and PDF files.
- `/dashboard/ai` opens the global AI Copilot experience and documents supported assistant actions.
- `/dashboard/automations` provides a visual rule builder for triggers, conditions, actions, and
  automation testing.
- `/dashboard/prompts` manages reusable workspace/project/global prompts with variable detection and
  versioning foundation.
- `/dashboard/goals`, `/dashboard/goals/:goalId`, `/dashboard/initiatives`,
  `/dashboard/portfolios`, and `/dashboard/roadmap` provide Goals, OKRs, initiatives, portfolios,
  and cross-project planning views backed by the strategic-planning API.
- `/dashboard/customization` manages custom fields, task types, workflows, forms, and templates.
- `/forms/:slug` renders public intake forms without exposing workspace internals.
- `/dashboard/boards/:boardId/settings` manages board identity, archive, and restore actions.
- `/dashboard/workspace/members` manages workspace members, roles, removals, and invitations.
- `/dashboard/workspace/settings` manages workspace identity and settings.
- `/dashboard/notifications` provides the persistent user inbox with search, unread filtering, read
  actions, deletion, and notification preferences.
- `/invitations/accept` accepts workspace invitation tokens for authenticated users.
- Providers are configured for TanStack Query, authentication state, theme preferences, and toast
  notifications.
- The frontend API layer centralizes backend requests, token attachment, refresh-token retry, and normalized API errors.
- The workspace provider restores the selected workspace and automatically creates a default workspace when an authenticated user has none.
- The realtime provider connects authenticated Socket.io clients, joins the current workspace, and exposes reusable presence, typing, room, task, comment, and notification hooks.
- The global feedback layer connects TanStack Query mutations to a shared toast manager for loading,
  success, error, retry, dismissal, queueing, and upload-progress states without page-specific toast
  duplication.
- The AI Copilot sidebar is available globally in the dashboard via the navbar AI button or
  Cmd/Ctrl + I, with conversation history, natural-language search, markdown-style output, and
  context-aware responses.

Time tracking, sprint management, marketplace, public plugins, enterprise SSO, and third-party CRM
integrations remain intentionally out of scope.

The Kanban board uses `@dnd-kit` with pointer and keyboard sensors. Task moves are optimistically
written into TanStack Query column caches and rolled back automatically if the reorder request fails.

## Realtime Collaboration

Socket.io is layered on top of the REST API. REST remains the source of truth; socket events notify
authorized clients that a resource changed so TanStack Query can refetch or reconcile local optimistic
state.

- Socket connections authenticate with the access token in `socket.handshake.auth.token`.
- Users can join `workspace`, `project`, `board`, and `task` rooms only when they have active
  workspace membership for the resource.
- Presence snapshots track online users, multiple browser tabs, last seen, and active users in the
  same room.
- Typing indicators are scoped to task rooms and auto-expire to avoid noisy traffic.
- Realtime mutation events cover workspace, project, board, column, task, comment, attachment, label,
  watcher, and member changes.
- Notification events are delivered to user-specific rooms for persisted notifications. Read,
  delete, clear, and unread-count changes emit notification mutation events so open tabs stay in
  sync without global broadcasts.

Frontend hooks live in `apps/web/src/features/realtime`:

```text
useSocket()
usePresence()
useTyping()
useRealtimeTasks()
useRealtimeComments()
useRealtimeNotifications()
```

## Enterprise Operations

Phase 15 adds production operations foundations without changing existing product APIs.

- Request IDs are assigned to every HTTP request and returned through `x-request-id`.
- Production logs are structured JSON with method, path, status, duration, request id, IP, and user id.
- Health endpoints:
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /api/health/live`
  - `GET /api/health/ready`
- Readiness reports MongoDB connection state and background job processor status.
- Rate limiting is configurable with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.
- Helmet, CORS, cookie security, JWT validation, Zod request validation, and workspace RBAC remain centralized middleware concerns.

Operational APIs live under `POST/GET/PATCH/DELETE /api/ops/*` and require authentication. Platform
operations such as audit log search, feature flag management, and job inspection require a user with
`role: admin`; workspace-scoped webhook and API key management additionally checks workspace
owner/admin membership.

- `GET /api/ops/audit-logs` lists administrative/security events with filtering and pagination.
- `GET /api/ops/feature-flags` lists feature flags.
- `PUT /api/ops/feature-flags` creates or updates global/workspace/user flags.
- `GET /api/ops/feature-flags/:key/evaluate` evaluates a flag for the current user and optional workspace.
- `GET /api/ops/jobs` lists background jobs.
- `POST /api/ops/jobs` queues a background job.
- `POST /api/ops/jobs/process` runs a processor tick for controlled environments/tests.
- `POST /api/ops/webhooks` creates a signed outbound webhook for a workspace.
- `GET /api/ops/webhooks?workspaceId=...` lists workspace webhooks.
- `DELETE /api/ops/webhooks/:webhookId?workspaceId=...` deletes a workspace webhook.
- `POST /api/ops/api-keys` creates a scoped public API key. The raw key is shown only once.
- `DELETE /api/ops/api-keys/:keyId?workspaceId=...` revokes an API key.

Audit events currently cover authentication and automation execution foundations, and the audit
service is reusable from workspace/project/board/task administrative flows.

Outbound webhooks are HMAC-signed with `x-zenith-signature: sha256=<signature>` and include
`x-zenith-event`. Supported emitted events include:

- `task.created`
- `task.updated`
- `task.deleted`
- `comment.created`
- `attachment.uploaded`

Versioned public API foundation:

- `GET /api/v1/tasks`
- Authenticate with `Authorization: Bearer <api-key>` or `x-api-key`.
- Requires the `tasks:read` scope or `*`.
- Responses use the same API envelope and are scoped to the API key workspace.

## Deployment

Production Dockerfiles live in `docker/server.Dockerfile` and `docker/web.Dockerfile`.

```bash
cp .env.example .env
docker compose up --build
```

For production:

- Frontend: deploy `apps/web` to Vercel with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`.
- Backend: deploy `apps/server` to Railway, Render, or a Docker VPS using `docker/server.Dockerfile`.
- Database: use MongoDB Atlas with scheduled snapshots and point-in-time restore where available.
- Storage: configure Cloudinary through `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Email: configure SMTP or Resend SMTP-compatible credentials through `SMTP_*`.
- AI: use `AI_PROVIDER=local` by default, or configure OpenAI/Anthropic/Gemini keys.

Zero-downtime deployment guidance:

- Run database-compatible code before enabling new feature flags.
- Deploy backend first, then frontend.
- Use `/health/ready` for load balancer readiness.
- Send `SIGTERM` to allow graceful HTTP, Socket.io, job processor, and MongoDB shutdown.
- Keep webhook/API key secrets outside source control.

Backup and recovery:

- Enable daily MongoDB Atlas snapshots with a retention policy matching the business SLA.
- Export critical workspace/project/task data before high-risk migrations.
- Cloudinary assets should be covered by provider backups or periodic export jobs.
- Test restore procedures in a staging environment at least monthly.

Operational runbook:

- 5xx spike: check structured logs by `requestId`, verify `/health/ready`, inspect MongoDB latency.
- Failed webhook delivery: inspect `failureCount` and `lastFailureAt`, validate endpoint TLS and signature verification.
- Job backlog: inspect `/api/ops/jobs?status=queued`, increase worker capacity, or process a controlled tick.
- Suspected account abuse: lower `RATE_LIMIT_MAX`, review `user.login_failed` audit entries, revoke affected API keys.

## Docker Development

```bash
cp .env.example .env
docker compose up --build
```

## Quality Gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run test -w @pm/server
npm run test -w @pm/web
```

## Architecture Principles

- Strict TypeScript across every workspace.
- Feature-based application structure.
- Repository, service, and controller layers for backend features.
- Shared package boundaries for contracts, configuration, UI, and utilities.
- Environment variables validated with Zod.
- API responses use a consistent envelope.
- Global error handling normalizes validation, database, JWT, and unknown errors.
- CI verifies formatting, linting, type checking, and builds.
