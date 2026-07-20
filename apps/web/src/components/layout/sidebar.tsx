'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Building2,
  ChartNoAxesCombined,
  Bot,
  Code2,
  CreditCard,
  FileText,
  FolderKanban,
  GanttChart,
  LayoutDashboard,
  NotebookTabs,
  Map,
  Milestone,
  SlidersHorizontal,
  Workflow,
  Settings,
  Table2,
  Target,
  UserCheck,
  UsersRound,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';

const navGroups = [
  {
    label: 'Operate',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
      { label: 'Documents', href: '/dashboard/documents', icon: FileText },
      { label: 'DevOps', href: '/dashboard/devops', icon: Code2 },
      { label: 'CRM', href: '/dashboard/crm', icon: Building2 },
      { label: 'Resources', href: '/dashboard/resources', icon: UsersRound },
    ],
  },
  {
    label: 'Tasks',
    items: [
      { label: 'My Tasks', href: '/dashboard/tasks/my', icon: UserCheck },
      { label: 'Calendar', href: '/dashboard/tasks/calendar', icon: CalendarDays },
      { label: 'Table', href: '/dashboard/tasks/table', icon: Table2 },
      { label: 'Timeline', href: '/dashboard/tasks/timeline', icon: GanttChart },
    ],
  },
  {
    label: 'Strategy',
    items: [
      { label: 'Goals', href: '/dashboard/goals', icon: Target },
      { label: 'Initiatives', href: '/dashboard/initiatives', icon: Milestone },
      { label: 'Portfolios', href: '/dashboard/portfolios', icon: NotebookTabs },
      { label: 'Roadmap', href: '/dashboard/roadmap', icon: Map },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Insights', href: '/dashboard/insights', icon: ChartNoAxesCombined },
      { label: 'Analytics', href: '/dashboard/analytics', icon: ChartNoAxesCombined },
      { label: 'Reports', href: '/dashboard/reports', icon: NotebookTabs },
      { label: 'AI Copilot', href: '/dashboard/ai', icon: Bot },
      { label: 'Automations', href: '/dashboard/automations', icon: Workflow },
      { label: 'Prompts', href: '/dashboard/prompts', icon: NotebookTabs },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Customization', href: '/dashboard/customization', icon: SlidersHorizontal },
      { label: 'Members', href: '/dashboard/workspace/members', icon: Users },
      { label: 'Billing', href: '/dashboard/workspace/billing', icon: CreditCard },
      { label: 'Settings', href: '/dashboard/workspace/settings', icon: Settings },
    ],
  },
] as const;

function SidebarContent() {
  const pathname = usePathname();
  const closeMobile = useSidebarStore((state) => state.closeMobile);
  return (
    <aside className="flex h-full min-w-0 flex-col bg-[var(--app-panel)] p-4 text-[var(--app-text)]">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--app-accent),var(--app-accent-2))] text-sm font-bold text-slate-950 shadow-lg shadow-[var(--app-glow)]">
            Z
          </span>
          <span className="truncate font-semibold">Zenith</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={closeMobile}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="mb-5">
        <WorkspaceSwitcher />
      </div>
      <nav className="app-scrollbar -mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--app-subtle)]">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMobile}
                  className={cn(
                    'group flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--app-muted)] transition hover:bg-[var(--app-panel-soft)] hover:text-[var(--app-text)]',
                    active &&
                      'bg-[linear-gradient(135deg,color-mix(in_srgb,var(--app-accent)_17%,transparent),color-mix(in_srgb,var(--app-accent-2)_10%,transparent))] text-[var(--app-text)] shadow-sm shadow-[var(--app-glow)]',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0 text-[var(--app-subtle)] transition group-hover:text-[var(--app-accent)]',
                      active && 'text-[var(--app-accent)]',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="mt-4 rounded-lg border border-[var(--app-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--app-accent)_12%,transparent),color-mix(in_srgb,var(--app-accent-3)_8%,transparent))] p-4">
        <p className="text-sm font-medium">Workspace ready</p>
        <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
          Manage organization settings, access, and invitations from this shell.
        </p>
      </div>
    </aside>
  );
}

export function Sidebar() {
  const isMobileOpen = useSidebarStore((state) => state.isMobileOpen);
  const closeMobile = useSidebarStore((state) => state.closeMobile);
  return (
    <>
      <div className="hidden h-screen w-72 shrink-0 border-r border-[var(--app-border)] lg:block">
        <SidebarContent />
      </div>
      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close sidebar"
            className="absolute inset-0 bg-black/70"
            onClick={closeMobile}
          />
          <div className="relative h-full w-80 max-w-[85vw] border-r border-[var(--app-border)]">
            <SidebarContent />
          </div>
        </div>
      ) : null}
    </>
  );
}
