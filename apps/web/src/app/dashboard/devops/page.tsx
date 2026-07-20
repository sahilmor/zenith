'use client';

import { PageHeader } from '@/components/common/page-header';
import { DevOpsConsole } from '@/features/devops/components/devops-console';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function DevOpsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);

  return (
    <main className="px-4 py-6 text-[var(--app-text)] md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Engineering"
          title="Software delivery"
          description="Connect repositories, track pull requests, CI/CD, deployments, and DORA metrics across the workspace."
        />
        <DevOpsConsole workspaceId={workspaceId} />
      </div>
    </main>
  );
}
