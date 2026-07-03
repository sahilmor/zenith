'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'dark' | 'light' | 'system';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist((set) => ({ preference: 'dark', setPreference: (preference) => set({ preference }) }), {
    name: 'pm-theme',
  }),
);
