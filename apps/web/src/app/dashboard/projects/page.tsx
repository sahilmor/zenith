'use client';

import Link from 'next/link';
import { Archive, FolderKanban, Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useProjects } from '@/features/projects/api/project-hooks';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { ProjectBadge } from '@/features/projects/components/project-badge';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const projects = useProjects(workspaceId);
  const items = projects.data ?? [];

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="Projects"
          description="Create and organize workspace initiatives, boards, and task workflows."
          actions={
            <Button onClick={() => setCreateOpen(true)} disabled={!workspaceId}>
              <Plus className="size-4" />
              New project
            </Button>
          }
        />
        {projects.isLoading ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Card key={item} className="rounded-lg p-5">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="mt-5 h-5 w-1/2" />
                <Skeleton className="mt-3 h-3 w-full" />
              </Card>
            ))}
          </section>
        ) : projects.isError ? (
          <ErrorState title="Unable to load projects" description="Please refresh and try again." />
        ) : items.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((project) => (
              <Card
                key={project.id}
                className="group rounded-lg p-5 transition hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/dashboard/projects/${project.id}`} className="flex min-w-0 gap-3">
                    <ProjectBadge name={project.name} icon={project.icon} color={project.color} />
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{project.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">{project.key}</p>
                    </div>
                  </Link>
                  <Link
                    href={`/dashboard/projects/${project.id}/settings`}
                    className="rounded-lg p-2 text-slate-500 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    aria-label="Project settings"
                  >
                    <Settings className="size-4" />
                  </Link>
                </div>
                <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">
                  {project.description ?? 'No description yet.'}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                  <span className="capitalize">{project.visibility}</span>
                  <span className="flex items-center gap-1 capitalize">
                    {project.status === 'archived' ? <Archive className="size-3.5" /> : null}
                    {project.status}
                  </span>
                </div>
              </Card>
            ))}
          </section>
        ) : (
          <EmptyState
            icon={<FolderKanban className="mx-auto size-8 text-emerald-300" />}
            title="No projects yet"
            description="Create the first project for this workspace."
          />
        )}
      </div>
      <CreateProjectDialog
        open={createOpen}
        workspaceId={workspaceId}
        onClose={() => setCreateOpen(false)}
      />
    </main>
  );
}
