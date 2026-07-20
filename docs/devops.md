# Zenith DevOps & Engineering Platform

Zenith DevOps connects software delivery activity to the workspace planning system without coupling
the application to one source-control or CI/CD provider.

## Architecture

- Backend feature: `apps/server/src/features/devops`
- Frontend feature: `apps/web/src/features/devops`
- Shared API types: `packages/types`
- API mount: `/api/workspaces/:workspaceId/devops`

The module stores provider-neutral records for repositories, branches, commits, pull requests,
pipeline runs, and deployments. GitHub, GitLab, Bitbucket, Azure DevOps, and manual ingestion are
represented through the same domain model.

## APIs

- `GET /api/workspaces/:workspaceId/devops`
- `GET /api/workspaces/:workspaceId/devops/repositories`
- `POST /api/workspaces/:workspaceId/devops/repositories`
- `DELETE /api/devops/repositories/:repositoryId`
- `GET /api/devops/repositories/:repositoryId/branches`
- `PUT /api/devops/repositories/:repositoryId/branches`
- `PUT /api/devops/repositories/:repositoryId/commits`
- `PUT /api/devops/repositories/:repositoryId/pull-requests`
- `PUT /api/devops/repositories/:repositoryId/pipelines`
- `PUT /api/devops/repositories/:repositoryId/deployments`

## Permissions

Workspace members can view engineering delivery data. Repository connections and ingestion writes
require `owner`, `admin`, or `manager` workspace roles.

## Metrics

The workspace summary calculates:

- Repository count
- Open and merged pull requests
- Deployment frequency
- Lead time
- Change failure rate
- MTTR
- Review latency
- Build success rate
- Release risk

## Provider Integration Notes

This phase implements the provider-agnostic data and API foundation. Provider OAuth apps, webhook
signature verification, and background synchronization workers should plug into the existing
ingestion endpoints or call the `DevOpsService` directly.
