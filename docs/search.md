# Workspace Search

Universal search covers projects, boards, tasks, document spaces, folders, pages, document templates,
workspace members, and task attachments. Search results are scoped to a workspace and document page
results are filtered using the current user's page permissions.

The API also supports suggestions, popular results, recent searches, saved searches, and
manager-only search analytics. The web client uses the same service for global search and keyboard
navigation. Search indexing is refreshed from current workspace records before a search or suggestion
request.

Search results are limited to the supported entity types. Older index documents for removed product
areas may remain in the database, but are excluded from search and suggestions; cleanup of stored
customer data is intentionally outside this application change.
