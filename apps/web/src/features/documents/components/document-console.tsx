'use client';

import {
  Archive,
  BookOpen,
  Download,
  Eye,
  FileText,
  Link,
  ListTree,
  Pin,
  Plus,
  Save,
  Send,
  Sparkles,
  Star,
  Upload,
  Wifi,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useSaveSearch,
  useSearchSuggestions,
  useUniversalSearch,
} from '@/features/search/api/search-hooks';
import {
  useArchiveDocumentPage,
  useBulkDocumentOperation,
  useCreateDocumentTemplate,
  useCreateDocumentComment,
  useCreateDocumentPage,
  useCreateDocumentSpace,
  useCreatePageFromTemplate,
  useDocumentComments,
  useDocumentMedia,
  useDocumentPage,
  useDocumentSync,
  useDocumentSpaces,
  useDocumentTemplates,
  useDocumentTree,
  useExportDocument,
  useFavoriteDocumentTarget,
  useImportDocument,
  useKnowledgeHome,
  usePinDocumentPage,
  useQueueDocumentOperation,
  usePublishDocumentPage,
  useSaveDocumentBlocks,
  useUploadDocumentMedia,
  useWatchDocumentPage,
} from '../api/document-hooks';
import type { DocumentBlock, DocumentPage, DocumentSpace } from '../types';

const blocksToText = (blocks: DocumentBlock[] | undefined): string =>
  (blocks ?? [])
    .filter((block) => block.type === 'paragraph')
    .map((block) => String(block.content.text ?? ''))
    .join('\n\n');

const textToBlocks = (text: string) =>
  text.split(/\n{2,}/).map((paragraph, index) => ({
    stableId: `paragraph-${index + 1}`,
    type: 'paragraph' as const,
    order: index,
    content: { text: paragraph },
    metadata: {},
  }));

export function DocumentConsole({ workspaceId }: { readonly workspaceId: string | null }) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [spaceName, setSpaceName] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [importText, setImportText] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editorValue, setEditorValue] = useState('');
  const [commentValue, setCommentValue] = useState('');

  const home = useKnowledgeHome(workspaceId);
  const universalSearch = useUniversalSearch({
    workspaceId,
    query: searchQuery,
    enabled: searchQuery.trim().length > 0,
  });
  const suggestions = useSearchSuggestions(workspaceId, searchQuery);
  const saveSearch = useSaveSearch(workspaceId);
  const spaces = useDocumentSpaces(workspaceId);
  const createSpace = useCreateDocumentSpace(workspaceId);
  const tree = useDocumentTree(selectedSpaceId);
  const createPage = useCreateDocumentPage(selectedSpaceId);
  const page = useDocumentPage(selectedPageId);
  const saveBlocks = useSaveDocumentBlocks(selectedPageId);
  const sync = useDocumentSync(workspaceId);
  const queueOperation = useQueueDocumentOperation();
  const importDocument = useImportDocument(workspaceId);
  const exportDocument = useExportDocument();
  const bulkDocuments = useBulkDocumentOperation(workspaceId);
  const media = useDocumentMedia(workspaceId);
  const uploadMedia = useUploadDocumentMedia(workspaceId);
  const publishPage = usePublishDocumentPage(selectedPageId);
  const archivePage = useArchiveDocumentPage();
  const favoriteTarget = useFavoriteDocumentTarget(workspaceId);
  const pinPage = usePinDocumentPage(workspaceId);
  const templates = useDocumentTemplates(workspaceId, selectedSpaceId);
  const createTemplate = useCreateDocumentTemplate(workspaceId);
  const useTemplate = useCreatePageFromTemplate(workspaceId);
  const watchPage = useWatchDocumentPage(selectedPageId);
  const comments = useDocumentComments(selectedPageId);
  const createComment = useCreateDocumentComment(selectedPageId);

  const spaceItems = spaces.data ?? [];
  const pageItems = useMemo(() => tree.data?.pages ?? [], [tree.data]);
  const selectedPage = page.data;
  const homeData = home.data;

  useEffect(() => {
    if (!selectedSpaceId && spaceItems[0]) setSelectedSpaceId(spaceItems[0].id);
  }, [selectedSpaceId, spaceItems]);

  useEffect(() => {
    if (!selectedPageId && pageItems[0]) setSelectedPageId(pageItems[0].id);
  }, [selectedPageId, pageItems]);

  useEffect(() => {
    if (selectedPage) setEditorValue(blocksToText(selectedPage.blocks));
  }, [selectedPage]);

  useEffect(() => {
    if (!selectedPageId || !selectedPage || editorValue === blocksToText(selectedPage.blocks))
      return;
    const handle = window.setTimeout(() => {
      saveBlocks.mutate(
        { blocks: textToBlocks(editorValue) },
        {
          onError: () => {
            if (!workspaceId) return;
            queueOperation({
              workspaceId,
              pageId: selectedPageId,
              type: 'save_blocks',
              baseUpdatedAt: selectedPage.updatedAt,
              payload: { blocks: textToBlocks(editorValue) },
            });
          },
        },
      );
    }, 1200);
    return () => window.clearTimeout(handle);
  }, [editorValue, saveBlocks, selectedPage, selectedPageId]);

  const handleCreateSpace = () => {
    const name = spaceName.trim();
    if (!name) return;
    createSpace.mutate(
      { name, description: 'Workspace knowledge space', icon: '📘', visibility: 'workspace' },
      {
        onSuccess: (space: DocumentSpace) => {
          setSelectedSpaceId(space.id);
          setSpaceName('');
        },
      },
    );
  };

  const handleCreatePage = () => {
    const title = pageTitle.trim();
    if (!title || !selectedSpaceId) return;
    createPage.mutate(
      {
        title,
        blocks: [
          {
            stableId: 'intro',
            type: 'paragraph',
            order: 0,
            content: { text: 'Start writing here.' },
            metadata: {},
          },
        ],
      },
      {
        onSuccess: (newPage) => {
          setSelectedPageId(newPage.id);
          setPageTitle('');
        },
      },
    );
  };

  const handleComment = () => {
    const content = commentValue.trim();
    if (!content || !selectedPageId) return;
    createComment.mutate(
      { content },
      {
        onSuccess: () => setCommentValue(''),
      },
    );
  };

  const handleImport = () => {
    if (!selectedSpaceId) return;
    const title = importTitle.trim() || 'Imported document';
    importDocument.mutate(
      {
        spaceId: selectedSpaceId,
        title,
        format: 'markdown',
        content: importText,
      },
      {
        onSuccess: (result) => {
          setSelectedPageId(result.page.id);
          setImportText('');
          setImportTitle('');
        },
      },
    );
  };

  const handleExport = () => {
    if (!selectedPageId) return;
    exportDocument.mutate(
      { pageId: selectedPageId, format: 'markdown' },
      {
        onSuccess: (download) => {
          const url = URL.createObjectURL(download.blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = download.fileName;
          anchor.click();
          URL.revokeObjectURL(url);
        },
      },
    );
  };

  const handleMediaUpload = (file: File | undefined) => {
    if (!file) return;
    uploadMedia.mutate(
      {
        file,
        pageId: selectedPageId,
        onProgress: (progress) => setUploadProgress(Math.round(progress)),
      },
      { onSettled: () => setUploadProgress(null) },
    );
  };

  const handleTemplateCreate = () => {
    const name = templateTitle.trim();
    if (!name || !selectedSpaceId) return;
    createTemplate.mutate(
      {
        spaceId: selectedSpaceId,
        name,
        category: 'General',
        icon: '🧩',
        blocks: textToBlocks(editorValue || 'Start writing here.'),
        variables: ['currentDate', 'currentUser', 'workspaceName'],
      },
      { onSuccess: () => setTemplateTitle('') },
    );
  };

  return (
    <main className="px-4 py-6 text-[var(--app-text)] md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Knowledge"
          title="Documents"
          description="Create workspace spaces, nested pages, autosaved blocks, comments, and publishable versions."
        />

        {workspaceId ? (
          <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <label htmlFor="knowledge-search" className="text-sm font-semibold">
                  Universal search
                </label>
                <input
                  id="knowledge-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search pages, tasks, projects, boards, templates, and people"
                  className="mt-2 w-full rounded-md border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!searchQuery.trim() || saveSearch.isPending}
                onClick={() =>
                  saveSearch.mutate({ name: searchQuery.trim(), query: searchQuery.trim() })
                }
              >
                <Star className="size-4" />
                Save search
              </Button>
            </div>
            {searchQuery.trim() ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Suggestions</p>
                  {(suggestions.data ?? []).slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSearchQuery(item.label)}
                      className="block w-full truncate rounded-md border border-[var(--app-border)] px-3 py-2 text-left text-xs text-slate-400 hover:text-[var(--app-text)]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {universalSearch.isLoading ? <Skeleton className="h-20 w-full" /> : null}
                  {universalSearch.data?.groups.map((group) => (
                    <div key={group.entityType}>
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                        {group.entityType.replaceAll('_', ' ')} · {group.total}
                      </p>
                      <div className="space-y-2">
                        {group.results.slice(0, 4).map((result) => (
                          <a
                            key={result.id}
                            href={result.url}
                            className="block rounded-md border border-[var(--app-border)] p-3 text-sm hover:bg-white/[0.04]"
                          >
                            <span className="font-medium">{result.title}</span>
                            <span className="ml-2 text-xs text-slate-500">
                              score {result.score}
                            </span>
                            {result.highlights[0] ? (
                              <p
                                className="mt-1 line-clamp-2 text-xs text-slate-400 [&_mark]:rounded [&_mark]:bg-amber-300/20 [&_mark]:text-amber-200"
                                dangerouslySetInnerHTML={{ __html: result.highlights[0].snippet }}
                              />
                            ) : null}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                  {universalSearch.data?.total === 0 ? (
                    <p className="text-sm text-slate-500">No matching knowledge found.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {!workspaceId ? (
          <EmptyState
            title="Select a workspace"
            description="Documents belong to the active workspace."
          />
        ) : spaces.isLoading ? (
          <Card className="rounded-lg p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-4 h-32 w-full" />
          </Card>
        ) : spaces.isError ? (
          <ErrorState
            title="Unable to load documents"
            description="Please refresh and try again."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
            <aside className="space-y-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="size-4" />
                Spaces
              </div>
              {homeData ? (
                <div className="rounded-md border border-[var(--app-border)] bg-black/10 p-3 text-xs text-slate-400">
                  <div className="mb-2 font-semibold text-[var(--app-text)]">Knowledge home</div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-500">Pinned</span>
                      <div className="mt-1 space-y-1">
                        {homeData.pinnedPages.slice(0, 3).map((pin) => (
                          <button
                            key={pin.id}
                            type="button"
                            onClick={() => setSelectedPageId(pin.page.id)}
                            className="block w-full truncate text-left hover:text-[var(--app-text)]"
                          >
                            {pin.page.icon ?? '📄'} {pin.page.title}
                          </button>
                        ))}
                        {homeData.pinnedPages.length === 0 ? <span>No pinned pages</span> : null}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Recent</span>
                      <div className="mt-1 space-y-1">
                        {homeData.recentPages.slice(0, 3).map((recent) => (
                          <button
                            key={recent.id}
                            type="button"
                            onClick={() => setSelectedPageId(recent.page.id)}
                            className="block w-full truncate text-left hover:text-[var(--app-text)]"
                          >
                            {recent.page.title}
                          </button>
                        ))}
                        {homeData.recentPages.length === 0 ? <span>No recent pages</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2">
                <input
                  value={spaceName}
                  onChange={(event) => setSpaceName(event.target.value)}
                  placeholder="New space"
                  className="min-w-0 flex-1 rounded-md border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
                />
                <Button size="icon" onClick={handleCreateSpace} disabled={createSpace.isPending}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {spaceItems.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => {
                      setSelectedSpaceId(space.id);
                      setSelectedPageId(null);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                      selectedSpaceId === space.id
                        ? 'bg-white/10 text-[var(--app-text)]'
                        : 'text-slate-400 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="mr-2">{space.icon ?? '📄'}</span>
                    {space.name}
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--app-border)] pt-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-4" />
                  Pages
                </div>
                <div className="flex gap-2">
                  <input
                    value={pageTitle}
                    onChange={(event) => setPageTitle(event.target.value)}
                    placeholder="New page"
                    className="min-w-0 flex-1 rounded-md border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
                  />
                  <Button
                    size="icon"
                    onClick={handleCreatePage}
                    disabled={!selectedSpaceId || createPage.isPending}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="mt-3 space-y-1">
                  {pageItems.map((item: DocumentPage) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPageId(item.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        selectedPageId === item.id
                          ? 'bg-white/10 text-[var(--app-text)]'
                          : 'text-slate-400 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="block truncate">{item.title}</span>
                      <span className="text-xs capitalize text-slate-500">{item.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="min-h-[620px] rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
              {!selectedPageId ? (
                <EmptyState
                  title="No page selected"
                  description="Create or select a page to edit."
                />
              ) : page.isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : page.isError || !selectedPage ? (
                <ErrorState title="Unable to load page" description="Please select another page." />
              ) : (
                <div className="flex h-full flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">
                        {selectedPage.breadcrumbs.map((crumb) => crumb.title).join(' / ')}
                      </div>
                      <h2 className="mt-2 text-2xl font-semibold">{selectedPage.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {saveBlocks.isPending ? 'Saving…' : 'Autosaved'} · version{' '}
                        {selectedPage.currentVersion}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Wifi className="size-3" />
                        {sync.status}
                        {sync.queuedOperations.length > 0
                          ? ` · ${sync.queuedOperations.length} queued`
                          : null}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          favoriteTarget.mutate({ targetType: 'page', targetId: selectedPage.id })
                        }
                      >
                        <Star className="size-4" />
                        Favorite
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => pinPage.mutate({ pageId: selectedPage.id })}
                      >
                        <Pin className="size-4" />
                        Pin
                      </Button>
                      <Button variant="secondary" onClick={() => watchPage.mutate('all_updates')}>
                        <Eye className="size-4" />
                        {selectedPage.watcher ? 'Watching' : 'Watch'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          saveBlocks.mutate({ blocks: textToBlocks(editorValue) });
                        }}
                      >
                        <Save className="size-4" />
                        Save
                      </Button>
                      <Button variant="secondary" onClick={handleExport}>
                        <Download className="size-4" />
                        Export
                      </Button>
                      <Button variant="secondary" onClick={() => publishPage.mutate()}>
                        <Send className="size-4" />
                        Publish
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => archivePage.mutate(selectedPage)}
                        aria-label="Archive page"
                      >
                        <Archive className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <textarea
                    value={editorValue}
                    onChange={(event) => setEditorValue(event.target.value)}
                    className="min-h-[460px] flex-1 resize-none rounded-lg border border-[var(--app-border)] bg-black/10 p-4 text-base leading-7 outline-none focus:border-white/30"
                    aria-label="Document editor"
                  />
                </div>
              )}
            </section>

            <aside className="space-y-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
              <section>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ListTree className="size-4" />
                  Outline
                </div>
                <div className="space-y-2 text-sm text-slate-400">
                  {(selectedPage?.outline ?? []).map((item) => (
                    <button
                      key={item.blockId}
                      type="button"
                      className="block w-full truncate text-left hover:text-[var(--app-text)]"
                      style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                    >
                      {item.title}
                    </button>
                  ))}
                  {selectedPage && selectedPage.outline.length === 0 ? (
                    <p className="text-sm text-slate-500">Headings will appear here.</p>
                  ) : null}
                </div>
              </section>

              <section className="border-t border-[var(--app-border)] pt-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Link className="size-4" />
                  Backlinks
                </div>
                <div className="space-y-2 text-sm text-slate-400">
                  {(selectedPage?.backlinks ?? []).map((relationship) => (
                    <p key={relationship.id} className="truncate">
                      Referenced by {relationship.sourcePageId.slice(-6)}
                    </p>
                  ))}
                  {selectedPage && selectedPage.backlinks.length === 0 ? (
                    <p className="text-sm text-slate-500">No backlinks yet.</p>
                  ) : null}
                  {(selectedPage?.forwardLinks ?? [])
                    .filter((relationship) => relationship.broken)
                    .map((relationship) => (
                      <p key={relationship.id} className="text-xs text-amber-400">
                        Broken {relationship.targetType} link {relationship.targetId.slice(-6)}
                      </p>
                    ))}
                </div>
              </section>

              <section className="border-t border-[var(--app-border)] pt-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4" />
                  Templates
                </div>
                <div className="flex gap-2">
                  <input
                    value={templateTitle}
                    onChange={(event) => setTemplateTitle(event.target.value)}
                    placeholder="Save as template"
                    className="min-w-0 flex-1 rounded-md border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
                    disabled={!selectedSpaceId}
                  />
                  <Button
                    size="icon"
                    onClick={handleTemplateCreate}
                    disabled={!selectedSpaceId || createTemplate.isPending}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {(templates.data ?? []).slice(0, 5).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        if (!selectedSpaceId) return;
                        useTemplate.mutate(
                          {
                            templateId: template.id,
                            spaceId: selectedSpaceId,
                            title: `${template.name} copy`,
                          },
                          { onSuccess: (newPage) => setSelectedPageId(newPage.id) },
                        );
                      }}
                      className="block w-full rounded-md border border-[var(--app-border)] p-2 text-left text-sm text-slate-400 hover:text-[var(--app-text)]"
                    >
                      <span className="mr-2">{template.icon ?? '📄'}</span>
                      {template.name}
                    </button>
                  ))}
                  {templates.data?.length === 0 ? (
                    <p className="text-sm text-slate-500">No templates yet.</p>
                  ) : null}
                </div>
              </section>

              <section className="border-t border-[var(--app-border)] pt-4">
                <h2 className="text-sm font-semibold">Import</h2>
                <div className="mt-3 space-y-2">
                  <input
                    value={importTitle}
                    onChange={(event) => setImportTitle(event.target.value)}
                    placeholder="Imported page title"
                    className="w-full rounded-md border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
                    disabled={!selectedSpaceId}
                  />
                  <textarea
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder="Paste Markdown, HTML, or plain text"
                    className="min-h-24 w-full resize-none rounded-md border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
                    disabled={!selectedSpaceId}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleImport}
                    disabled={!selectedSpaceId || !importText.trim() || importDocument.isPending}
                  >
                    <Upload className="size-4" />
                    Import
                  </Button>
                </div>
              </section>

              <section className="border-t border-[var(--app-border)] pt-4">
                <h2 className="text-sm font-semibold">Media</h2>
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[var(--app-border)] px-3 py-4 text-sm text-slate-400">
                  <Upload className="size-4" />
                  {uploadProgress === null ? 'Upload media' : `Uploading ${uploadProgress}%`}
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(event) => handleMediaUpload(event.target.files?.[0])}
                  />
                </label>
                <div className="mt-3 space-y-2">
                  {(media.data?.items ?? []).slice(0, 4).map((asset) => (
                    <a
                      key={asset.id}
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate rounded-md border border-[var(--app-border)] p-2 text-sm text-slate-400 hover:text-[var(--app-text)]"
                    >
                      {asset.originalName}
                    </a>
                  ))}
                  {media.data?.items.length === 0 ? (
                    <p className="text-sm text-slate-500">No media uploaded.</p>
                  ) : null}
                </div>
              </section>

              <section className="border-t border-[var(--app-border)] pt-4">
                <h2 className="text-sm font-semibold">Operations</h2>
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  disabled={!selectedPageId || bulkDocuments.isPending}
                  onClick={() =>
                    selectedPageId &&
                    bulkDocuments.mutate({ action: 'duplicate', pageIds: [selectedPageId] })
                  }
                >
                  Duplicate page
                </Button>
              </section>

              <section className="border-t border-[var(--app-border)] pt-4">
                <h2 className="text-sm font-semibold">Comments</h2>
                <div className="mt-3 flex gap-2">
                  <input
                    value={commentValue}
                    onChange={(event) => setCommentValue(event.target.value)}
                    placeholder="Add a comment"
                    className="min-w-0 flex-1 rounded-md border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
                    disabled={!selectedPageId}
                  />
                  <Button size="icon" onClick={handleComment} disabled={!selectedPageId}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {(comments.data ?? []).map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-md border border-[var(--app-border)] p-3"
                    >
                      <p className="text-sm leading-5">{comment.content}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {selectedPageId && comments.data?.length === 0 ? (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
