'use client';

import { MutationCache, type Mutation } from '@tanstack/react-query';
import { getErrorMessage, toastManager } from './toast-manager';

interface FeedbackMeta {
  readonly feedback?: false;
  readonly loadingTitle?: string;
  readonly successTitle?: string;
  readonly errorTitle?: string;
  readonly successDescription?: string;
}

type FeedbackMutation = Mutation<unknown, unknown, unknown, unknown>;

const mutationToToast = new WeakMap<FeedbackMutation, string>();

const metaFor = (mutation: FeedbackMutation): FeedbackMeta => (mutation.meta ?? {}) as FeedbackMeta;

const shouldSkip = (mutation: FeedbackMutation): boolean => metaFor(mutation).feedback === false;

const actionName = (mutation: FeedbackMutation): string => {
  const key = mutation.options.mutationKey?.join(' ');
  if (!key) return 'Request';
  return key
    .replace(/[-_:]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
};

export const createMutationFeedbackCache = (): MutationCache =>
  new MutationCache({
    onMutate: (_variables, mutation) => {
      if (shouldSkip(mutation)) return;
      const meta = metaFor(mutation);
      const id = toastManager.show({
        title: meta.loadingTitle ?? `${actionName(mutation)} in progress`,
        variant: 'loading',
        persistent: true,
      });
      mutationToToast.set(mutation, id);
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      if (shouldSkip(mutation)) return;
      const id = mutationToToast.get(mutation);
      const meta = metaFor(mutation);
      const input = {
        title: meta.successTitle ?? `${actionName(mutation)} complete`,
        ...(meta.successDescription ? { description: meta.successDescription } : {}),
        variant: 'success' as const,
      };
      if (id) toastManager.update(id, input);
      else toastManager.show(input);
    },
    onError: (error, variables, _context, mutation) => {
      if (shouldSkip(mutation)) return;
      const id = mutationToToast.get(mutation);
      const meta = metaFor(mutation);
      const input = {
        title: meta.errorTitle ?? `${actionName(mutation)} failed`,
        description: getErrorMessage(error),
        variant: 'error' as const,
        action: {
          label: 'Retry',
          onClick: () => {
            if (id) toastManager.dismiss(id);
            void mutation.execute(variables);
          },
        },
      };
      if (id) toastManager.update(id, input);
      else toastManager.show(input);
    },
  });
