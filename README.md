# Zenith — Work Management

[![CI](https://github.com/sahilmor/zenith/actions/workflows/ci.yml/badge.svg)](https://github.com/sahilmor/zenith/actions/workflows/ci.yml)

Zenith is a multi-tenant workspace for project and task collaboration, documents, notifications,
search, analytics, and workflow automations. It is a Turborepo monorepo with a Next.js web app, an
Express/Socket.io API, MongoDB persistence, and shared TypeScript packages.

## Repository structure

```text
apps/
  web/       Next.js application
  server/    Express, Socket.io, MongoDB, and authentication API
packages/
  config/    Shared environment schemas
  types/     Shared TypeScript contracts
  ui/        Shared UI utilities and primitives
  utils/     Shared framework-agnostic utilities
docs/        Architecture and deployment guidance
```

## Requirements and setup

- Node.js 22 LTS
- npm 10
- MongoDB connection string

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
npm install
npm run dev
```

The web app is available at `http://localhost:3000`; the API listens on `http://localhost:4000`.
Health and readiness checks are available at `/health` and `/health/ready`.

The server environment includes MongoDB, JWT secrets, CORS/client URLs, attachment storage
(Cloudinary), email delivery (SMTP or Resend), billing provider settings, and optional Stripe
credentials. See `apps/server/.env.example` for the complete list. Keep server secrets out of
`apps/web/.env` and source control.

## Core capabilities

- Workspaces, membership, invitations, projects, boards, columns, and tasks
- Task views, comments, attachments, notifications, and realtime collaboration
- Documents, spaces, pages, search, and saved searches
- Task/project analytics and report exports
- Task-triggered automations, audit logs, webhooks, and billing

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Billing](docs/billing.md)
- [Documents](docs/documents.md)
- [Search](docs/search.md)

## Common checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```
