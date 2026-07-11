import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/providers/toast-provider';
import { AiCopilotSidebar } from './ai-copilot-sidebar';

const apiRequest = vi.fn();
const apiStreamRequest = vi.fn();
let sidebarOpen = true;
let currentConversationId: string | null = null;

vi.mock('@/lib/api/client', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
  apiStreamRequest: (...args: unknown[]) => apiStreamRequest(...args),
}));

vi.mock('@/stores/workspace-store', () => ({
  useWorkspaceStore: (selector: (state: { currentWorkspaceId: string }) => unknown) =>
    selector({ currentWorkspaceId: 'workspace-1' }),
}));

vi.mock('@/stores/ai-store', () => ({
  useAiStore: (
    selector: (state: {
      sidebarOpen: boolean;
      currentConversationId: string | null;
      setSidebarOpen: (open: boolean) => void;
      toggleSidebar: () => void;
      setCurrentConversationId: (id: string | null) => void;
    }) => unknown,
  ) =>
    selector({
      sidebarOpen,
      currentConversationId,
      setSidebarOpen: (open) => {
        sidebarOpen = open;
      },
      toggleSidebar: () => {
        sidebarOpen = !sidebarOpen;
      },
      setCurrentConversationId: (id) => {
        currentConversationId = id;
      },
    }),
}));

function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

describe('AiCopilotSidebar', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiStreamRequest.mockReset();
    sidebarOpen = true;
    currentConversationId = null;
    apiRequest.mockResolvedValue([]);
  });

  it('renders the copilot and submits a chat request', async () => {
    apiRequest.mockImplementation((path: string) => {
      if (path.startsWith('/api/ai/conversations')) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    apiStreamRequest.mockImplementation(
      (_path: string, options: { onEvent: (event: Record<string, unknown>) => void }) => {
        options.onEvent({ conversationId: 'conversation-1' });
        options.onEvent({ token: 'Here ' });
        options.onEvent({ token: 'is a plan' });
        return Promise.resolve();
      },
    );

    render(
      <Providers>
        <AiCopilotSidebar />
      </Providers>,
    );

    fireEvent.change(screen.getByPlaceholderText(/ask ai to plan/i), {
      target: { value: 'Plan launch' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send ai message/i }));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('/api/ai/conversations')),
    );
    expect(apiStreamRequest).toHaveBeenCalledWith(
      '/api/ai/chat/stream',
      expect.objectContaining({ body: expect.objectContaining({ message: 'Plan launch' }) }),
    );
  });
});
