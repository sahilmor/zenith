'use client';

import type { AutomationRuleSummary } from '@pm/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

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

export const automationKeys = {
  automations: (workspaceId: string | null | undefined) => ['automations', workspaceId] as const,
};

export function useAutomations(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: automationKeys.automations(workspaceId),
    queryFn: () =>
      apiRequest<AutomationRuleSummary[]>(`/api/automations?workspaceId=${workspaceId}`),
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
      apiRequest<AutomationRuleSummary>('/api/automations', { method: 'POST', body: input }),
    onSuccess: (rule) =>
      queryClient.invalidateQueries({ queryKey: automationKeys.automations(rule.workspaceId) }),
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
      apiRequest<unknown>(`/api/automations/${ruleId}/test`, { method: 'POST' }),
  });
}
