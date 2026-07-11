'use client';

import { PageHeader } from '@/components/common/page-header';
import { CustomizationConsole } from '@/features/customization/components/customization-console';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function CustomizationPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="Customization"
          description="Configure custom fields, task types, workflows, intake forms, and templates."
        />
        <CustomizationConsole workspaceId={workspaceId} />
      </div>
    </main>
  );
}
