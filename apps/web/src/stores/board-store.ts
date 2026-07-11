'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BoardState {
  selectedBoardIds: Record<string, string>;
  setSelectedBoardId: (projectId: string, boardId: string) => void;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      selectedBoardIds: {},
      setSelectedBoardId: (projectId, boardId) =>
        set((state) => ({
          selectedBoardIds: { ...state.selectedBoardIds, [projectId]: boardId },
        })),
    }),
    { name: 'pm-selected-boards' },
  ),
);
