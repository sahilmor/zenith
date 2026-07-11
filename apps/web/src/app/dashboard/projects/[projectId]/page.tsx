'use client';

import Link from 'next/link';
import { ArrowLeft, Archive, KanbanSquare, Settings } from 'lucide-react';
import { useParams } from 'next/navigation';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useProject } from '@/features/projects/api/project-hooks';
import { ProjectBadge } from '@/features/projects/components/project-badge';

export default function ProjectDetailsPage() {
  const params = useParams<{ projectId: string }>();
  const project = useProject(params.projectId);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/projects">
            <ArrowLeft className="size-4" />
            Projects
          </Link>
        </Button>
        {project.isLoading ? (
          <Card className="rounded-lg p-6">
            <Skeleton className="size-12 rounded-lg" />
            <Skeleton className="mt-5 h-8 w-1/2" />
            <Skeleton className="mt-4 h-4 w-full" />
          </Card>
        ) : project.isError ? (
          <ErrorState title="Unable to load project" description="Please refresh and try again." />
        ) : project.data ? (
          <>
            <PageHeader
              eyebrow={project.data.key}
              title={project.data.name}
              description={project.data.description ?? 'No description has been added.'}
              actions={
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="secondary">
                    <Link href={`/dashboard/projects/${project.data.id}/settings`}>
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/dashboard/projects/${project.data.id}/boards`}>
                      <KanbanSquare className="size-4" />
                      Boards
                    </Link>
                  </Button>
                </div>
              }
            />
            <section className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-lg p-5">
                <ProjectBadge
                  name={project.data.name}
                  icon={project.data.icon}
                  color={project.data.color}
                  className="size-12"
                />
                <h2 className="mt-4 font-semibold">Identity</h2>
                <p className="mt-2 text-sm text-slate-400">{project.data.key}</p>
              </Card>
              <Card className="rounded-lg p-5">
                <h2 className="font-semibold">Visibility</h2>
                <p className="mt-2 text-sm capitalize text-slate-400">{project.data.visibility}</p>
              </Card>
              <Card className="rounded-lg p-5">
                <h2 className="font-semibold">Status</h2>
                <p className="mt-2 flex items-center gap-2 text-sm capitalize text-slate-400">
                  {project.data.status === 'archived' ? <Archive className="size-4" /> : null}
                  {project.data.status}
                </p>
              </Card>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
