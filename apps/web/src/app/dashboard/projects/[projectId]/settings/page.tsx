'use client';

import type { ProjectVisibility } from '@pm/types';
import Link from 'next/link';
import { ArrowLeft, Archive, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useArchiveProject,
  useDeleteProject,
  useProject,
  useRestoreProject,
  useUpdateProject,
} from '@/features/projects/api/project-hooks';
import { ProjectBadge } from '@/features/projects/components/project-badge';
import { ProjectDangerDialog } from '@/features/projects/components/project-danger-dialog';
import type { Project } from '@/features/projects/types';

type DangerAction = 'archive' | 'restore' | 'delete';

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const project = useProject(params.projectId);
  const updateProject = useUpdateProject(params.projectId);
  const archiveProject = useArchiveProject();
  const restoreProject = useRestoreProject();
  const deleteProject = useDeleteProject();
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#22c55e');
  const [coverImage, setCoverImage] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');

  useEffect(() => {
    if (!project.data) return;
    setName(project.data.name);
    setDescription(project.data.description ?? '');
    setIcon(project.data.icon ?? '');
    setColor(project.data.color ?? '#22c55e');
    setCoverImage(project.data.coverImage ?? '');
    setVisibility(project.data.visibility);
  }, [project.data]);

  const save = () => {
    updateProject.mutate({
      name,
      description: description.trim() ? description : null,
      icon: icon.trim() ? icon : null,
      color,
      coverImage: coverImage.trim() ? coverImage : null,
      visibility,
    });
  };

  const confirmDanger = () => {
    if (!project.data || !dangerAction) return;
    const currentProject = project.data;
    if (dangerAction === 'archive') {
      archiveProject.mutate(currentProject, {
        onSuccess: () => setDangerAction(null),
      });
      return;
    }
    if (dangerAction === 'restore') {
      restoreProject.mutate(currentProject, {
        onSuccess: () => setDangerAction(null),
      });
      return;
    }
    deleteProject.mutate(currentProject, {
      onSuccess: () => {
        router.replace('/dashboard/projects');
      },
    });
  };

  const currentProject: Project | null = project.data ?? null;
  const dangerLoading =
    archiveProject.isPending || restoreProject.isPending || deleteProject.isPending;

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link
            href={project.data ? `/dashboard/projects/${project.data.id}` : '/dashboard/projects'}
          >
            <ArrowLeft className="size-4" />
            Project
          </Link>
        </Button>
        <PageHeader
          eyebrow="Project"
          title="Settings"
          description="Manage project identity, visibility, and lifecycle."
          actions={
            <Button
              onClick={save}
              loading={updateProject.isPending}
              disabled={!project.data || project.data.status === 'archived'}
            >
              <Save className="size-4" />
              Save
            </Button>
          }
        />
        {project.isLoading ? (
          <Card className="rounded-lg p-6">
            <Skeleton className="size-12 rounded-lg" />
            <Skeleton className="mt-5 h-8 w-1/2" />
            <Skeleton className="mt-4 h-4 w-full" />
          </Card>
        ) : project.isError ? (
          <ErrorState title="Unable to load project" description="Please refresh and try again." />
        ) : project.data ? (
          <div className="grid gap-6">
            <Card className="rounded-lg p-6">
              <div className="mb-6 flex items-center gap-4">
                <ProjectBadge
                  name={project.data.name}
                  icon={project.data.icon}
                  color={project.data.color}
                  className="size-12"
                />
                <div>
                  <h2 className="font-semibold">{project.data.name}</h2>
                  <p className="text-sm text-slate-400">{project.data.key}</p>
                </div>
              </div>
              <div className="grid gap-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Icon"
                    value={icon}
                    onChange={(event) => setIcon(event.target.value)}
                  />
                  <Input
                    label="Color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                  />
                </div>
                <Input
                  label="Cover image"
                  value={coverImage}
                  onChange={(event) => setCoverImage(event.target.value)}
                  placeholder="https://..."
                />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Visibility</span>
                  <select
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as ProjectVisibility)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  >
                    <option value="private">private</option>
                    <option value="public">public</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  />
                </label>
              </div>
            </Card>
            <Card className="rounded-lg border-red-400/20 p-6">
              <h2 className="font-semibold text-red-200">Project lifecycle</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Archive projects to freeze changes, restore them when work resumes, or delete
                records that are no longer needed.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {project.data.status === 'archived' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDangerAction('restore')}
                  >
                    <RotateCcw className="size-4" />
                    Restore
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDangerAction('archive')}
                  >
                    <Archive className="size-4" />
                    Archive
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDangerAction('delete')}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
      <ProjectDangerDialog
        action={dangerAction}
        project={currentProject}
        loading={dangerLoading}
        onClose={() => setDangerAction(null)}
        onConfirm={confirmDanger}
      />
    </main>
  );
}
