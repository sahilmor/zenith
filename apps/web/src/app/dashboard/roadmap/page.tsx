'use client';

import { PageHeader } from '@/components/common/page-header';
import { useGoals, useInitiatives, usePortfolios } from '@/features/strategic/api/strategic-hooks';
import { RoadmapPanel } from '@/features/strategic/components/strategic-panels';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function RoadmapPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const goals = useGoals(workspaceId);
  const initiatives = useInitiatives(workspaceId);
  const portfolios = usePortfolios(workspaceId);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Planning"
          title="Roadmap"
          description="View goals, initiatives, and portfolios together for cross-project planning."
        />
        <RoadmapPanel goals={goals} initiatives={initiatives} portfolios={portfolios} />
      </div>
    </main>
  );
}
