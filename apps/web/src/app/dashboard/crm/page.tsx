'use client';

import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { CrmConsole } from '@/features/crm/components/crm-console';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function CrmPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);

  return (
    <main className="px-4 py-6 text-[var(--app-text)] md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="CRM"
          title="Customer lifecycle"
          description="Manage accounts, leads, deals, activity, customer health, renewals, and next actions."
          actions={
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-xs text-[var(--app-muted)] sm:flex">
              <Building2 className="size-4 text-emerald-300" />
              Work + CRM
            </div>
          }
        />
        <CrmConsole workspaceId={workspaceId} />
      </div>
    </main>
  );
}
