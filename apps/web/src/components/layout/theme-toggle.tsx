'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeToggle() {
  const { preference, setPreference } = useThemeStore();
  const nextPreference =
    preference === 'dark' ? 'light' : preference === 'light' ? 'system' : 'dark';
  const Icon = preference === 'dark' ? Sun : preference === 'light' ? Laptop : Moon;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setPreference(nextPreference)}
      aria-label={`Switch theme from ${preference} to ${nextPreference}`}
    >
      <Icon className="size-4" />
    </Button>
  );
}
