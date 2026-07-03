# Project Management SaaS

A production-oriented Project Management SaaS monorepo built with Turborepo, Next.js 15, React 19, Express, Socket.io, MongoDB, and shared TypeScript packages.

## Repository Structure

```text
apps/
  web/       Next.js App Router application
  server/    Express and Socket.io application
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
- Docker and Docker Compose

## Setup

```bash
cp .env.example .env
npm install
```

## Development

```bash
npm run dev
```

- Web: http://localhost:3000
- Server: http://localhost:4000
- Health check: http://localhost:4000/health

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
- Shared package boundaries for contracts, configuration, UI, and utilities.
- Repository and service layers reserved for future business features.
- Environment variables validated with Zod.
- CI verifies formatting, linting, type checking, and builds.
