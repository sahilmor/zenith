'use client';

import type {
  BillingInterval,
  BillingInvoiceSummary,
  BillingPlanSummary,
  WorkspaceBillingSummary,
  WorkspaceEntitlementSummary,
  WorkspacePlan,
  WorkspaceSubscriptionSummary,
} from '@pm/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export const billingKeys = {
  plans: ['billing', 'plans'] as const,
  workspace: (workspaceId: string | null | undefined) => ['billing', workspaceId] as const,
  usage: (workspaceId: string | null | undefined) => ['billing', workspaceId, 'usage'] as const,
  invoices: (workspaceId: string | null | undefined) =>
    ['billing', workspaceId, 'invoices'] as const,
};

export function useBillingPlans() {
  return useQuery({
    queryKey: billingKeys.plans,
    queryFn: () => apiRequest<BillingPlanSummary[]>('/api/billing/plans'),
  });
}

export function useWorkspaceBilling(workspaceId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: billingKeys.workspace(workspaceId),
    queryFn: () => apiRequest<WorkspaceBillingSummary>(`/api/workspaces/${workspaceId}/billing`),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useWorkspaceUsage(workspaceId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: billingKeys.usage(workspaceId),
    queryFn: () =>
      apiRequest<WorkspaceEntitlementSummary>(`/api/workspaces/${workspaceId}/billing/usage`),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useInvoices(workspaceId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoices(workspaceId),
    queryFn: () =>
      apiRequest<BillingInvoiceSummary[]>(`/api/workspaces/${workspaceId}/billing/invoices`),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useCreateCheckout(workspaceId: string | null | undefined) {
  return useMutation({
    mutationKey: ['billing-checkout', workspaceId],
    meta: {
      loadingTitle: 'Preparing checkout',
      successTitle: 'Redirecting to secure checkout',
      errorTitle: 'Unable to start checkout',
    },
    mutationFn: (input: {
      planCode: Exclude<WorkspacePlan, 'free' | 'enterprise'>;
      billingInterval: BillingInterval;
    }) =>
      apiRequest<{ checkoutUrl: string }>(`/api/workspaces/${workspaceId}/billing/checkout`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (session) => {
      window.location.assign(session.checkoutUrl);
    },
  });
}

export function useBillingPortal(workspaceId: string | null | undefined) {
  return useMutation({
    mutationKey: ['billing-portal', workspaceId],
    meta: {
      loadingTitle: 'Opening billing portal',
      successTitle: 'Billing portal ready',
      errorTitle: 'Unable to open billing portal',
    },
    mutationFn: () =>
      apiRequest<{ url: string }>(`/api/workspaces/${workspaceId}/billing/portal`, {
        method: 'POST',
      }),
    onSuccess: (session) => window.location.assign(session.url),
  });
}

export function useCancelSubscription(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['billing-cancel', workspaceId],
    meta: {
      loadingTitle: 'Scheduling cancellation',
      successTitle: 'Cancellation scheduled',
      errorTitle: 'Unable to cancel subscription',
    },
    mutationFn: () =>
      apiRequest<WorkspaceSubscriptionSummary>(`/api/workspaces/${workspaceId}/billing/cancel`, {
        method: 'POST',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: billingKeys.workspace(workspaceId) }),
  });
}

export function useReactivateSubscription(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['billing-reactivate', workspaceId],
    meta: {
      loadingTitle: 'Reactivating subscription',
      successTitle: 'Subscription reactivated',
      errorTitle: 'Unable to reactivate subscription',
    },
    mutationFn: () =>
      apiRequest<WorkspaceSubscriptionSummary>(
        `/api/workspaces/${workspaceId}/billing/reactivate`,
        { method: 'POST' },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: billingKeys.workspace(workspaceId) }),
  });
}
