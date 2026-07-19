'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DocumentSyncState, QueuedDocumentOperation } from '@/features/documents/types';

interface DocumentSyncStore {
  status: DocumentSyncState;
  operations: QueuedDocumentOperation[];
  setStatus: (status: DocumentSyncState) => void;
  enqueue: (operation: Omit<QueuedDocumentOperation, 'clientOperationId' | 'queuedAt'>) => string;
  remove: (clientOperationIds: string[]) => void;
  clearWorkspace: (workspaceId: string) => void;
}

const createOperationId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const useDocumentSyncStore = create<DocumentSyncStore>()(
  persist(
    (set) => ({
      status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
      operations: [],
      setStatus: (status) => set({ status }),
      enqueue: (operation) => {
        const clientOperationId = createOperationId();
        set((state) => ({
          operations: [
            ...state.operations,
            {
              ...operation,
              clientOperationId,
              queuedAt: new Date().toISOString(),
            },
          ],
          status: state.status === 'online' ? 'syncing' : state.status,
        }));
        return clientOperationId;
      },
      remove: (clientOperationIds) =>
        set((state) => ({
          operations: state.operations.filter(
            (operation) => !clientOperationIds.includes(operation.clientOperationId),
          ),
        })),
      clearWorkspace: (workspaceId) =>
        set((state) => ({
          operations: state.operations.filter((operation) => operation.workspaceId !== workspaceId),
        })),
    }),
    { name: 'zenith-document-sync-queue' },
  ),
);
