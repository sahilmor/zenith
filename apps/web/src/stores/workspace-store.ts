'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (workspaceId: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      setCurrentWorkspaceId: (workspaceId) => set({ currentWorkspaceId: workspaceId }),
    }),
    {
      name: 'pm-current-workspace',
    },
  ),
);
