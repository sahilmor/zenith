'use client';

import { PageHeader } from '@/components/common/page-header';
import { ResourceConsole } from '@/features/resources/components/resource-console';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function ResourcesPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);

  return (
    <main className="px-4 py-6 text-[var(--app-text)] md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Resources"
          title="Workforce planning"
          description="Track time, capacity, utilization, availability, and delivery risk across the workspace."
        />
        <ResourceConsole workspaceId={workspaceId} />
      </div>
    </main>
  );
}
