'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const preference = useThemeStore((state) => state.preference);
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = preference === 'dark' || (preference === 'system' && systemDark);
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [preference, systemDark]);

  return children;
}
