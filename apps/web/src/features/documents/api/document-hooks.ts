'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { apiDownloadRequest, apiRequest, apiUploadRequest } from '@/lib/api/client';
import { useDocumentSyncStore } from '@/stores/document-sync-store';
import type {
  CreateDocumentPageInput,
  CreateDocumentSpaceInput,
  DocumentBulkOperation,
  CreateDocumentTemplateInput,
  DocumentBlock,
  DocumentComment,
  DocumentFavorite,
  KnowledgeHome,
  DocumentExportFormat,
  DocumentImportFormat,
  DocumentImport,
  DocumentMediaAsset,
  DocumentPage,
  DocumentPageDetail,
  DocumentRetentionPolicy,
  DocumentSpace,
  DocumentSyncResult,
  DocumentTemplate,
  DocumentWatcher,
  DocumentTree,
  DocumentVersion,
  SaveDocumentBlocksInput,
} from '../types';

export const documentKeys = {
  spaces: (workspaceId: string | null | undefined) => ['documents', workspaceId, 'spaces'] as const,
  tree: (spaceId: string | null | undefined) => ['documents', 'spaces', spaceId, 'tree'] as const,
  page: (pageId: string | null | undefined) => ['documents', 'pages', pageId] as const,
  home: (workspaceId: string | null | undefined) => ['documents', workspaceId, 'home'] as const,
  templates: (workspaceId: string | null | undefined, spaceId?: string | null) =>
    ['documents', workspaceId, spaceId ?? 'all', 'templates'] as const,
  comments: (pageId: string | null | undefined) =>
    ['documents', 'pages', pageId, 'comments'] as const,
  media: (workspaceId: string | null | undefined) => ['documents', workspaceId, 'media'] as const,
  retention: (workspaceId: string | null | undefined) =>
    ['documents', workspaceId, 'retention'] as const,
};

export function useDocumentSpaces(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.spaces(workspaceId),
    queryFn: () => apiRequest<DocumentSpace[]>(`/api/workspaces/${workspaceId}/spaces`),
    enabled: Boolean(workspaceId),
  });
}

export function useKnowledgeHome(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.home(workspaceId),
    queryFn: () => apiRequest<KnowledgeHome>(`/api/workspaces/${workspaceId}/knowledge-home`),
    enabled: Boolean(workspaceId),
  });
}

export function useDocumentTree(spaceId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.tree(spaceId),
    queryFn: () => apiRequest<DocumentTree>(`/api/spaces/${spaceId}/tree`),
    enabled: Boolean(spaceId),
  });
}

export function useDocumentPage(pageId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.page(pageId),
    queryFn: () => apiRequest<DocumentPageDetail>(`/api/pages/${pageId}`),
    enabled: Boolean(pageId),
  });
}

export function useDocumentComments(pageId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.comments(pageId),
    queryFn: () => apiRequest<DocumentComment[]>(`/api/pages/${pageId}/comments`),
    enabled: Boolean(pageId),
  });
}

export function useDocumentTemplates(
  workspaceId: string | null | undefined,
  spaceId?: string | null,
) {
  const search = spaceId ? `?spaceId=${spaceId}` : '';
  return useQuery({
    queryKey: documentKeys.templates(workspaceId, spaceId),
    queryFn: () =>
      apiRequest<DocumentTemplate[]>(`/api/workspaces/${workspaceId}/document-templates${search}`),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateDocumentSpace(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-space-create'],
    meta: {
      loadingTitle: 'Creating space',
      successTitle: 'Space created',
      errorTitle: 'Space creation failed',
    },
    mutationFn: (input: CreateDocumentSpaceInput) =>
      apiRequest<DocumentSpace>(`/api/workspaces/${workspaceId}/spaces`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.spaces(workspaceId) }),
  });
}

export function useFavoriteDocumentTarget(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-favorite'],
    meta: {
      loadingTitle: 'Updating favorite',
      successTitle: 'Favorite updated',
      errorTitle: 'Favorite failed',
    },
    mutationFn: (input: {
      targetType: 'page' | 'space' | 'template';
      targetId: string;
      sortOrder?: number;
    }) =>
      apiRequest<DocumentFavorite>('/api/document-favorites', {
        method: 'POST',
        body: { workspaceId, sortOrder: 0, ...input },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.home(workspaceId) }),
  });
}

export function usePinDocumentPage(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-page-pin'],
    meta: {
      loadingTitle: 'Pinning page',
      successTitle: 'Page pinned',
      errorTitle: 'Pin failed',
    },
    mutationFn: (input: { pageId: string; scope?: 'workspace' | 'space' | 'personal' }) =>
      apiRequest(`/api/pages/${input.pageId}/pins`, {
        method: 'POST',
        body: { scope: input.scope ?? 'personal' },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.home(workspaceId) }),
  });
}

export function useCreateDocumentTemplate(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-template-create'],
    meta: {
      loadingTitle: 'Creating template',
      successTitle: 'Template created',
      errorTitle: 'Template failed',
    },
    mutationFn: (input: CreateDocumentTemplateInput) =>
      apiRequest<DocumentTemplate>(`/api/workspaces/${workspaceId}/document-templates`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: documentKeys.templates(workspaceId) }),
  });
}

export function useCreatePageFromTemplate(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-template-use'],
    meta: {
      loadingTitle: 'Creating page',
      successTitle: 'Page created',
      errorTitle: 'Template use failed',
    },
    mutationFn: (input: { templateId: string; spaceId: string; title: string }) =>
      apiRequest<DocumentPageDetail>(`/api/document-templates/${input.templateId}/use`, {
        method: 'POST',
        body: { spaceId: input.spaceId, title: input.title, variables: {} },
      }),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.home(workspaceId) });
      queryClient.invalidateQueries({ queryKey: documentKeys.tree(page.spaceId) });
      queryClient.setQueryData(documentKeys.page(page.id), page);
    },
  });
}

export function useWatchDocumentPage(pageId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-page-watch'],
    meta: {
      loadingTitle: 'Updating watch',
      successTitle: 'Watch updated',
      errorTitle: 'Watch failed',
    },
    mutationFn: (
      subscription: 'all_updates' | 'major_updates' | 'comments_only' | 'mentions_only' | 'mute',
    ) =>
      apiRequest<DocumentWatcher>(`/api/pages/${pageId}/watch`, {
        method: 'POST',
        body: { subscription },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.page(pageId) }),
  });
}

export function useCreateDocumentPage(spaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-page-create'],
    meta: {
      loadingTitle: 'Creating page',
      successTitle: 'Page created',
      errorTitle: 'Page creation failed',
    },
    mutationFn: (input: CreateDocumentPageInput) =>
      apiRequest<DocumentPageDetail>(`/api/spaces/${spaceId}/pages`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.tree(spaceId) });
      queryClient.setQueryData(documentKeys.page(page.id), page);
    },
  });
}

export function useSaveDocumentBlocks(pageId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-blocks-save'],
    meta: {
      loadingTitle: 'Saving document',
      successTitle: 'Document saved',
      errorTitle: 'Document save failed',
    },
    mutationFn: (input: SaveDocumentBlocksInput) =>
      apiRequest<DocumentBlock[]>(`/api/pages/${pageId}/blocks`, { method: 'PUT', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.page(pageId) }),
  });
}

export function usePublishDocumentPage(pageId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-page-publish'],
    meta: {
      loadingTitle: 'Publishing page',
      successTitle: 'Page published',
      errorTitle: 'Page publish failed',
    },
    mutationFn: () =>
      apiRequest<DocumentVersion>(`/api/pages/${pageId}/publish`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.page(pageId) }),
  });
}

export function useArchiveDocumentPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-page-archive'],
    meta: {
      loadingTitle: 'Archiving page',
      successTitle: 'Page archived',
      errorTitle: 'Page archive failed',
    },
    mutationFn: (page: DocumentPage) =>
      apiRequest<DocumentPage>(`/api/pages/${page.id}/archive`, { method: 'POST' }),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.tree(page.spaceId) });
      queryClient.invalidateQueries({ queryKey: documentKeys.page(page.id) });
    },
  });
}

export function useCreateDocumentComment(pageId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-comment-create'],
    meta: {
      loadingTitle: 'Adding comment',
      successTitle: 'Comment added',
      errorTitle: 'Comment failed',
    },
    mutationFn: (input: { content: string; blockId?: string | null }) =>
      apiRequest<DocumentComment>(`/api/pages/${pageId}/comments`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.comments(pageId) }),
  });
}

export function useDocumentSync(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  const allOperations = useDocumentSyncStore((state) => state.operations);
  const operations = useMemo(
    () =>
      workspaceId ? allOperations.filter((operation) => operation.workspaceId === workspaceId) : [],
    [allOperations, workspaceId],
  );
  const setStatus = useDocumentSyncStore((state) => state.setStatus);
  const remove = useDocumentSyncStore((state) => state.remove);
  const status = useDocumentSyncStore((state) => state.status);
  const mutation = useMutation({
    mutationKey: ['document-sync', workspaceId],
    meta: {
      loadingTitle: 'Syncing documents',
      successTitle: 'Documents synced',
      errorTitle: 'Document sync failed',
    },
    mutationFn: () =>
      apiRequest<DocumentSyncResult>(`/api/workspaces/${workspaceId}/documents/sync`, {
        method: 'POST',
        body: { operations },
      }),
    onSuccess: (result) => {
      remove(result.applied.map((operation) => operation.clientOperationId));
      setStatus(result.status);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
    onError: () => setStatus('failed'),
  });
  const { isPending, mutate } = mutation;

  useEffect(() => {
    const updateConnection = () => setStatus(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    updateConnection();
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, [setStatus]);

  useEffect(() => {
    if (!workspaceId || operations.length === 0 || !navigator.onLine || isPending) return;
    mutate();
  }, [isPending, mutate, operations.length, workspaceId]);

  return {
    ...mutation,
    queuedOperations: operations,
    status,
  };
}

export function useQueueDocumentOperation() {
  return useDocumentSyncStore((state) => state.enqueue);
}

export function useImportDocument(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-import', workspaceId],
    meta: {
      loadingTitle: 'Importing document',
      successTitle: 'Document imported',
      errorTitle: 'Document import failed',
    },
    mutationFn: (input: {
      spaceId: string;
      title: string;
      format: DocumentImportFormat;
      content?: string;
      file?: File;
    }) => {
      if (!input.file) {
        return apiRequest<DocumentImport>(`/api/workspaces/${workspaceId}/documents/import`, {
          method: 'POST',
          body: {
            spaceId: input.spaceId,
            title: input.title,
            format: input.format,
            content: input.content ?? '',
          },
        });
      }
      const body = new FormData();
      body.set('spaceId', input.spaceId);
      body.set('title', input.title);
      body.set('format', input.format);
      body.set('content', input.content ?? '');
      body.set('file', input.file);
      return apiUploadRequest<DocumentImport>(`/api/workspaces/${workspaceId}/documents/import`, {
        body,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.tree(result.page.spaceId) });
      queryClient.setQueryData(documentKeys.page(result.page.id), result.page);
    },
  });
}

export function useExportDocument() {
  return useMutation({
    mutationKey: ['document-export'],
    meta: {
      loadingTitle: 'Exporting document',
      successTitle: 'Document exported',
      errorTitle: 'Document export failed',
    },
    mutationFn: (input: { pageId: string; format: DocumentExportFormat }) =>
      apiDownloadRequest(`/api/documents/export?pageId=${input.pageId}&format=${input.format}`),
  });
}

export function useBulkDocumentOperation(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-bulk', workspaceId],
    meta: {
      loadingTitle: 'Updating documents',
      successTitle: 'Documents updated',
      errorTitle: 'Bulk update failed',
    },
    mutationFn: (input: {
      action: DocumentBulkOperation['action'];
      pageIds: string[];
      folderId?: string | null;
      parentPageId?: string | null;
      ownerId?: string;
      tagIds?: string[];
    }) =>
      apiRequest<DocumentBulkOperation>(`/api/workspaces/${workspaceId}/documents/bulk`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDocumentMedia(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.media(workspaceId),
    queryFn: () =>
      apiRequest<{
        items: DocumentMediaAsset[];
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      }>(`/api/workspaces/${workspaceId}/media`),
    enabled: Boolean(workspaceId),
  });
}

export function useUploadDocumentMedia(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['document-media-upload', workspaceId],
    meta: {
      loadingTitle: 'Uploading media',
      successTitle: 'Media uploaded',
      errorTitle: 'Media upload failed',
    },
    mutationFn: (input: {
      file: File;
      pageId?: string | null;
      onProgress?: (progress: number) => void;
    }) => {
      const body = new FormData();
      body.set('file', input.file);
      if (input.pageId) body.set('pageId', input.pageId);
      const options: { body: FormData; onProgress?: (progress: number) => void } = { body };
      if (input.onProgress) options.onProgress = input.onProgress;
      return apiUploadRequest<DocumentMediaAsset>(`/api/workspaces/${workspaceId}/media`, options);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.media(workspaceId) }),
  });
}

export function useDocumentRetentionPolicy(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: documentKeys.retention(workspaceId),
    queryFn: () =>
      apiRequest<DocumentRetentionPolicy>(
        `/api/workspaces/${workspaceId}/document-retention-policy`,
      ),
    enabled: Boolean(workspaceId),
  });
}
