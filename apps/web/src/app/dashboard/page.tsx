import { CalendarDays, FolderKanban, Inbox, LayoutDashboard, Users } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const foundations = [
  {
    title: 'Authentication',
    description: 'Login, signup, refresh, logout, and persisted sessions are wired to the backend.',
  },
  {
    title: 'Protected shell',
    description: 'Authenticated users land here; unauthenticated visitors are sent to login.',
  },
  {
    title: 'Reusable UI',
    description:
      'Buttons, inputs, cards, states, headers, dropdowns, dialogs, and loaders are ready.',
  },
];

const navPreview = [
  { label: 'Projects', icon: FolderKanban },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Team', icon: Users },
  { label: 'Inbox', icon: Inbox },
];

export default function DashboardPage() {
  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Home</span>
          <span>/</span>
          <span className="text-slate-300">Dashboard</span>
        </div>
        <PageHeader
          eyebrow="Dashboard"
          title="Frontend foundation"
          description="A responsive authenticated application shell with navigation placeholders for future project management modules."
          actions={<Button variant="secondary">Notification placeholder</Button>}
        />
        <section className="grid gap-4 md:grid-cols-3">
          {foundations.map((item) => (
            <Card key={item.title} className="p-5">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
            </Card>
          ))}
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="p-6">
            <SectionHeader
              title="Workspace preview"
              description="Product data is intentionally excluded from this phase."
            />
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="mt-2 h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <SectionHeader
              title="Navigation placeholders"
              description="Routes are visible for planning only."
            />
            <div className="mt-5 grid gap-3">
              {navPreview.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300"
                  >
                    <Icon className="size-4 text-indigo-300" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
        <EmptyState
          icon={<LayoutDashboard className="mx-auto size-8 text-indigo-300" />}
          title="Domain modules are not implemented yet"
          description="Workspaces, projects, boards, tasks, notifications, analytics, and calendar features are reserved for later phases."
        />
      </div>
    </main>
  );
}
