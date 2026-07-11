'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AiState {
  readonly sidebarOpen: boolean;
  readonly currentConversationId: string | null;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly toggleSidebar: () => void;
  readonly setCurrentConversationId: (conversationId: string | null) => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      currentConversationId: null,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setCurrentConversationId: (currentConversationId) => set({ currentConversationId }),
    }),
    { name: 'pm-ai-copilot' },
  ),
);
