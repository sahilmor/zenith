# Architecture

The platform is organized as a Turborepo monorepo with deployable applications in `apps/` and shared libraries in `packages/`.

- `apps/web` contains the Next.js App Router client.
- `apps/server` contains the Express and Socket.io runtime.
- `packages/types` centralizes shared TypeScript contracts.
- `packages/utils` centralizes framework-agnostic helpers.
- `packages/config` centralizes environment schemas.
- `packages/ui` centralizes reusable UI primitives and styling helpers.
