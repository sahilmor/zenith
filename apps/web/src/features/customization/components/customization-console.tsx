'use client';

import { SlidersHorizontal } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useCreateCustomField,
  useCreateTaskType,
  useCreateTemplate,
  useCustomFields,
  useForms,
  useTaskTypes,
  useTemplates,
  useWorkflows,
} from '@/features/customization/api/customization-hooks';

export function CustomizationConsole({ workspaceId }: { readonly workspaceId: string | null }) {
  const fields = useCustomFields(workspaceId);
  const taskTypes = useTaskTypes(workspaceId);
  const workflows = useWorkflows(workspaceId);
  const forms = useForms(workspaceId);
  const templates = useTemplates(workspaceId);

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <div className="space-y-4">
        <CreateFieldPanel workspaceId={workspaceId} />
        <CreateTaskTypePanel workspaceId={workspaceId} />
        <CreateTemplatePanel workspaceId={workspaceId} />
      </div>
      <div className="space-y-4">
        <SummaryGrid
          counts={{
            Fields: fields.data?.length ?? 0,
            'Task types': taskTypes.data?.length ?? 0,
            Workflows: workflows.data?.length ?? 0,
            Forms: forms.data?.length ?? 0,
            Templates: templates.data?.length ?? 0,
          }}
        />
        <ResourceList
          title="Custom fields"
          loading={fields.isLoading}
          error={fields.isError}
          items={(fields.data ?? []).map((field) => ({
            id: field.id,
            title: field.name,
            meta: `${field.key} · ${field.fieldType}`,
          }))}
          empty="Create a field to start collecting workflow-specific data."
        />
        <ResourceList
          title="Task types"
          loading={taskTypes.isLoading}
          error={taskTypes.isError}
          items={(taskTypes.data ?? []).map((taskType) => ({
            id: taskType.id,
            title: taskType.name,
            meta: `${taskType.key} · ${taskType.category}`,
          }))}
          empty="Create task types like Bug, Incident, or Request."
        />
        <ResourceList
          title="Workflows"
          loading={workflows.isLoading}
          error={workflows.isError}
          items={(workflows.data ?? []).map((workflow) => ({
            id: workflow.id,
            title: workflow.name,
            meta: `${workflow.states.length} states · ${workflow.transitions.length} transitions`,
          }))}
          empty="Create workflows through the API to enforce state transitions."
        />
        <ResourceList
          title="Forms and templates"
          loading={forms.isLoading || templates.isLoading}
          error={forms.isError || templates.isError}
          items={[
            ...(forms.data ?? []).map((form) => ({
              id: form.id,
              title: form.name,
              meta: `${form.visibility} form · /forms/${form.slug}`,
            })),
            ...(templates.data ?? []).map((template) => ({
              id: template.id,
              title: template.name,
              meta: `${template.templateType} template · v${template.version}`,
            })),
          ]}
          empty="Forms and templates will appear here once configured."
        />
      </div>
    </div>
  );
}

function CreateFieldPanel({ workspaceId }: { readonly workspaceId: string | null }) {
  const createField = useCreateCustomField(workspaceId);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [fieldType, setFieldType] = useState('short_text');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createField.mutate(
      {
        name: name.trim(),
        key: key.trim(),
        fieldType: fieldType as never,
        required,
        searchable: ['short_text', 'long_text', 'email'].includes(fieldType),
        sortable: ['number', 'date', 'datetime'].includes(fieldType),
        groupable: ['single_select', 'boolean', 'checkbox'].includes(fieldType),
        analyticsEnabled: ['single_select', 'number', 'integer', 'currency'].includes(fieldType),
        options: options
          .split(',')
          .map((option) => option.trim())
          .filter(Boolean)
          .map((label, index) => ({
            id: label
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
            label,
            color: null,
            description: null,
            order: index,
            archived: false,
          })),
      },
      {
        onSuccess: () => {
          setName('');
          setKey('');
          setOptions('');
          setRequired(false);
        },
      },
    );
  }

  return (
    <Card className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={submit}>
        <h2 className="font-semibold text-white">Create field</h2>
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input label="Key" value={key} onChange={(event) => setKey(event.target.value)} required />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Type</span>
          <select
            value={fieldType}
            onChange={(event) => setFieldType(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value="short_text">Short text</option>
            <option value="long_text">Long text</option>
            <option value="number">Number</option>
            <option value="single_select">Single select</option>
            <option value="multi_select">Multi select</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
          </select>
        </label>
        {fieldType.includes('select') ? (
          <Input
            label="Options"
            placeholder="Critical, High, Medium, Low"
            value={options}
            onChange={(event) => setOptions(event.target.value)}
          />
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          Required
        </label>
        <Button disabled={!workspaceId || name.trim().length === 0 || key.trim().length === 0}>
          Create field
        </Button>
      </form>
    </Card>
  );
}

function CreateTaskTypePanel({ workspaceId }: { readonly workspaceId: string | null }) {
  const createTaskType = useCreateTaskType(workspaceId);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTaskType.mutate(
      { name, key, category: 'custom', color: '#38bdf8' },
      {
        onSuccess: () => {
          setName('');
          setKey('');
        },
      },
    );
  }
  return (
    <Card className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={submit}>
        <h2 className="font-semibold text-white">Create task type</h2>
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="Key"
          value={key}
          onChange={(event) => setKey(event.target.value.toUpperCase())}
          required
        />
        <Button disabled={!workspaceId || name.trim().length === 0 || key.trim().length < 2}>
          Create task type
        </Button>
      </form>
    </Card>
  );
}

function CreateTemplatePanel({ workspaceId }: { readonly workspaceId: string | null }) {
  const createTemplate = useCreateTemplate(workspaceId);
  const [name, setName] = useState('');
  const [templateType, setTemplateType] = useState('task');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTemplate.mutate(
      { name, templateType: templateType as never, config: {} },
      { onSuccess: () => setName('') },
    );
  }
  return (
    <Card className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={submit}>
        <h2 className="font-semibold text-white">Create template</h2>
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Template type</span>
          <select
            value={templateType}
            onChange={(event) => setTemplateType(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value="task">Task</option>
            <option value="project">Project</option>
            <option value="board">Board</option>
            <option value="form">Form</option>
            <option value="workflow">Workflow</option>
          </select>
        </label>
        <Button disabled={!workspaceId || name.trim().length === 0}>Create template</Button>
      </form>
    </Card>
  );
}

function SummaryGrid({ counts }: { readonly counts: Record<string, number> }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {Object.entries(counts).map(([label, value]) => (
        <Card key={label} className="rounded-lg p-4">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </Card>
      ))}
    </section>
  );
}

function ResourceList({
  title,
  loading,
  error,
  items,
  empty,
}: {
  readonly title: string;
  readonly loading: boolean;
  readonly error: boolean;
  readonly items: { id: string; title: string; meta: string }[];
  readonly empty: string;
}) {
  if (loading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (error)
    return (
      <ErrorState title={`Unable to load ${title.toLowerCase()}`} description="Please refresh." />
    );
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<SlidersHorizontal className="mx-auto size-8 text-emerald-300" />}
        title={title}
        description={empty}
      />
    );
  }
  return (
    <Card className="rounded-lg p-5">
      <h2 className="font-semibold text-white">{title}</h2>
      <div className="mt-4 divide-y divide-white/10">
        {items.map((item) => (
          <div key={item.id} className="py-3 first:pt-0 last:pb-0">
            <p className="font-medium text-white">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
