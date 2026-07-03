'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeToggle() {
  const { preference, setPreference } = useThemeStore();
  const isDark = preference !== 'light';
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
