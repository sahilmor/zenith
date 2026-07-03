'use client';

import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { apiRequest } from '@/lib/api/client';
import { useToast } from '@/providers/toast-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useSidebarStore } from '@/stores/sidebar-store';
import { ThemeToggle } from './theme-toggle';

export function Navbar() {
  const router = useRouter();
  const { notify } = useToast();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const toggleMobile = useSidebarStore((state) => state.toggleMobile);
  const logout = useMutation({
    mutationFn: () => apiRequest<unknown>('/api/auth/logout', { method: 'POST' }),
    onSettled: () => {
      clearSession();
      notify({ title: 'Signed out', variant: 'info' });
      router.replace('/login');
    },
  });
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 px-4 py-3 text-white backdrop-blur">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleMobile}
        >
          <Menu className="size-5" />
        </Button>
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-500 md:flex md:w-80">
          <Search className="size-4" />
          Search is coming soon
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <ThemeToggle />
          <Dropdown trigger={<Avatar name={user?.name} src={user?.avatar} />}>
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white">{user?.name ?? 'User'}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"
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
