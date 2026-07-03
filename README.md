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

- Node.js 22+
- npm 10+
- MongoDB Atlas connection string
- Docker and Docker Compose for containerized development

## Setup

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
npm install
```

## Backend Environment Variables

| Variable                   | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| `PORT`                     | Express HTTP port. Defaults to `4000`.                |
| `NODE_ENV`                 | `development`, `test`, or `production`.               |
| `MONGODB_URI`              | MongoDB Atlas connection URI used by Mongoose.        |
| `JWT_SECRET`               | Access-token signing secret, at least 32 characters.  |
| `JWT_REFRESH_SECRET`       | Refresh-token signing secret, at least 32 characters. |
| `ACCESS_TOKEN_EXPIRES_IN`  | Access-token lifetime such as `15m`.                  |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh-token lifetime such as `7d`.                  |
| `CLIENT_URL`               | Allowed browser origin for CORS and Socket.io.        |

## Development

```bash
npm run dev
```

- Web: http://localhost:3000
- Server: http://localhost:4000
- Health check: http://localhost:4000/api/health or http://localhost:4000/health

Run only the backend with:

```bash
npm run dev -w @pm/server
```

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
  "password": "secure-password"
}
```

Creates a local user, hashes the password with bcrypt, returns an access token and refresh token, and sets the refresh token as an HTTP-only cookie.

### `POST /api/auth/login`

Request body:

```json
{
  "email": "ada@example.com",
  "password": "secure-password"
}
```

Validates credentials and returns a new access token and refresh token.

### `POST /api/auth/refresh`

Request body may include `refreshToken`; otherwise the backend reads the HTTP-only `refreshToken` cookie. Returns a fresh access token and refresh token.

### `POST /api/auth/logout`

Clears the refresh-token cookie and returns a success response.

## Backend Folder Structure

```text
apps/server/src/
  config/       Environment loading and validation
  db/           Mongoose connection, retry, state, and shutdown utilities
  features/     Feature modules with routes, controllers, services, repositories, and validation
  middleware/   Auth, validation, security, 404, and global error middleware
  routes/       API router composition and health routes
  sockets/      Socket.io server initialization
  types/        Express and authentication TypeScript declarations
  utils/        API responses, errors, logger, and async controller helpers
```

## Frontend Foundation

The Next.js app includes the authenticated application shell for this phase:

- `/login` and `/signup` provide responsive authentication forms backed by React Hook Form and Zod.
- `/dashboard` is a protected dashboard shell with sidebar navigation, navbar, breadcrumbs, profile dropdown, notification placeholder, and theme toggle.
- Providers are configured for TanStack Query, authentication state, theme preferences, and toast notifications.
- The frontend API layer centralizes backend requests, token attachment, refresh-token retry, and normalized API errors.

Product modules such as workspaces, projects, boards, tasks, comments, notifications, calendar, analytics, and team management remain intentionally out of scope for this phase.

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
