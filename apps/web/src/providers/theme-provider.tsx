'use client';

import { useEffect, type ReactNode } from 'react';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const preference = useThemeStore((state) => state.preference);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = preference === 'dark' || (preference === 'system' && systemDark);
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [preference]);

  return children;
}
