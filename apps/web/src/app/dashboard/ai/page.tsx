'use client';

import { Bot, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAiStore } from '@/stores/ai-store';

const features = [
  'Generate tasks from natural language',
  'Break tasks into subtasks',
  'Summarize tasks, projects, and workspaces',
  'Draft meeting notes and release notes',
  'Suggest priority, labels, due dates, and assignees',
  'Translate and rewrite comments or descriptions',
  'Find duplicate and related tasks',
  'Search work with natural language',
];

export default function AiPage() {
  const setOpen = useAiStore((state) => state.setSidebarOpen);
  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="AI Copilot"
          title="Ask Zenith AI"
          description="Use a provider-agnostic copilot that respects workspace permissions and builds answers from authorized project context."
          actions={
            <Button onClick={() => setOpen(true)}>
              <Bot className="size-4" />
              Open copilot
            </Button>
          }
        />
        <section className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature} className="rounded-lg p-5">
              <Sparkles className="size-5 text-emerald-300" />
              <p className="mt-3 text-sm font-medium text-white">{feature}</p>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
