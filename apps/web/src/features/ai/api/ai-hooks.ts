'use client';

import type {
  AiActionResult,
  AiActionType,
  AiConversationSummary,
  AiReference,
  AiSearchResult,
  AutomationRuleSummary,
  PromptSummary,
} from '@pm/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiStreamRequest } from '@/lib/api/client';

export interface ChatInput {
  readonly workspaceId: string;
  readonly conversationId?: string | null;
  readonly message: string;
  readonly references?: AiReference[];
}

export interface PromptInput {
  readonly workspaceId: string;
  readonly projectId?: string | null;
  readonly scope: 'global' | 'workspace' | 'project';
  readonly name: string;
  readonly content: string;
  readonly variables: string[];
}

export interface AutomationRuleInput {
  readonly workspaceId: string;
  readonly projectId?: string | null;
  readonly name: string;
  readonly description?: string | null;
  readonly enabled: boolean;
  readonly trigger: AutomationRuleSummary['trigger'];
  readonly conditions: AutomationRuleSummary['conditions'];
  readonly actions: AutomationRuleSummary['actions'];
}

export const aiKeys = {
  conversations: (workspaceId: string | null | undefined) =>
    ['ai', 'conversations', workspaceId] as const,
  prompts: (workspaceId: string | null | undefined) => ['ai', 'prompts', workspaceId] as const,
  automations: (workspaceId: string | null | undefined) =>
    ['ai', 'automations', workspaceId] as const,
};

export function useAiConversations(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: aiKeys.conversations(workspaceId),
    queryFn: () =>
      apiRequest<AiConversationSummary[]>(`/api/ai/conversations?workspaceId=${workspaceId}`),
    enabled: Boolean(workspaceId),
  });
}

export function useAiChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['ai-chat'],
    meta: { feedback: false },
    mutationFn: (input: ChatInput) =>
      apiRequest<AiConversationSummary>('/api/ai/chat', { method: 'POST', body: input }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations(conversation.workspaceId) });
    },
  });
}

export function useAiStreamChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['ai-stream-chat'],
    meta: { feedback: false },
    mutationFn: async (
      input: ChatInput & { onToken: (token: string) => void; signal?: AbortSignal },
    ) => {
      let conversationId: string | null = null;
      await apiStreamRequest('/api/ai/chat/stream', {
        body: {
          workspaceId: input.workspaceId,
          message: input.message,
          references: input.references ?? [],
          ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        },
        ...(input.signal ? { signal: input.signal } : {}),
        onEvent: (event) => {
          if (typeof event.conversationId === 'string') conversationId = event.conversationId;
          if (typeof event.token === 'string') input.onToken(event.token);
        },
      });
      return { workspaceId: input.workspaceId, conversationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations(result.workspaceId) });
    },
  });
}

export function useUpdateAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['ai-conversation-update'],
    meta: { feedback: false },
    mutationFn: (input: { conversationId: string; title?: string; pinned?: boolean }) =>
      apiRequest<AiConversationSummary>(`/api/ai/conversations/${input.conversationId}`, {
        method: 'PATCH',
        body: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
        },
      }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations(conversation.workspaceId) });
    },
  });
}

export function useAiAction() {
  return useMutation({
    mutationKey: ['ai-action'],
    meta: {
      loadingTitle: 'Running AI action',
      successTitle: 'AI action completed',
      errorTitle: 'AI action failed',
    },
    mutationFn: (input: {
      workspaceId: string;
      action: AiActionType;
      input: string;
      projectId?: string;
      boardId?: string;
      taskId?: string;
    }) => apiRequest<AiActionResult>('/api/ai/actions', { method: 'POST', body: input }),
  });
}

export function useAiSearch() {
  return useMutation({
    mutationKey: ['ai-search'],
    meta: { feedback: false },
    mutationFn: (input: { workspaceId: string; query: string }) =>
      apiRequest<AiSearchResult>('/api/ai/search', { method: 'POST', body: input }),
  });
}

export function usePrompts(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: aiKeys.prompts(workspaceId),
    queryFn: () => apiRequest<PromptSummary[]>(`/api/ai/prompts?workspaceId=${workspaceId}`),
    enabled: Boolean(workspaceId),
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['prompt-create'],
    meta: {
      loadingTitle: 'Saving prompt',
      successTitle: 'Prompt saved',
      errorTitle: 'Prompt save failed',
    },
    mutationFn: (input: PromptInput) =>
      apiRequest<PromptSummary>('/api/ai/prompts', { method: 'POST', body: input }),
    onSuccess: (prompt) =>
      queryClient.invalidateQueries({ queryKey: aiKeys.prompts(prompt.workspaceId) }),
  });
}

export function useAutomations(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: aiKeys.automations(workspaceId),
    queryFn: () =>
      apiRequest<AutomationRuleSummary[]>(`/api/ai/automations?workspaceId=${workspaceId}`),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['automation-create'],
    meta: {
      loadingTitle: 'Saving automation',
      successTitle: 'Automation saved',
      errorTitle: 'Automation save failed',
    },
    mutationFn: (input: AutomationRuleInput) =>
      apiRequest<AutomationRuleSummary>('/api/ai/automations', { method: 'POST', body: input }),
    onSuccess: (rule) =>
      queryClient.invalidateQueries({ queryKey: aiKeys.automations(rule.workspaceId) }),
  });
}

export function useTestAutomation() {
  return useMutation({
    mutationKey: ['automation-test'],
    meta: {
      loadingTitle: 'Testing automation',
      successTitle: 'Automation tested',
      errorTitle: 'Automation test failed',
    },
    mutationFn: (ruleId: string) =>
      apiRequest<unknown>(`/api/ai/automations/${ruleId}/test`, { method: 'POST' }),
  });
}
