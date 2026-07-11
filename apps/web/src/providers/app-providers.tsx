'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RealtimeProvider } from '@/features/realtime/realtime-provider';
import { createMutationFeedbackCache } from '@/lib/feedback/mutation-feedback';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from './theme-provider';
import { ToastProvider } from './toast-provider';
import { WorkspaceProvider } from './workspace-provider';

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: createMutationFeedbackCache(),
        defaultOptions: {
          queries: { staleTime: 60_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <RealtimeProvider>{children}</RealtimeProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
