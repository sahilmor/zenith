'use client';

import type { PromptScope } from '@pm/types';
import { BookOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCreatePrompt, usePrompts } from '@/features/ai/api/ai-hooks';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function PromptsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const prompts = usePrompts(workspaceId);
  const createPrompt = useCreatePrompt();
  const [scope, setScope] = useState<PromptScope>('workspace');
  const [name, setName] = useState('Release note writer');
  const [content, setContent] = useState(
    'Write release notes for {{completedTasks}} grouped by project.',
  );
  const variables = Array.from(content.matchAll(/\{\{([^}]+)\}\}/g)).map((match) => match[1] ?? '');

  const save = () => {
    if (!workspaceId || !name.trim() || !content.trim()) return;
    createPrompt.mutate({ workspaceId, scope, name, content, variables });
  };

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Prompt library"
          title="Reusable AI prompts"
          description="Store workspace and project prompts with variables and versioning foundation."
          actions={
            <Button onClick={save}>
              <Plus className="size-4" />
              Save prompt
            </Button>
          }
        />
        <Card className="rounded-lg p-5">
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="space-y-4">
              <label className="space-y-2 text-sm text-slate-400">
                <span>Scope</span>
                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value as PromptScope)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                >
                  <option value="global">Global</option>
                  <option value="workspace">Workspace</option>
                  <option value="project">Project</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-400">
                <span>Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
                Variables: {variables.length ? variables.join(', ') : 'none'}
              </div>
            </div>
            <label className="space-y-2 text-sm text-slate-400">
              <span>Prompt preview</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-48 w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </Card>
        {prompts.isLoading ? (
          <Card className="rounded-lg p-5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-4 h-28 w-full" />
          </Card>
        ) : prompts.data?.length ? (
          <section className="grid gap-4 md:grid-cols-2">
            {prompts.data.map((prompt) => (
              <Card key={prompt.id} className="rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{prompt.name}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                    v{prompt.version}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase text-slate-500">{prompt.scope}</p>
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-400">
                  {prompt.content}
                </p>
              </Card>
            ))}
          </section>
        ) : (
          <EmptyState
            icon={<BookOpen className="mx-auto size-8 text-emerald-300" />}
            title="No prompts yet"
            description="Save a reusable prompt to standardize AI output across your workspace."
          />
        )}
      </div>
    </main>
  );
}
