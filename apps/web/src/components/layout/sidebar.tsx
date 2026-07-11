'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ChartNoAxesCombined,
  Bot,
  CreditCard,
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
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Insights', href: '/dashboard/insights', icon: ChartNoAxesCombined },
  { label: 'Analytics', href: '/dashboard/analytics', icon: ChartNoAxesCombined },
  { label: 'Reports', href: '/dashboard/reports', icon: NotebookTabs },
  { label: 'AI Copilot', href: '/dashboard/ai', icon: Bot },
  { label: 'Automations', href: '/dashboard/automations', icon: Workflow },
  { label: 'Prompts', href: '/dashboard/prompts', icon: NotebookTabs },
  { label: 'Goals', href: '/dashboard/goals', icon: Target },
  { label: 'Initiatives', href: '/dashboard/initiatives', icon: Milestone },
  { label: 'Portfolios', href: '/dashboard/portfolios', icon: NotebookTabs },
  { label: 'Roadmap', href: '/dashboard/roadmap', icon: Map },
  { label: 'Customization', href: '/dashboard/customization', icon: SlidersHorizontal },
  { label: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
  { label: 'My Tasks', href: '/dashboard/tasks/my', icon: UserCheck },
  { label: 'Calendar', href: '/dashboard/tasks/calendar', icon: CalendarDays },
  { label: 'Table', href: '/dashboard/tasks/table', icon: Table2 },
  { label: 'Timeline', href: '/dashboard/tasks/timeline', icon: GanttChart },
  { label: 'Members', href: '/dashboard/workspace/members', icon: Users },
  { label: 'Billing', href: '/dashboard/workspace/billing', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/workspace/settings', icon: Settings },
];

function SidebarContent() {
  const pathname = usePathname();
  const closeMobile = useSidebarStore((state) => state.closeMobile);
  return (
    <aside className="flex h-full flex-col bg-[var(--app-panel)] p-4 text-[var(--app-text)]">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-white text-sm font-bold text-slate-950">
            Z
          </span>
          <span className="font-semibold">Zenith</span>
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
      <nav className="space-y-1">
        {navItems.map((item) => {
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
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white',
                active && 'bg-white/10 text-[var(--app-text)]',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm font-medium">Workspace ready</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
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
