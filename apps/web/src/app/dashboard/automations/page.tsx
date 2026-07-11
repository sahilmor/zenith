'use client';

import type { AutomationActionType, AutomationTriggerType } from '@pm/types';
import { FlaskConical, Plus, Workflow } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAutomations, useCreateAutomation, useTestAutomation } from '@/features/ai/api/ai-hooks';
import { useWorkspaceStore } from '@/stores/workspace-store';

const triggers: AutomationTriggerType[] = [
  'task_created',
  'task_updated',
  'task_moved',
  'task_assigned',
  'task_completed',
  'comment_added',
  'attachment_uploaded',
];
const actions: AutomationActionType[] = [
  'send_notification',
  'change_status',
  'change_priority',
  'create_comment',
  'call_ai',
  'webhook',
  'email',
];

export default function AutomationsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const automations = useAutomations(workspaceId);
  const createAutomation = useCreateAutomation();
  const testAutomation = useTestAutomation();
  const [name, setName] = useState('Notify when task is completed');
  const [trigger, setTrigger] = useState<AutomationTriggerType>('task_completed');
  const [action, setAction] = useState<AutomationActionType>('send_notification');

  const save = () => {
    if (!workspaceId) return;
    createAutomation.mutate({
      workspaceId,
      name,
      description: 'Created from the visual automation builder',
      enabled: true,
      trigger,
      conditions: [],
      actions: [{ type: action, params: { message: `${name} ran` } }],
    });
  };

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Automations"
          title="Workflow engine"
          description="Create reusable rules with triggers, conditions, actions, and AI-powered automation steps."
          actions={
            <Button onClick={save} disabled={!workspaceId || !name.trim()}>
              <Plus className="size-4" />
              Save rule
            </Button>
          }
        />
        <Card className="rounded-lg p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <Field label="Rule name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="When">
              <select
                value={trigger}
                onChange={(event) => setTrigger(event.target.value as AutomationTriggerType)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                {triggers.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Then">
              <select
                value={action}
                onChange={(event) => setAction(event.target.value as AutomationActionType)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                {actions.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="button" variant="secondary" onClick={save}>
              <Workflow className="size-4" />
              Create
            </Button>
          </div>
        </Card>
        {automations.isLoading ? (
          <Card className="rounded-lg p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-4 h-28 w-full" />
          </Card>
        ) : automations.data?.length ? (
          <section className="grid gap-4 md:grid-cols-2">
            {automations.data.map((rule) => (
              <Card key={rule.id} className="rounded-lg p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{rule.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      When {rule.trigger.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-400">
                  {rule.actions.map((item, index) => (
                    <p key={`${rule.id}-${index}`}>Then {item.type.replaceAll('_', ' ')}</p>
                  ))}
                </div>
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => testAutomation.mutate(rule.id)}
                >
                  <FlaskConical className="size-4" />
                  Test
                </Button>
              </Card>
            ))}
          </section>
        ) : (
          <EmptyState
            icon={<Workflow className="mx-auto size-8 text-emerald-300" />}
            title="No automations yet"
            description="Create your first workflow rule from the builder above."
          />
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-400">
      <span>{label}</span>
      {children}
    </label>
  );
}
