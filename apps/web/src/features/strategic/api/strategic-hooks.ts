'use client';

import type {
  GoalSummary,
  InitiativeSummary,
  KeyResultSummary,
  PortfolioSummary,
  StrategicCheckInSummary,
  StrategicDashboardSummary,
  StrategicLinkSummary,
} from '@pm/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export interface CreateGoalInput {
  readonly title: string;
  readonly description?: string | null;
  readonly type?: GoalSummary['type'];
  readonly status?: GoalSummary['status'];
  readonly health?: GoalSummary['health'];
  readonly parentGoalId?: string | null;
  readonly progressMode?: GoalSummary['progressMode'];
  readonly manualProgress?: number;
  readonly confidence?: number;
}

export type UpdateGoalInput = Partial<CreateGoalInput>;

export interface CreateKeyResultInput {
  readonly title: string;
  readonly measurementType?: KeyResultSummary['measurementType'];
  readonly startValue?: number;
  readonly currentValue?: number;
  readonly targetValue?: number;
}

export type UpdateKeyResultInput = Partial<CreateKeyResultInput>;

export interface CreateCheckInInput {
  readonly progress: number;
  readonly health: GoalSummary['health'];
  readonly confidence: number;
  readonly summary: string;
  readonly blockers?: string | null;
  readonly nextSteps?: string | null;
}

export interface CreateInitiativeInput {
  readonly name: string;
  readonly description?: string | null;
  readonly status?: InitiativeSummary['status'];
  readonly health?: InitiativeSummary['health'];
  readonly priority?: InitiativeSummary['priority'];
  readonly progressMode?: InitiativeSummary['progressMode'];
  readonly progress?: number;
}

export type UpdateInitiativeInput = Partial<CreateInitiativeInput>;

export interface CreatePortfolioInput {
  readonly name: string;
  readonly description?: string | null;
  readonly status?: PortfolioSummary['status'];
  readonly health?: PortfolioSummary['health'];
}

export type UpdatePortfolioInput = Partial<CreatePortfolioInput>;

export interface CreateStrategicLinkInput {
  readonly workspaceId: string;
  readonly sourceType: StrategicLinkSummary['sourceType'];
  readonly sourceId: string;
  readonly targetType: StrategicLinkSummary['targetType'];
  readonly targetId: string;
  readonly relationshipType: StrategicLinkSummary['relationshipType'];
  readonly weight?: number;
}

export const strategicKeys = {
  goals: (workspaceId: string | null | undefined) => ['strategic', workspaceId, 'goals'] as const,
  goal: (goalId: string | null | undefined) => ['strategic', 'goal', goalId] as const,
  keyResults: (goalId: string | null | undefined) =>
    ['strategic', 'goal', goalId, 'key-results'] as const,
  checkIns: (goalId: string | null | undefined) =>
    ['strategic', 'goal', goalId, 'check-ins'] as const,
  initiatives: (workspaceId: string | null | undefined) =>
    ['strategic', workspaceId, 'initiatives'] as const,
  initiative: (initiativeId: string | null | undefined) =>
    ['strategic', 'initiative', initiativeId] as const,
  portfolios: (workspaceId: string | null | undefined) =>
    ['strategic', workspaceId, 'portfolios'] as const,
  portfolio: (portfolioId: string | null | undefined) =>
    ['strategic', 'portfolio', portfolioId] as const,
  links: (workspaceId: string | null | undefined) => ['strategic', workspaceId, 'links'] as const,
  dashboard: (workspaceId: string | null | undefined) =>
    ['strategic', workspaceId, 'dashboard'] as const,
};

export function useGoals(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: strategicKeys.goals(workspaceId),
    queryFn: () => apiRequest<GoalSummary[]>(`/api/workspaces/${workspaceId}/goals`),
    enabled: Boolean(workspaceId),
  });
}

export function useGoal(goalId: string | null | undefined) {
  return useQuery({
    queryKey: strategicKeys.goal(goalId),
    queryFn: () => apiRequest<GoalSummary>(`/api/goals/${goalId}`),
    enabled: Boolean(goalId),
  });
}

export function useKeyResults(goalId: string | null | undefined) {
  return useQuery({
    queryKey: strategicKeys.keyResults(goalId),
    queryFn: () => apiRequest<KeyResultSummary[]>(`/api/goals/${goalId}/key-results`),
    enabled: Boolean(goalId),
  });
}

export function useCheckIns(goalId: string | null | undefined) {
  return useQuery({
    queryKey: strategicKeys.checkIns(goalId),
    queryFn: () => apiRequest<StrategicCheckInSummary[]>(`/api/goals/${goalId}/check-ins`),
    enabled: Boolean(goalId),
  });
}

export function useInitiatives(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: strategicKeys.initiatives(workspaceId),
    queryFn: () => apiRequest<InitiativeSummary[]>(`/api/workspaces/${workspaceId}/initiatives`),
    enabled: Boolean(workspaceId),
  });
}

export function usePortfolios(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: strategicKeys.portfolios(workspaceId),
    queryFn: () => apiRequest<PortfolioSummary[]>(`/api/workspaces/${workspaceId}/portfolios`),
    enabled: Boolean(workspaceId),
  });
}

export function useStrategicLinks(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: strategicKeys.links(workspaceId),
    queryFn: () =>
      apiRequest<StrategicLinkSummary[]>(`/api/workspaces/${workspaceId}/strategic-links`),
    enabled: Boolean(workspaceId),
  });
}

export function useStrategicDashboard(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: strategicKeys.dashboard(workspaceId),
    queryFn: () =>
      apiRequest<StrategicDashboardSummary>(`/api/workspaces/${workspaceId}/strategic-dashboard`),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateGoal(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-goal-create'],
    meta: {
      loadingTitle: 'Creating goal',
      successTitle: 'Goal created',
      errorTitle: 'Goal creation failed',
    },
    mutationFn: (input: CreateGoalInput) =>
      apiRequest<GoalSummary>(`/api/workspaces/${workspaceId}/goals`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: strategicKeys.goals(goal.workspaceId) });
      queryClient.invalidateQueries({ queryKey: strategicKeys.dashboard(goal.workspaceId) });
    },
  });
}

export function useCreateKeyResult(goalId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-key-result-create'],
    meta: {
      loadingTitle: 'Creating key result',
      successTitle: 'Key result created',
      errorTitle: 'Key result creation failed',
    },
    mutationFn: (input: CreateKeyResultInput) =>
      apiRequest<KeyResultSummary>(`/api/goals/${goalId}/key-results`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (keyResult) => {
      queryClient.invalidateQueries({ queryKey: strategicKeys.keyResults(keyResult.goalId) });
      queryClient.invalidateQueries({ queryKey: strategicKeys.goal(keyResult.goalId) });
    },
  });
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-key-result-update'],
    meta: {
      loadingTitle: 'Updating key result',
      successTitle: 'Key result updated',
      errorTitle: 'Key result update failed',
    },
    mutationFn: (input: { keyResultId: string; values: UpdateKeyResultInput }) =>
      apiRequest<KeyResultSummary>(`/api/key-results/${input.keyResultId}`, {
        method: 'PATCH',
        body: input.values,
      }),
    onSuccess: (keyResult) => {
      queryClient.invalidateQueries({ queryKey: strategicKeys.keyResults(keyResult.goalId) });
      queryClient.invalidateQueries({ queryKey: strategicKeys.goal(keyResult.goalId) });
    },
  });
}

export function useCreateCheckIn(goalId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-check-in-create'],
    meta: {
      loadingTitle: 'Posting check-in',
      successTitle: 'Check-in posted',
      errorTitle: 'Check-in failed',
    },
    mutationFn: (input: CreateCheckInInput) =>
      apiRequest<StrategicCheckInSummary>(`/api/goals/${goalId}/check-ins`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (checkIn) => {
      queryClient.invalidateQueries({ queryKey: strategicKeys.checkIns(checkIn.goalId) });
      queryClient.invalidateQueries({ queryKey: strategicKeys.goal(checkIn.goalId) });
    },
  });
}

export function useCreateInitiative(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-initiative-create'],
    meta: {
      loadingTitle: 'Creating initiative',
      successTitle: 'Initiative created',
      errorTitle: 'Initiative creation failed',
    },
    mutationFn: (input: CreateInitiativeInput) =>
      apiRequest<InitiativeSummary>(`/api/workspaces/${workspaceId}/initiatives`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (initiative) =>
      queryClient.invalidateQueries({
        queryKey: strategicKeys.initiatives(initiative.workspaceId),
      }),
  });
}

export function useUpdateInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-initiative-update'],
    meta: {
      loadingTitle: 'Updating initiative',
      successTitle: 'Initiative updated',
      errorTitle: 'Initiative update failed',
    },
    mutationFn: (input: { initiativeId: string; values: UpdateInitiativeInput }) =>
      apiRequest<InitiativeSummary>(`/api/initiatives/${input.initiativeId}`, {
        method: 'PATCH',
        body: input.values,
      }),
    onSuccess: (initiative) =>
      queryClient.invalidateQueries({
        queryKey: strategicKeys.initiatives(initiative.workspaceId),
      }),
  });
}

export function useCreatePortfolio(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-portfolio-create'],
    meta: {
      loadingTitle: 'Creating portfolio',
      successTitle: 'Portfolio created',
      errorTitle: 'Portfolio creation failed',
    },
    mutationFn: (input: CreatePortfolioInput) =>
      apiRequest<PortfolioSummary>(`/api/workspaces/${workspaceId}/portfolios`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (portfolio) =>
      queryClient.invalidateQueries({ queryKey: strategicKeys.portfolios(portfolio.workspaceId) }),
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-portfolio-update'],
    meta: {
      loadingTitle: 'Updating portfolio',
      successTitle: 'Portfolio updated',
      errorTitle: 'Portfolio update failed',
    },
    mutationFn: (input: { portfolioId: string; values: UpdatePortfolioInput }) =>
      apiRequest<PortfolioSummary>(`/api/portfolios/${input.portfolioId}`, {
        method: 'PATCH',
        body: input.values,
      }),
    onSuccess: (portfolio) =>
      queryClient.invalidateQueries({ queryKey: strategicKeys.portfolios(portfolio.workspaceId) }),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-goal-update'],
    meta: {
      loadingTitle: 'Updating goal',
      successTitle: 'Goal updated',
      errorTitle: 'Goal update failed',
    },
    mutationFn: (input: { goalId: string; values: UpdateGoalInput }) =>
      apiRequest<GoalSummary>(`/api/goals/${input.goalId}`, {
        method: 'PATCH',
        body: input.values,
      }),
    onSuccess: (goal) => {
      queryClient.setQueryData(strategicKeys.goal(goal.id), goal);
      queryClient.invalidateQueries({ queryKey: strategicKeys.goals(goal.workspaceId) });
      queryClient.invalidateQueries({ queryKey: strategicKeys.dashboard(goal.workspaceId) });
    },
  });
}

export function useArchiveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-goal-archive'],
    meta: {
      loadingTitle: 'Archiving goal',
      successTitle: 'Goal archived',
      errorTitle: 'Goal archive failed',
    },
    mutationFn: (goal: GoalSummary) =>
      apiRequest<GoalSummary>(`/api/goals/${goal.id}/archive`, { method: 'POST' }),
    onSuccess: (goal) => {
      queryClient.setQueryData(strategicKeys.goal(goal.id), goal);
      queryClient.invalidateQueries({ queryKey: strategicKeys.goals(goal.workspaceId) });
      queryClient.invalidateQueries({ queryKey: strategicKeys.dashboard(goal.workspaceId) });
    },
  });
}

export function useRestoreGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-goal-restore'],
    meta: {
      loadingTitle: 'Restoring goal',
      successTitle: 'Goal restored',
      errorTitle: 'Goal restore failed',
    },
    mutationFn: (goal: GoalSummary) =>
      apiRequest<GoalSummary>(`/api/goals/${goal.id}/restore`, { method: 'POST' }),
    onSuccess: (goal) => {
      queryClient.setQueryData(strategicKeys.goal(goal.id), goal);
      queryClient.invalidateQueries({ queryKey: strategicKeys.goals(goal.workspaceId) });
      queryClient.invalidateQueries({ queryKey: strategicKeys.dashboard(goal.workspaceId) });
    },
  });
}

export function useCreateStrategicLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strategic-link-create'],
    meta: {
      loadingTitle: 'Linking work',
      successTitle: 'Strategic link created',
      errorTitle: 'Strategic link failed',
    },
    mutationFn: (input: CreateStrategicLinkInput) =>
      apiRequest<StrategicLinkSummary>('/api/strategic-links', {
        method: 'POST',
        body: input,
      }),
    onSuccess: (link) => {
      queryClient.invalidateQueries({ queryKey: strategicKeys.links(link.workspaceId) });
      queryClient.invalidateQueries({ queryKey: strategicKeys.dashboard(link.workspaceId) });
    },
  });
}
