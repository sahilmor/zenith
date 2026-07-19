# Universal Search and Knowledge Discovery

Zenith includes a permission-aware universal search foundation that extends existing task search and
AI search without replacing either surface.

## Architecture

Search is implemented in:

```text
apps/server/src/features/search
apps/web/src/features/search
```

The backend stores normalized `SearchIndex` records keyed by workspace, entity type, and stable
entity ID. The current indexer synchronizes workspace entities incrementally at search time, which
keeps local development and tests deterministic while preserving a clean path to move indexing into
background jobs later.

Indexed entities currently include:

- Projects
- Boards
- Tasks
- Document spaces
- Document folders
- Document pages
- Document templates
- Active workspace users

The model already allows future entity types such as forms, goals, initiatives, portfolios, and
attachments.

## APIs

```text
GET    /api/search
GET    /api/search/suggestions
GET    /api/search/recent
DELETE /api/search/recent
GET    /api/search/saved
POST   /api/search/saved
DELETE /api/search/saved/:savedSearchId
GET    /api/search/trending
GET    /api/search/analytics
```

`GET /api/search` supports query text, entity-type filters, owner filter, archived filter, updated
date range, pagination, grouping, deterministic relevance scoring, and sanitized highlight snippets.

## Permission Model

Every search route requires authentication. Workspace membership is required before reading or
indexing workspace search data. Document-page results receive additional page-level read checks so
private drafts are not exposed to users without explicit access.

Search suggestions and AI retrieval reuse the same permission-aware result filtering.

## RAG Foundation

Document pages are chunked into deterministic `KnowledgeChunk` records with source entity, version,
order, section, and future embedding-provider fields. No embedding provider is hardcoded. AI search
returns both universal results and permission-filtered citations from those chunks.

## Analytics

Search analytics record query text, result count, and latency. Workspace managers, admins, and
owners can read aggregate top queries, no-result queries, total searches, and average latency.

## Frontend

The documents screen includes a universal search band that surfaces suggestions, grouped results,
sanitized highlights, and saved-search creation. The AI Copilot search now receives universal
results and citation-ready knowledge chunks in addition to its existing task filter output.

## Current Boundaries

This phase does not add vector embeddings, graph visualization, distributed cache invalidation, or a
background indexing queue. The schema and service boundaries are ready for those production
extensions, and current behavior is covered by backend integration tests.
