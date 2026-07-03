'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/client';
import type { AuthPayload } from '@/lib/api/types';
import { useAuthStore } from '@/stores/auth-store';

const publicRoutes = new Set(['/login', '/signup', '/unauthorized']);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, refreshToken, hydrated, setSession, clearSession } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    const isPublic = publicRoutes.has(pathname);
    if (!accessToken && !refreshToken && !isPublic) router.replace('/login');
    if (accessToken && (pathname === '/login' || pathname === '/signup'))
      router.replace('/dashboard');
  }, [accessToken, hydrated, pathname, refreshToken, router]);

  useEffect(() => {
    if (!hydrated || accessToken || !refreshToken) return;
    void apiRequest<AuthPayload>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuthRefresh: true,
    })
      .then(setSession)
      .catch(() => clearSession());
  }, [accessToken, clearSession, hydrated, refreshToken, setSession]);

  return children;
}
