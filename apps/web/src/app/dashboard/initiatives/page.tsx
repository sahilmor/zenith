'use client';

import { PageHeader } from '@/components/common/page-header';
import { useInitiatives } from '@/features/strategic/api/strategic-hooks';
import {
  CreateInitiativePanel,
  InitiativeList,
} from '@/features/strategic/components/strategic-panels';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function InitiativesPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const initiatives = useInitiatives(workspaceId);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Strategy"
          title="Initiatives"
          description="Plan cross-project investments and monitor their delivery health."
        />
        <section className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <CreateInitiativePanel workspaceId={workspaceId} />
          <InitiativeList initiatives={initiatives} />
        </section>
      </div>
    </main>
  );
}
