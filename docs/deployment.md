# Zenith Deployment Runbook

This document describes the staging and production deployment path for the Zenith monorepo.

## Target Topology

Browser traffic terminates at Vercel for the Next.js frontend. The frontend calls the Railway-hosted Express API over HTTPS and connects to the same Railway service for Socket.io. The backend connects to MongoDB Atlas, Cloudinary, Resend or SMTP, and the configured AI provider.

REST APIs remain the source of truth. Socket.io is used only to synchronize authorized state changes across connected clients.

## Node.js

Use Node.js 22 LTS and npm 10 everywhere:

- Local: `.nvmrc`
- CI: `.github/workflows/ci.yml`
- Docker: `node:22-alpine`
- Vercel/Railway: respect `package.json` `engines`

Do not deploy with experimental Node.js releases.

## Environment Variables

Never commit real secrets. Server-only variables must be configured only on Railway or local server environments. Only `NEXT_PUBLIC_*` values may be exposed to the browser.

### Server Required

| Variable             | Scope         | Notes                                                        |
| -------------------- | ------------- | ------------------------------------------------------------ |
| `NODE_ENV`           | server        | `production` for staging/prod deploys.                       |
| `PORT`               | server        | Railway provides this automatically. Do not hardcode.        |
| `MONGODB_URI`        | server secret | MongoDB Atlas connection string.                             |
| `JWT_SECRET`         | server secret | At least 32 characters.                                      |
| `JWT_REFRESH_SECRET` | server secret | At least 32 characters and different from `JWT_SECRET`.      |
| `CLIENT_URL`         | server        | Canonical frontend URL.                                      |
| `CORS_ORIGINS`       | server        | Comma-separated trusted frontend origins.                    |
| `APP_URL`            | server        | URL used in emails for verification, reset, and invitations. |

### Server Optional Integrations

| Variable                                                        | Scope             | Notes                                                                                                 |
| --------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `REFRESH_COOKIE_DOMAIN`                                         | server            | Leave empty for Vercel/Railway cross-site deployments. Set only for shared parent-domain deployments. |
| `CLOUDINARY_CLOUD_NAME`                                         | server secret-ish | Required for attachment uploads.                                                                      |
| `CLOUDINARY_API_KEY`                                            | server secret     | Required for attachment uploads.                                                                      |
| `CLOUDINARY_API_SECRET`                                         | server secret     | Required for attachment deletion.                                                                     |
| `RESEND_API_KEY`                                                | server secret     | Preferred staging/prod transactional email provider.                                                  |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | server secret     | SMTP fallback. `SMTP_FROM` is also used as the Resend sender.                                         |
| `AI_PROVIDER`                                                   | server            | `local`, `openai`, `anthropic`, or `gemini`.                                                          |
| `AI_MODEL`                                                      | server            | Provider model name.                                                                                  |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`         | server secret     | Required only for the chosen provider.                                                                |
| `WEBHOOK_SIGNING_SECRET`                                        | server secret     | Required for webhook payload signing.                                                                 |
| `PUBLIC_API_KEY_PREFIX`                                         | server            | Prefix for generated public API keys.                                                                 |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`                        | server            | In-memory limiter settings.                                                                           |

### Frontend Required

| Variable                 | Scope        | Notes                                                                     |
| ------------------------ | ------------ | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`    | browser-safe | Railway API URL, for example `https://zenith-api-staging.up.railway.app`. |
| `NEXT_PUBLIC_SOCKET_URL` | browser-safe | Same Railway API URL unless Socket.io is hosted separately.               |

## Vercel Frontend

Use the root `vercel.json` from the monorepo root:

- Install command: `npm ci`
- Build command: `npm run build -w @pm/web`
- Output directory: `apps/web/.next`
- Framework: Next.js
- Environment variables:
  - `NEXT_PUBLIC_API_URL=https://<railway-api-domain>`
  - `NEXT_PUBLIC_SOCKET_URL=https://<railway-api-domain>`

If configuring through the Vercel UI, keep the project root at the repository root so workspace packages resolve consistently.

Cloudinary images are rendered from URLs returned by the API. If Next Image optimization is introduced later, add the Cloudinary domain to `next.config.ts`.

## Railway Backend

Use `railway.json` from the repository root:

- Builder: Nixpacks
- Build command: `npm ci && npm run build -w @pm/server`
- Start command: `npm run start -w @pm/server`
- Health check: `/health/ready`

The server listens on `PORT` from the platform. Node binds to all interfaces when no hostname is provided, which is suitable for Railway.

Set Railway variables:

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLIENT_URL=https://<vercel-staging-domain>
CORS_ORIGINS=https://<vercel-staging-domain>
APP_URL=https://<vercel-staging-domain>
RESEND_API_KEY=...
SMTP_FROM=no-reply@your-verified-domain.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Leave `REFRESH_COOKIE_DOMAIN` empty unless the frontend and backend share a parent domain and you intentionally want a domain cookie.

## Cross-Origin Authentication

The frontend sends bearer access tokens and uses `credentials: include` for refresh/logout flows. In production, refresh cookies are `httpOnly`, `Secure`, and `SameSite=None`, which supports Vercel/Railway cross-site deployments while still requiring the explicit CORS allowlist.

Do not use wildcard CORS with credentials. Add only trusted frontend origins to `CORS_ORIGINS`.

## Socket.io

Socket.io uses the same CORS allowlist as REST. Configure:

- `NEXT_PUBLIC_SOCKET_URL=https://<railway-api-domain>`
- `CORS_ORIGINS=https://<vercel-staging-domain>,https://<production-domain>`

Horizontal scaling note: a single Railway instance does not need a Socket.io adapter. Multiple backend instances require a shared adapter, typically Redis, to synchronize rooms and broadcasts.

## MongoDB Atlas

Recommended staging setup:

- Dedicated staging cluster or database.
- Least-privilege database user.
- IP/network access restricted to hosting provider egress where practical.
- Backups enabled before staging smoke tests that mutate data.
- Use `MONGODB_URI` only; never log credentials.

Indexes are declared in Mongoose models. For large production collections, create high-impact indexes during a controlled maintenance window and monitor build progress.

## Cloudinary

Configure only on the backend:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Smoke test image, PDF, office document, and ZIP uploads. Validate oversized and invalid file failures. Deleting an attachment should also request provider-side deletion.

## Resend Email

Resend is preferred for staging/prod. Configure:

- `RESEND_API_KEY`
- `SMTP_FROM=no-reply@verified-domain.com`
- `APP_URL=https://<frontend-domain>`

Domain verification must be completed in Resend before using a production sender. If `RESEND_API_KEY` is absent, the server falls back to SMTP when all SMTP variables are configured. If neither is configured, email-sending flows are skipped gracefully by the auth service where supported.

## AI Providers

Set `AI_PROVIDER=local` when no external provider is configured. External providers require the matching server-only API key. Provider API keys must never use `NEXT_PUBLIC_*`.

Smoke test provider selection, streaming, cancellation, and permission-safe context in staging before enabling AI broadly.

## Background Jobs

The current job runner is in-process and polls MongoDB. Run one backend worker/scheduler instance unless a distributed locking strategy is added. Multiple schedulers can duplicate work if they claim the same job concurrently without coordination.

## Health Checks

- `/health` checks basic process health.
- `/health/live` checks process liveness and uptime.
- `/health/ready` checks MongoDB readiness and job polling state.

Do not expose secrets or connection strings from health responses.

## CI/CD

GitHub Actions runs:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Vercel and Railway native deploys should run only after CI passes on the target branch.

## Staging Smoke Checklist

- Frontend deployed on Vercel.
- Backend deployed on Railway.
- `/health/ready` returns `ready`.
- MongoDB Atlas connected.
- CORS preflight succeeds from the Vercel domain.
- Signup, login, refresh, logout work after browser refresh.
- Verification, password reset, and workspace invitation emails arrive through Resend.
- Workspace, project, board, column, task, subtask, comment, label, watcher, and notification flows work.
- Task reorder within a column persists after refresh.
- Task move across columns persists after refresh.
- Two authenticated sessions receive realtime task/comment/notification updates.
- Cloudinary upload, preview/download, and delete work.
- AI is either functional or visibly disabled without crashing.
- Light/dark theme switching persists.
- Calendar, table, timeline, reports, analytics, and AI pages render without console errors.

## Production Checklist

- Custom production frontend and API domains configured.
- `CORS_ORIGINS` restricted to production domains.
- `NODE_ENV=production`.
- Strong JWT and webhook secrets rotated from staging.
- Resend production domain verified.
- MongoDB Atlas backups and retention configured.
- Atlas network restrictions reviewed.
- Cloudinary production account/folder strategy configured.
- Monitoring and alerting enabled.
- Error tracking provider selected or explicitly deferred.
- Rate-limit strategy reviewed for multi-instance deployment.
- Socket.io Redis adapter plan approved before horizontal scaling.
- Data retention, privacy policy, terms, and support process ready.
- Rollback owner and procedure confirmed.

## Rollback

Frontend rollback:

1. Use Vercel deployment history to promote the last known good deployment.
2. Restore frontend environment variables if they changed.
3. Verify login and dashboard load.

Backend rollback:

1. Use Railway deployment history to redeploy the last known good build.
2. Restore Railway variables if the failed release changed them.
3. Verify `/health/ready`, auth refresh, and Socket.io connection.

Database rollback:

1. Prefer forward-compatible schema changes.
2. For destructive or large data changes, take an Atlas backup first.
3. Restore from Atlas backup only after confirming data-loss impact and downtime window.

Environment rollback:

1. Keep a sanitized record of variable names changed per release.
2. Reapply previous values from the secret manager or hosting dashboard.
3. Never paste secrets into issue trackers or logs.

## Known Deployment Limitations

- The rate limiter is in-memory and per-instance. Use Redis or a managed limiter before multi-instance production scale.
- Background jobs are in-process. Use a dedicated worker and distributed locking before running multiple backend replicas.
- Socket.io requires a shared adapter before horizontal scaling.
- Docker image builds require a running Docker daemon and were not run by CI unless explicitly added later.
