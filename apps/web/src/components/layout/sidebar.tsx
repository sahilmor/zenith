'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Home,
  Inbox,
  LayoutDashboard,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Workspace', href: '/dashboard#workspace', icon: Home },
  { label: 'Projects', href: '/dashboard#projects', icon: FolderKanban },
  { label: 'Boards', href: '/dashboard#boards', icon: CheckSquare },
  { label: 'Calendar', href: '/dashboard#calendar', icon: CalendarDays },
  { label: 'Team', href: '/dashboard#team', icon: Users },
  { label: 'Inbox', href: '/dashboard#inbox', icon: Inbox },
  { label: 'Settings', href: '/dashboard#settings', icon: Settings },
  { label: 'Analytics', href: '/dashboard#analytics', icon: BarChart3 },
];

function SidebarContent() {
  const pathname = usePathname();
  const closeMobile = useSidebarStore((state) => state.closeMobile);
  return (
    <aside className="flex h-full flex-col bg-slate-950 p-4 text-white">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-white text-sm font-bold text-slate-950">
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
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === '/dashboard' && pathname === '/dashboard';
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white',
                active && 'bg-white/10 text-white',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm font-medium">Frontend foundation</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Navigation only. Product modules are intentionally not implemented in this phase.
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
      <div className="hidden h-screen w-72 shrink-0 border-r border-white/10 lg:block">
        <SidebarContent />
      </div>
      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close sidebar"
            className="absolute inset-0 bg-black/70"
            onClick={closeMobile}
          />
          <div className="relative h-full w-80 max-w-[85vw] border-r border-white/10">
            <SidebarContent />
          </div>
        </div>
      ) : null}
    </>
  );
}
