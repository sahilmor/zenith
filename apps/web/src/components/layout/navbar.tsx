'use client';

import { Bot, LogOut, Menu } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { apiRequest } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useAiStore } from '@/stores/ai-store';
import { useSidebarStore } from '@/stores/sidebar-store';
import { ThemeToggle } from './theme-toggle';

export function Navbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const toggleAi = useAiStore((state) => state.toggleSidebar);
  const toggleMobile = useSidebarStore((state) => state.toggleMobile);
  const logout = useMutation({
    mutationKey: ['sign-out'],
    meta: {
      loadingTitle: 'Signing out',
      successTitle: 'Signed out',
      errorTitle: 'Sign out failed',
    },
    mutationFn: () => apiRequest<unknown>('/api/auth/logout', { method: 'POST' }),
    onSettled: () => {
      clearSession();
      router.replace('/login');
    },
  });
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-panel)]/85 px-4 py-3 text-[var(--app-text)] backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleMobile}
        >
          <Menu className="size-5" />
        </Button>
        <div className="hidden md:block lg:hidden">
          <WorkspaceSwitcher />
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <Button type="button" variant="secondary" onClick={toggleAi} className="shrink-0">
            <Bot className="size-4" />
            <span className="hidden sm:inline">AI</span>
          </Button>
          <NotificationBell />
          <ThemeToggle />
          <Dropdown trigger={<Avatar name={user?.name} src={user?.avatar} />}>
            <div className="min-w-0 px-3 py-2">
              <p className="max-w-56 truncate text-sm font-medium text-[var(--app-text)]">
                {user?.name ?? 'User'}
              </p>
              <p className="max-w-56 truncate text-xs text-[var(--app-muted)]">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--app-muted)] hover:bg-[var(--app-panel-soft)] hover:text-[var(--app-text)]"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
