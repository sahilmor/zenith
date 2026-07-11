import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMutationFeedbackCache } from './mutation-feedback';
import { toastManager } from './toast-manager';

describe('createMutationFeedbackCache', () => {
  afterEach(() => {
    toastManager.clear();
  });

  it('shows loading, success, and retryable error feedback for mutations', async () => {
    const queryClient = new QueryClient({
      mutationCache: createMutationFeedbackCache(),
      defaultOptions: { mutations: { retry: 0 } },
    });

    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: ['save-settings'],
        mutationFn: async () => 'ok',
      })
      .execute(undefined);

    expect(toastManager.snapshot()[0]?.title).toBe('Save settings complete');

    const retry = vi.fn().mockRejectedValueOnce(new Error('Still unavailable'));
    await expect(
      queryClient
        .getMutationCache()
        .build(queryClient, {
          mutationKey: ['save-settings'],
          mutationFn: retry,
        })
        .execute(undefined),
    ).rejects.toThrow('Still unavailable');

    const errorToast = toastManager.snapshot()[0];
    expect(errorToast?.title).toBe('Save settings failed');
    expect(errorToast?.description).toBe('Still unavailable');
    expect(errorToast?.action?.label).toBe('Retry');
  });
});
