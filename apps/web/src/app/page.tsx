import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  MousePointer2,
  Network,
  PanelsTopLeft,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Zenith | Enterprise Work Management',
  description:
    'Zenith brings projects, tasks, documents, CRM, analytics, AI, automations, and customer success into one enterprise workspace.',
};

const featureGroups = [
  {
    title: 'Plan and execute',
    description: 'Run projects from strategy to day-to-day execution without losing context.',
    icon: LayoutDashboard,
    items: [
      'Workspaces and RBAC',
      'Projects, boards, columns',
      'Tasks, subtasks, priorities',
      'Kanban, calendar, table, timeline',
    ],
  },
  {
    title: 'Collaborate deeply',
    description: 'Keep decisions, files, comments, mentions, and activity attached to real work.',
    icon: MessageSquareText,
    items: [
      'Comments and replies',
      'Attachments and previews',
      'Activity history',
      'Realtime collaboration',
    ],
  },
  {
    title: 'Knowledge platform',
    description:
      'Build a workspace memory with documents, spaces, templates, search, and AI retrieval.',
    icon: FileText,
    items: [
      'Docs and wikis',
      'Spaces and page hierarchy',
      'Backlinks and templates',
      'Universal search',
    ],
  },
  {
    title: 'Revenue and customers',
    description:
      'Manage accounts, leads, deals, onboarding, and customer health beside delivery work.',
    icon: BriefcaseBusiness,
    items: [
      'CRM accounts and contacts',
      'Leads and pipeline',
      'Customer health',
      'Sales activity tracking',
    ],
  },
  {
    title: 'Automation and AI',
    description: 'Use provider-agnostic AI and workflow rules to reduce operational drag.',
    icon: Bot,
    items: ['AI Copilot', 'Prompt library', 'Workflow automations', 'Smart recommendations'],
  },
  {
    title: 'Enterprise operations',
    description:
      'Security, billing, auditability, analytics, and deployment foundations for scale.',
    icon: ShieldCheck,
    items: [
      'Billing and entitlements',
      'Audit logs',
      'Analytics and reports',
      'Production deployment',
    ],
  },
] as const;

const stats = [
  { label: 'Workspace modules', value: '20+' },
  { label: 'Realtime events', value: 'Live' },
  { label: 'Views for tasks', value: '5' },
  { label: 'Access model', value: 'RBAC' },
] as const;

const productPillars = [
  { label: 'Projects', icon: PanelsTopLeft },
  { label: 'Tasks', icon: CheckCircle2 },
  { label: 'Docs', icon: FileText },
  { label: 'CRM', icon: Building2 },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'AI', icon: Sparkles },
] as const;

const workflowRows = [
  { label: 'API Launch', stage: 'In Progress', owner: 'Engineering', tone: 'bg-cyan-400' },
  { label: 'Enterprise onboarding', stage: 'Review', owner: 'Success', tone: 'bg-emerald-400' },
  { label: 'Renewal risk plan', stage: 'Today', owner: 'CRM', tone: 'bg-amber-300' },
] as const;

const previewNavItems: readonly { label: string; icon: LucideIcon }[] = [
  { label: 'Projects', icon: PanelsTopLeft },
  { label: 'Documents', icon: FileText },
  { label: 'CRM', icon: BriefcaseBusiness },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'AI Copilot', icon: Bot },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-bg)]/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Zenith home">
            <span className="flex size-9 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)]">
              <Zap className="size-4 text-emerald-300" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Zenith</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-[var(--app-muted)] md:flex">
            <a href="#platform" className="transition hover:text-[var(--app-text)]">
              Platform
            </a>
            <a href="#features" className="transition hover:text-[var(--app-text)]">
              Features
            </a>
            <a href="#security" className="transition hover:text-[var(--app-text)]">
              Security
            </a>
            <Link href="/pricing" className="transition hover:text-[var(--app-text)]">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Sign up
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:py-20">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 py-2 text-xs font-medium text-[var(--app-muted)]">
            <Sparkles className="size-4 text-emerald-300" />
            Work, knowledge, customers, and AI in one operating system
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-[var(--app-text)] md:text-6xl lg:text-7xl">
              Run your whole company from one workspace.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--app-muted)] md:text-lg">
              Zenith brings project management, documents, CRM, customer success, analytics,
              realtime collaboration, billing, automations, and AI Copilot into a clean enterprise
              platform.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">Sign in to workspace</Link>
            </Button>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-4"
              >
                <dt className="text-xs text-[var(--app-muted)]">{stat.label}</dt>
                <dd className="mt-2 text-xl font-semibold text-[var(--app-text)]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ProductPreview />
      </section>

      <section
        id="platform"
        className="border-y border-[var(--app-border)] bg-[var(--app-panel-soft)]"
      >
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-6 md:px-8">
          {productPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.label}
                className="flex items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-4"
              >
                <Icon className="size-5 text-emerald-300" />
                <span className="text-sm font-medium">{pillar.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Everything connected
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            A serious platform without the enterprise clutter.
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--app-muted)]">
            Every module shares the same workspace model, permissions, notifications, search,
            activity history, and theme system.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureGroups.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="rounded-lg p-5">
                <div className="mb-5 flex size-10 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)]">
                  <Icon className="size-5 text-emerald-300" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                  {feature.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {feature.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-[var(--app-muted)]"
                    >
                      <CheckCircle2 className="size-4 text-emerald-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        id="security"
        className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 md:grid-cols-3 md:px-8"
      >
        <InfoPanel
          icon={<LockKeyhole className="size-5 text-emerald-300" />}
          title="Permission-first"
          description="Workspace membership, RBAC, entitlements, and backend authorization protect every resource boundary."
        />
        <InfoPanel
          icon={<Search className="size-5 text-emerald-300" />}
          title="Universal discovery"
          description="Search tasks, projects, documents, CRM records, dashboards, templates, and activity with permission-aware results."
        />
        <InfoPanel
          icon={<Workflow className="size-5 text-emerald-300" />}
          title="Automation-ready"
          description="Rules, notifications, realtime events, audit logs, and AI workflows are designed to work together."
        />
      </section>

      <section className="border-t border-[var(--app-border)] bg-[var(--app-panel-soft)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 md:flex-row md:items-center md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Ready when you are
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Build your Zenith workspace.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
              Create an account, invite your team, and start connecting work across delivery,
              knowledge, customers, reporting, and automation.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Create account</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="relative">
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-3 shadow-2xl shadow-black/20">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-rose-400" />
            <span className="size-3 rounded-full bg-amber-300" />
            <span className="size-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 py-1.5 text-xs text-[var(--app-muted)]">
            <MousePointer2 className="size-3.5" />
            Live workspace
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                <Building2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Acme Workspace</p>
                <p className="text-xs text-[var(--app-muted)]">Business plan</p>
              </div>
            </div>
            <div className="space-y-2">
              {previewNavItems.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-muted)]"
                >
                  <Icon className="size-4 text-emerald-300" />
                  {label}
                </div>
              ))}
            </div>
          </aside>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <PreviewMetric
                label="Pipeline"
                value="$164k"
                icon={<BarChart3 className="size-4" />}
              />
              <PreviewMetric
                label="Tasks due"
                value="18"
                icon={<CalendarDays className="size-4" />}
              />
              <PreviewMetric
                label="Docs indexed"
                value="342"
                icon={<Network className="size-4" />}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {['Todo', 'In Progress', 'Done'].map((column, index) => (
                <div
                  key={column}
                  className="min-h-64 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3"
                >
                  <div className="mb-3 flex items-center justify-between text-xs text-[var(--app-muted)]">
                    <span>{column}</span>
                    <span>{index + 2}</span>
                  </div>
                  <div className="space-y-3">
                    {workflowRows.slice(0, index + 1).map((row) => (
                      <div
                        key={`${column}-${row.label}`}
                        className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-3"
                      >
                        <div className={`mb-3 h-1.5 w-12 rounded-full ${row.tone}`} />
                        <p className="text-sm font-medium">{row.label}</p>
                        <div className="mt-3 flex items-center justify-between text-xs text-[var(--app-muted)]">
                          <span>{row.owner}</span>
                          <span>{row.stage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-4">
      <div className="flex items-center justify-between text-[var(--app-muted)]">
        <span className="text-xs">{label}</span>
        <span className="text-emerald-300">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  description,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <Card className="rounded-lg p-5">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{description}</p>
    </Card>
  );
}
