import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/providers/toast-provider';
import { CreateColumnDialog } from './create-column-dialog';

vi.mock('@/lib/api/client', () => ({
  apiRequest: vi.fn(),
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

describe('CreateColumnDialog', () => {
  it('validates the column name before enabling submission', () => {
    render(
      <Providers>
        <CreateColumnDialog open boardId="board-1" onClose={vi.fn()} />
      </Providers>,
    );

    const button = screen.getByRole('button', { name: /create column/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'QA' } });
    expect(button).toBeEnabled();
  });
});
