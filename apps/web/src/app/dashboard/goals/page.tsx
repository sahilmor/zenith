'use client';

import { PageHeader } from '@/components/common/page-header';
import {
  CreateGoalPanel,
  GoalsList,
  StrategicDashboardCards,
} from '@/features/strategic/components/strategic-panels';
import { useGoals, useStrategicDashboard } from '@/features/strategic/api/strategic-hooks';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function GoalsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const goals = useGoals(workspaceId);
  const dashboard = useStrategicDashboard(workspaceId);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Strategy"
          title="Goals"
          description="Define OKRs, track confidence, and connect strategic outcomes to execution."
        />
        <StrategicDashboardCards dashboard={dashboard} />
        <section className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <CreateGoalPanel workspaceId={workspaceId} />
          <GoalsList goals={goals} />
        </section>
      </div>
    </main>
  );
}
