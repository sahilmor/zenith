'use client';

import type {
  CrmAccountSummary,
  CrmActivitySummary,
  CrmContactSummary,
  CrmDashboardSummary,
  CrmDealSummary,
  CrmLeadSummary,
} from '@pm/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export interface CreateCrmAccountInput {
  readonly name: string;
  readonly domain?: string | null;
  readonly website?: string | null;
  readonly industry?: string | null;
  readonly size?: string | null;
  readonly status?: 'prospect' | 'customer' | 'partner' | 'former';
  readonly healthScore?: number;
  readonly lifecycleStage?: string;
  readonly renewalDate?: string | null;
  readonly tags?: string[];
}

export interface CreateCrmLeadInput {
  readonly companyName: string;
  readonly contactName: string;
  readonly email: string;
  readonly source?: string | null;
  readonly score?: number;
  readonly estimatedValue?: number;
  readonly tags?: string[];
}

export interface CreateCrmDealInput {
  readonly accountId: string;
  readonly contactId?: string | null;
  readonly projectId?: string | null;
  readonly name: string;
  readonly stage?:
    'qualification' | 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  readonly forecastCategory?: 'pipeline' | 'best_case' | 'commit' | 'closed';
  readonly value?: number;
  readonly currency?: string;
  readonly probability?: number;
  readonly expectedCloseDate?: string | null;
  readonly nextStep?: string | null;
  readonly tags?: string[];
}

export const crmKeys = {
  dashboard: (workspaceId: string | null | undefined) => ['crm', workspaceId, 'dashboard'] as const,
  accounts: (workspaceId: string | null | undefined) => ['crm', workspaceId, 'accounts'] as const,
  contacts: (workspaceId: string | null | undefined) => ['crm', workspaceId, 'contacts'] as const,
  leads: (workspaceId: string | null | undefined) => ['crm', workspaceId, 'leads'] as const,
  deals: (workspaceId: string | null | undefined) => ['crm', workspaceId, 'deals'] as const,
};

export function useCrmDashboard(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: crmKeys.dashboard(workspaceId),
    queryFn: () => apiRequest<CrmDashboardSummary>(`/api/workspaces/${workspaceId}/crm`),
    enabled: Boolean(workspaceId),
  });
}

export function useCrmAccounts(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: crmKeys.accounts(workspaceId),
    queryFn: () => apiRequest<CrmAccountSummary[]>(`/api/workspaces/${workspaceId}/crm/accounts`),
    enabled: Boolean(workspaceId),
  });
}

export function useCrmContacts(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: crmKeys.contacts(workspaceId),
    queryFn: () => apiRequest<CrmContactSummary[]>(`/api/workspaces/${workspaceId}/crm/contacts`),
    enabled: Boolean(workspaceId),
  });
}

export function useCrmLeads(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: crmKeys.leads(workspaceId),
    queryFn: () => apiRequest<CrmLeadSummary[]>(`/api/workspaces/${workspaceId}/crm/leads`),
    enabled: Boolean(workspaceId),
  });
}

export function useCrmDeals(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: crmKeys.deals(workspaceId),
    queryFn: () => apiRequest<CrmDealSummary[]>(`/api/workspaces/${workspaceId}/crm/deals`),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateCrmAccount(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['crm-account-create'],
    meta: {
      loadingTitle: 'Creating account',
      successTitle: 'Account created',
      errorTitle: 'Account creation failed',
    },
    mutationFn: (input: CreateCrmAccountInput) =>
      apiRequest<CrmAccountSummary>(`/api/workspaces/${workspaceId}/crm/accounts`, {
        method: 'POST',
        body: { tags: [], customFields: [], ...input },
      }),
    onSuccess: (account) => {
      queryClient.setQueryData<CrmAccountSummary[]>(crmKeys.accounts(workspaceId), (current) => {
        if (!current) return [account];
        if (current.some((item) => item.id === account.id)) return current;
        return [account, ...current];
      });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard(workspaceId) });
    },
  });
}

export function useCreateCrmLead(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['crm-lead-create'],
    meta: {
      loadingTitle: 'Creating lead',
      successTitle: 'Lead created',
      errorTitle: 'Lead creation failed',
    },
    mutationFn: (input: CreateCrmLeadInput) =>
      apiRequest<CrmLeadSummary>(`/api/workspaces/${workspaceId}/crm/leads`, {
        method: 'POST',
        body: { tags: [], customFields: [], ...input },
      }),
    onSuccess: (lead) => {
      queryClient.setQueryData<CrmLeadSummary[]>(crmKeys.leads(workspaceId), (current) => {
        if (!current) return [lead];
        if (current.some((item) => item.id === lead.id)) return current;
        return [lead, ...current];
      });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard(workspaceId) });
    },
  });
}

export function useCreateCrmDeal(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['crm-deal-create'],
    meta: {
      loadingTitle: 'Creating deal',
      successTitle: 'Deal created',
      errorTitle: 'Deal creation failed',
    },
    mutationFn: (input: CreateCrmDealInput) =>
      apiRequest<CrmDealSummary>(`/api/workspaces/${workspaceId}/crm/deals`, {
        method: 'POST',
        body: { tags: [], customFields: [], ...input },
      }),
    onSuccess: (deal) => {
      queryClient.setQueryData<CrmDealSummary[]>(crmKeys.deals(workspaceId), (current) => {
        if (!current) return [deal];
        if (current.some((item) => item.id === deal.id)) return current;
        return [deal, ...current];
      });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard(workspaceId) });
    },
  });
}

export function useConvertCrmLead(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['crm-lead-convert'],
    meta: {
      loadingTitle: 'Converting lead',
      successTitle: 'Lead converted',
      errorTitle: 'Lead conversion failed',
    },
    mutationFn: (leadId: string) =>
      apiRequest<{
        account: CrmAccountSummary;
        contact: CrmContactSummary;
        deal: CrmDealSummary;
      }>(`/api/crm/leads/${leadId}/convert`, { method: 'POST' }),
    onSuccess: ({ account, contact, deal }) => {
      queryClient.setQueryData<CrmAccountSummary[]>(crmKeys.accounts(workspaceId), (current) => {
        if (!current) return [account];
        if (current.some((item) => item.id === account.id)) return current;
        return [account, ...current];
      });
      queryClient.setQueryData<CrmContactSummary[]>(crmKeys.contacts(workspaceId), (current) => {
        if (!current) return [contact];
        if (current.some((item) => item.id === contact.id)) return current;
        return [contact, ...current];
      });
      queryClient.setQueryData<CrmDealSummary[]>(crmKeys.deals(workspaceId), (current) => {
        if (!current) return [deal];
        if (current.some((item) => item.id === deal.id)) return current;
        return [deal, ...current];
      });
      queryClient.invalidateQueries({ queryKey: crmKeys.leads(workspaceId) });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard(workspaceId) });
    },
  });
}

export function useCreateCrmActivity(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['crm-activity-create'],
    meta: {
      loadingTitle: 'Logging activity',
      successTitle: 'Activity logged',
      errorTitle: 'Activity failed',
    },
    mutationFn: (input: {
      readonly accountId?: string | null;
      readonly contactId?: string | null;
      readonly leadId?: string | null;
      readonly dealId?: string | null;
      readonly taskId?: string | null;
      readonly type: 'note' | 'email' | 'call' | 'meeting' | 'task' | 'follow_up';
      readonly title: string;
      readonly body?: string | null;
    }) =>
      apiRequest<CrmActivitySummary>(`/api/workspaces/${workspaceId}/crm/activities`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: crmKeys.dashboard(workspaceId) }),
  });
}
