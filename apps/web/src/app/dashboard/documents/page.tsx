'use client';

import { DocumentConsole } from '@/features/documents/components/document-console';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function DocumentsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return <DocumentConsole workspaceId={workspaceId} />;
}
