'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiUploadRequest } from '@/lib/api/client';
import { createUploadFeedback } from '@/lib/feedback/toast-manager';
import type {
  CreateCommentInput,
  CreateLabelInput,
  TaskActivity,
  TaskAttachment,
  TaskComment,
  TaskLabel,
  TaskWatcher,
  UpdateCommentInput,
  UpdateLabelInput,
} from '../types';

export const collaborationKeys = {
  comments: (taskId: string | null | undefined) => ['tasks', taskId, 'comments'] as const,
  attachments: (taskId: string | null | undefined) => ['tasks', taskId, 'attachments'] as const,
  activity: (taskId: string | null | undefined) => ['tasks', taskId, 'activity'] as const,
  labels: (taskId: string | null | undefined) => ['tasks', taskId, 'labels'] as const,
};

const supportedAttachmentTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
]);

const supportedAttachmentExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.docx',
  '.xlsx',
  '.pptx',
  '.zip',
]);

const maxAttachmentSize = 10 * 1024 * 1024;

const getFileExtension = (fileName: string): string => {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index).toLowerCase();
};

export const validateAttachmentFile = (file: File): void => {
  const hasSupportedType = supportedAttachmentTypes.has(file.type);
  const hasSupportedFallbackExtension =
    (file.type === '' || file.type === 'application/octet-stream') &&
    supportedAttachmentExtensions.has(getFileExtension(file.name));
  if (!hasSupportedType && !hasSupportedFallbackExtension)
    throw new Error('Unsupported attachment type');
  if (file.size > maxAttachmentSize) throw new Error('Attachment exceeds maximum size');
};

export function useComments(taskId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: collaborationKeys.comments(taskId),
    queryFn: () => apiRequest<TaskComment[]>(`/api/tasks/${taskId}/comments`),
    enabled: enabled && Boolean(taskId),
  });
}

export function useCreateComment(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['comment-create'],
    meta: {
      loadingTitle: 'Posting comment',
      successTitle: 'Comment posted',
      errorTitle: 'Comment failed',
    },
    mutationFn: (input: CreateCommentInput) =>
      apiRequest<TaskComment>(`/api/tasks/${taskId}/comments`, { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.activity(taskId) });
    },
  });
}

export function useUpdateComment(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['comment-update'],
    meta: {
      loadingTitle: 'Updating comment',
      successTitle: 'Comment updated',
      errorTitle: 'Comment update failed',
    },
    mutationFn: ({ commentId, input }: { commentId: string; input: UpdateCommentInput }) =>
      apiRequest<TaskComment>(`/api/comments/${commentId}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.activity(taskId) });
    },
  });
}

export function useDeleteComment(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['comment-delete'],
    meta: {
      loadingTitle: 'Deleting comment',
      successTitle: 'Comment deleted',
      errorTitle: 'Comment delete failed',
    },
    mutationFn: (commentId: string) =>
      apiRequest<unknown>(`/api/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.activity(taskId) });
    },
  });
}

export function useCreateReply(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['comment-reply-create'],
    meta: {
      loadingTitle: 'Posting reply',
      successTitle: 'Reply posted',
      errorTitle: 'Reply failed',
    },
    mutationFn: ({ commentId, input }: { commentId: string; input: CreateCommentInput }) =>
      apiRequest<TaskComment>(`/api/comments/${commentId}/replies`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.activity(taskId) });
    },
  });
}

export function useAttachments(taskId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: collaborationKeys.attachments(taskId),
    queryFn: () => apiRequest<TaskAttachment[]>(`/api/tasks/${taskId}/attachments`),
    enabled: enabled && Boolean(taskId),
  });
}

export function useUploadAttachment(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['attachment-upload'],
    mutationFn: (file: File) => {
      validateAttachmentFile(file);
      const feedback = createUploadFeedback(file.name);
      const body = new FormData();
      body.append('file', file);
      return apiUploadRequest<TaskAttachment>(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body,
        onProgress: feedback.progress,
      })
        .then((attachment) => {
          feedback.success();
          return attachment;
        })
        .catch((error: unknown) => {
          feedback.error(error);
          throw error;
        });
    },
    meta: { feedback: false },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.attachments(taskId) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.activity(taskId) });
    },
  });
}

export function useDeleteAttachment(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['attachment-delete'],
    meta: {
      loadingTitle: 'Deleting attachment',
      successTitle: 'Attachment deleted',
      errorTitle: 'Attachment delete failed',
    },
    mutationFn: (attachmentId: string) =>
      apiRequest<unknown>(`/api/attachments/${attachmentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.attachments(taskId) });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.activity(taskId) });
    },
  });
}

export function useActivity(taskId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: collaborationKeys.activity(taskId),
    queryFn: () => apiRequest<TaskActivity[]>(`/api/tasks/${taskId}/activity`),
    enabled: enabled && Boolean(taskId),
  });
}

export function useWatchTask(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  const invalidateActivity = () =>
    queryClient.invalidateQueries({ queryKey: collaborationKeys.activity(taskId) });
  const watch = useMutation({
    mutationKey: ['task-watch'],
    meta: { feedback: false },
    mutationFn: () =>
      apiRequest<TaskWatcher>(`/api/tasks/${taskId}/watch`, {
        method: 'POST',
      }),
    onSuccess: invalidateActivity,
  });
  const unwatch = useMutation({
    mutationKey: ['task-unwatch'],
    meta: { feedback: false },
    mutationFn: () =>
      apiRequest<unknown>(`/api/tasks/${taskId}/watch`, {
        method: 'DELETE',
      }),
    onSuccess: invalidateActivity,
  });

  return { watch, unwatch };
}

export function useLabels(taskId: string | null | undefined, enabled = true) {
  const queryClient = useQueryClient();
  const labels = useQuery({
    queryKey: collaborationKeys.labels(taskId),
    queryFn: () => apiRequest<TaskLabel[]>(`/api/tasks/${taskId}/labels`),
    enabled: enabled && Boolean(taskId),
  });
  const create = useMutation({
    mutationKey: ['label-create'],
    meta: {
      loadingTitle: 'Creating label',
      successTitle: 'Label created',
      errorTitle: 'Label creation failed',
    },
    mutationFn: (input: CreateLabelInput) =>
      apiRequest<TaskLabel>(`/api/tasks/${taskId}/labels`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collaborationKeys.labels(taskId) }),
  });
  const update = useMutation({
    mutationKey: ['label-update'],
    meta: {
      loadingTitle: 'Updating label',
      successTitle: 'Label updated',
      errorTitle: 'Label update failed',
    },
    mutationFn: ({ labelId, input }: { labelId: string; input: UpdateLabelInput }) =>
      apiRequest<TaskLabel>(`/api/labels/${labelId}`, { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collaborationKeys.labels(taskId) }),
  });
  const remove = useMutation({
    mutationKey: ['label-remove'],
    meta: {
      loadingTitle: 'Removing label',
      successTitle: 'Label removed',
      errorTitle: 'Label remove failed',
    },
    mutationFn: (labelId: string) =>
      apiRequest<unknown>(`/api/tasks/${taskId}/labels/${labelId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collaborationKeys.labels(taskId) }),
  });

  return { labels, create, update, remove };
}
