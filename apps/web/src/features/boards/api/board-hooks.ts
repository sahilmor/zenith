'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type {
  Board,
  BoardColumn,
  CreateBoardInput,
  CreateColumnInput,
  UpdateBoardInput,
  UpdateColumnInput,
} from '../types';

export const boardKeys = {
  byProject: (projectId: string | null | undefined) => ['projects', projectId, 'boards'] as const,
  detail: (boardId: string | null | undefined) => ['boards', boardId] as const,
  columns: (boardId: string | null | undefined) => ['boards', boardId, 'columns'] as const,
};

export function useBoards(projectId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: boardKeys.byProject(projectId),
    queryFn: () => apiRequest<Board[]>(`/api/projects/${projectId}/boards`),
    enabled: enabled && Boolean(projectId),
  });
}

export function useBoard(boardId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: boardKeys.detail(boardId),
    queryFn: () => apiRequest<Board>(`/api/boards/${boardId}`),
    enabled: enabled && Boolean(boardId),
  });
}

export function useCreateBoard(projectId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['board-create'],
    meta: {
      loadingTitle: 'Creating board',
      successTitle: 'Board created',
      errorTitle: 'Board creation failed',
    },
    mutationFn: (input: CreateBoardInput) =>
      apiRequest<Board>(`/api/projects/${projectId}/boards`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.byProject(projectId) }),
  });
}

export function useUpdateBoard(boardId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['board-update'],
    meta: {
      loadingTitle: 'Updating board',
      successTitle: 'Board updated',
      errorTitle: 'Board update failed',
    },
    mutationFn: (input: UpdateBoardInput) =>
      apiRequest<Board>(`/api/boards/${boardId}`, { method: 'PATCH', body: input }),
    onSuccess: (board) => {
      queryClient.setQueryData(boardKeys.detail(board.id), board);
      queryClient.invalidateQueries({ queryKey: boardKeys.byProject(board.projectId) });
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['board-delete'],
    meta: {
      loadingTitle: 'Deleting board',
      successTitle: 'Board deleted',
      errorTitle: 'Board delete failed',
    },
    mutationFn: (board: Board) =>
      apiRequest<Board>(`/api/boards/${board.id}`, { method: 'DELETE' }),
    onSuccess: (board) => {
      queryClient.setQueryData(boardKeys.detail(board.id), board);
      queryClient.invalidateQueries({ queryKey: boardKeys.byProject(board.projectId) });
    },
  });
}

export function useArchiveBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['board-archive'],
    meta: {
      loadingTitle: 'Archiving board',
      successTitle: 'Board archived',
      errorTitle: 'Board archive failed',
    },
    mutationFn: (board: Board) =>
      apiRequest<Board>(`/api/boards/${board.id}/archive`, { method: 'POST' }),
    onSuccess: (board) => {
      queryClient.setQueryData(boardKeys.detail(board.id), board);
      queryClient.invalidateQueries({ queryKey: boardKeys.byProject(board.projectId) });
    },
  });
}

export function useRestoreBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['board-restore'],
    meta: {
      loadingTitle: 'Restoring board',
      successTitle: 'Board restored',
      errorTitle: 'Board restore failed',
    },
    mutationFn: (board: Board) =>
      apiRequest<Board>(`/api/boards/${board.id}/restore`, { method: 'POST' }),
    onSuccess: (board) => {
      queryClient.setQueryData(boardKeys.detail(board.id), board);
      queryClient.invalidateQueries({ queryKey: boardKeys.byProject(board.projectId) });
    },
  });
}

export function useColumns(boardId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: boardKeys.columns(boardId),
    queryFn: () => apiRequest<BoardColumn[]>(`/api/boards/${boardId}/columns`),
    enabled: enabled && Boolean(boardId),
  });
}

export function useCreateColumn(boardId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['column-create'],
    meta: {
      loadingTitle: 'Creating column',
      successTitle: 'Column created',
      errorTitle: 'Column creation failed',
    },
    mutationFn: (input: CreateColumnInput) =>
      apiRequest<BoardColumn>(`/api/boards/${boardId}/columns`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) }),
  });
}

export function useUpdateColumn(boardId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['column-update'],
    meta: {
      loadingTitle: 'Updating column',
      successTitle: 'Column updated',
      errorTitle: 'Column update failed',
    },
    mutationFn: ({ columnId, input }: { columnId: string; input: UpdateColumnInput }) =>
      apiRequest<BoardColumn>(`/api/columns/${columnId}`, { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) }),
  });
}

export function useDeleteColumn(boardId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['column-delete'],
    meta: {
      loadingTitle: 'Archiving column',
      successTitle: 'Column archived',
      errorTitle: 'Column archive failed',
    },
    mutationFn: (columnId: string) =>
      apiRequest<unknown>(`/api/columns/${columnId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.columns(boardId) }),
  });
}

export function useReorderColumns(boardId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['column-reorder'],
    meta: { feedback: false },
    mutationFn: (columnIds: string[]) =>
      apiRequest<BoardColumn[]>(`/api/boards/${boardId}/reorder-columns`, {
        method: 'POST',
        body: { columnIds },
      }),
    onSuccess: (columns) => queryClient.setQueryData(boardKeys.columns(boardId), columns),
  });
}
