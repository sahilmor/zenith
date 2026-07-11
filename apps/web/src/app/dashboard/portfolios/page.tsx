'use client';

import { PageHeader } from '@/components/common/page-header';
import { usePortfolios } from '@/features/strategic/api/strategic-hooks';
import {
  CreatePortfolioPanel,
  PortfolioList,
} from '@/features/strategic/components/strategic-panels';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function PortfoliosPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const portfolios = usePortfolios(workspaceId);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Strategy"
          title="Portfolios"
          description="Roll multiple initiatives and projects into a leadership-level planning view."
        />
        <section className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <CreatePortfolioPanel workspaceId={workspaceId} />
          <PortfolioList portfolios={portfolios} />
        </section>
      </div>
    </main>
  );
}
