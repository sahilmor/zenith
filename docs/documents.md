# Documents, Wikis, and Knowledge Platform

Zenith includes a workspace document and knowledge foundation integrated with existing workspace
permissions, billing, activity, realtime, notifications, and the dashboard shell.

## Architecture

Documents follow this hierarchy:

- Workspace
- Document spaces
- Folders
- Pages
- Blocks

Blocks are stored separately from pages so page trees can be lazy loaded and page bodies can be
loaded only when a user opens a page. Page versions are immutable snapshots created when a page is
published.

Knowledge navigation is modeled as workspace-scoped records instead of denormalized page strings.
Breadcrumbs are generated from the current space/folder/page hierarchy, recent pages are
user-specific, favorites are user-specific, and page pins support workspace, space, and personal
scopes. Page relationships and backlinks use stable IDs and are recalculated from block references
when blocks are saved.

## Backend

Feature folder:

```text
apps/server/src/features/documents
```

Models:

- `DocumentSpace`
- `DocumentFolder`
- `DocumentPage`
- `DocumentBlock`
- `DocumentVersion`
- `DocumentComment`
- `DocumentFavorite`
- `DocumentRecentPage`
- `DocumentPin`
- `DocumentRelationship`
- `DocumentPageTag`
- `DocumentPageTemplate`
- `DocumentWatcher`
- `DocumentSyncOperation`
- `DocumentMediaAsset`
- `DocumentRetentionPolicy`
- `DocumentExport`

Main routes:

- `GET /api/workspaces/:workspaceId/spaces`
- `POST /api/workspaces/:workspaceId/spaces`
- `GET /api/workspaces/:workspaceId/knowledge-home`
- `GET /api/workspaces/:workspaceId/document-favorites`
- `POST /api/document-favorites`
- `GET /api/documents/export?pageId=:pageId&format=markdown|html|pdf|text|json`
- `DELETE /api/document-favorites/:targetType/:targetId`
- `POST /api/workspaces/:workspaceId/documents/sync`
- `POST /api/workspaces/:workspaceId/documents/import`
- `POST /api/workspaces/:workspaceId/documents/bulk`
- `GET /api/workspaces/:workspaceId/media`
- `POST /api/workspaces/:workspaceId/media`
- `PATCH /api/media/:mediaId`
- `DELETE /api/media/:mediaId`
- `GET /api/workspaces/:workspaceId/document-retention-policy`
- `PATCH /api/workspaces/:workspaceId/document-retention-policy`
- `GET /api/workspaces/:workspaceId/document-tags`
- `POST /api/workspaces/:workspaceId/document-tags`
- `GET /api/workspaces/:workspaceId/document-templates`
- `POST /api/workspaces/:workspaceId/document-templates`
- `POST /api/document-templates/:templateId/use`
- `GET /api/spaces/:spaceId/tree`
- `POST /api/spaces/:spaceId/folders`
- `POST /api/spaces/:spaceId/pages`
- `GET /api/pages/:pageId`
- `PATCH /api/pages/:pageId`
- `DELETE /api/pages/:pageId`
- `POST /api/pages/:pageId/archive`
- `POST /api/pages/:pageId/restore`
- `POST /api/pages/:pageId/publish`
- `POST /api/pages/:pageId/pins`
- `GET /api/pages/:pageId/relationships`
- `POST /api/pages/:pageId/relationships`
- `GET /api/pages/:pageId/backlinks`
- `POST /api/pages/:pageId/watch`
- `DELETE /api/pages/:pageId/watch`
- `PUT /api/pages/:pageId/blocks`
- `GET /api/pages/:pageId/versions`
- `GET /api/pages/:pageId/comments`
- `POST /api/pages/:pageId/comments`
- `PATCH /api/document-comments/:commentId`

## Permissions

Document permissions use `owner`, `editor`, `commenter`, `viewer`, and `none`.
Workspace owners, admins, and managers can manage document spaces. Page-specific permissions are
enforced on the backend. Commenters can comment but cannot save page blocks.

Favorites, recents, pins, templates, backlinks, relationships, tags, and watchers all verify
workspace membership or page access on the backend. Workspace-level and space-level pins plus
template creation require a workspace manager/admin/owner role; personal pins and watchers require
page read access.

## Knowledge Navigation

`GET /api/workspaces/:workspaceId/knowledge-home` returns permission-aware spaces, recent pages,
favorites, pinned pages, and templates. Opening a page records it as a recent page for the
authenticated user. Page detail responses include generated breadcrumbs, heading outline, backlinks,
forward links, broken-link markers, and the current user's watcher subscription.

Blocks may reference entities with stable IDs in `content` or `metadata`, for example `pageId`,
`documentId`, `taskId`, or `projectId`. Saving blocks synchronizes relationship records and creates
automatic backlinks for page/document targets. Missing page targets are preserved as broken links so
the UI can surface repair workflows.

## Templates

Document templates are independent snapshots of blocks. Applying a template creates a new page and
copies blocks into the target space; template instances do not share mutable content with the
template. Supported variables include `{{currentDate}}`, `{{currentUser}}`, and
`{{workspaceName}}`, plus caller-provided variables.

## Billing

The billing catalog includes the `documents` feature and the `documentSpaces` and `documentPages`
limits. Backend enforcement is performed before creating spaces and pages.

## Realtime and Activity

Document mutations emit scoped realtime events through the existing Socket.io realtime service.
Document activity is persisted through the shared activity service.

Supported activity events include `document.space.created`, `document.folder.created`,
`document.page.created`, `document.page.updated`, `document.blocks.saved`,
`document.page.published`, `document.page.archived`, `document.page.restored`,
`document.page.deleted`, `document.comment.created`, `document.imported`, `document.exported`,
`document.bulk.updated`, `document.media.uploaded`, and `document.media.updated`.

## Operations and Offline Sync

The document operations layer adds a server-backed synchronization endpoint for client-side offline
queues. Clients submit ordered operations with stable `clientOperationId` values. The backend stores
each operation idempotently, applies supported operations in order, and detects conflicts when a
queued edit is based on an older `baseUpdatedAt` than the current page. Conflicted operations are
returned to the client for manual review instead of silently overwriting remote changes.

Supported sync operation types:

- `create_page`
- `update_page`
- `save_blocks`
- `archive_page`
- `restore_page`
- `delete_page`
- `comment`
- `favorite`
- `watch`

The frontend persists queued document operations in `zenith-document-sync-queue` and automatically
attempts synchronization when the browser returns online. The document console displays sync state
and queued operation count.

## Import and Export

The import pipeline currently supports Markdown, sanitized HTML, and plain text. Imported content is
normalized into document blocks. DOCX and PDF imports are validated as unsupported unless a binary
parser is configured in a later phase; the API returns a clear validation error instead of
pretending to parse binary content.

Export supports Markdown, semantic HTML, plain text, JSON, and generated PDF using the existing
server PDF dependency. Export records are stored with expiry metadata for cleanup/audit purposes;
the generated file is streamed directly to the authenticated requester.

## Bulk Operations

Bulk document operations validate each page independently and return per-page results so partial
failures do not hide successful operations. Supported actions are archive, restore, delete,
duplicate, move, owner changes, tag changes, publish, and unpublish. Bulk operations create
aggregated activity and audit entries.

## Media Library

The workspace media library reuses the existing Cloudinary/local storage abstraction. Media records
track page association, uploader, metadata, size, URL, storage public ID, archive state, and usage
count. Deleting a media asset is blocked while it is still referenced by a document.

## Retention and Cleanup

Each workspace can store document retention settings for drafts, archives, deleted content, and
temporary import/export artifacts. Cleanup currently expires temporary export metadata; it does not
delete user-authored document content. Retention policy updates are recorded in the audit log.

The cleanup endpoint is restricted to platform admin users because it mutates operational state
outside a single workspace request.

## Security and Production Hardening

Document APIs reuse the application authentication middleware and enforce workspace membership,
workspace role checks, and page-level permissions in the service layer. Backend checks are required
for reads, edits, comments, exports, imports, media operations, templates, favorites, pins,
relationships, watchers, retention settings, and bulk operations.

Rich block content and metadata are validated before persistence. The server rejects unsafe object
keys such as event handlers and prototype pollution keys, rejects script payloads and unsafe
JavaScript/data HTML links, and caps saved block arrays to 500 blocks per request. HTML imports are
converted through a sanitizer that strips scripts, styles, and raw tags before block creation.

Document-heavy endpoints have dedicated configurable rate limits in addition to the global API
limiter:

- `DOCUMENT_OPERATION_RATE_LIMIT_MAX`
- `DOCUMENT_OPERATION_RATE_LIMIT_WINDOW_MS`
- `DOCUMENT_HEAVY_OPERATION_RATE_LIMIT_MAX`
- `DOCUMENT_HEAVY_OPERATION_RATE_LIMIT_WINDOW_MS`
- `SEARCH_RATE_LIMIT_MAX`
- `SEARCH_RATE_LIMIT_WINDOW_MS`

Search, import, export, bulk operations, media upload/delete, retention updates, sync, and block
saves should use these controls in production. The current limiter is process-local; for multiple
backend instances, use a distributed limiter backend such as Redis before horizontal scaling.

Feature flags can act as kill switches for high-impact capabilities. The currently wired document
flags are `documents.offline`, `documents.imports`, `documents.exports`, `documents.media`, and
`documents.bulk_operations`. Missing flags default to enabled so existing deployments keep working;
creating a disabled flag immediately blocks the corresponding operation.

## Observability

Document operations persist lightweight operational metrics without storing document body content.
Metrics include workspace ID when applicable, user ID when applicable, request ID, operation,
status, duration, error category, and low-risk metadata such as format, counts, sizes, and action
names. Supported operations are sync, import, export, bulk, media upload/update/delete, retention
update, and cleanup.

Structured logs emit matching operation measurements with request IDs so incidents can be traced
between HTTP logs, audit logs, and document metrics. Do not log document text, secrets, tokens,
Cloudinary credentials, or AI provider keys.

## Backup and Recovery

Backups must include document spaces, folders, pages, blocks, versions, comments, watchers,
favorites, pins, relationships, templates, tags, media metadata, retention policies, search indexes
or rebuild inputs, activity records, and audit logs. Cloudinary assets should be covered by provider
backup/retention policy or a workspace export process.

Recovery order:

1. Restore MongoDB collections for the affected workspace.
2. Verify workspace memberships and document permissions.
3. Verify media metadata and Cloudinary asset availability.
4. Rebuild search indexes and knowledge chunks.
5. Reconcile activity/audit history.
6. Run targeted smoke tests for page read, edit, publish, search, import, export, and media preview.

## Operational Runbooks

Import failure: inspect the operational metric `operation=import`, validate file format/size, verify
workspace permissions and feature flags, then retry with sanitized Markdown/HTML/plain text.

Export failure: inspect `operation=export`, confirm page read access, verify PDF generation memory
headroom for large pages, and retry with Markdown or HTML if PDF generation is the bottleneck.

Search degradation: inspect search latency analytics, rebuild stale workspace indexes if needed,
verify permission-aware filtering, and throttle expensive queries using `SEARCH_RATE_LIMIT_*`.

Sync conflicts: return conflicts to the client for manual review. Do not force apply stale offline
edits over newer remote content.

Media deletion blocked: inspect `usageCount` and document relationships before removing assets.
Never delete active Cloudinary assets without first clearing references.

## Frontend

Route:

```text
/dashboard/documents
```

The current UI supports space creation, page creation, page selection, paragraph block editing,
debounced autosave, manual save, publishing, archiving, page comments, knowledge home shortcuts,
favorites, pins, watcher updates, outline display, backlink visibility, template creation/use,
offline queue status, Markdown import, Markdown export, media upload/listing, and page duplication.

## Current Boundaries

This implementation does not claim full Notion-style CRDT/OT collaborative editing. Multi-cursor
editing, slash-command block insertion UI, full inline comment text ranges, drag-and-drop block
movement UI, full manual conflict merge UI, binary DOCX/PDF import parsing, chunked uploads, public
link sharing, synced blocks, and AI document generation remain future foundations. The current
backlink, template, operational sync, import/export, bulk operation, media, and retention APIs are
functional and covered by backend integration tests.
