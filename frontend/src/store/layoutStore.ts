'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { clamp } from '@/lib/format';

export type BottomTabId =
  | 'analysis'
  | 'coach'
  | 'editor'
  | 'logs'
  | 'portfolio'
  | 'positions'
  | 'strategy';
export type DockedPanel = 'watchlist' | 'right' | 'bottom';
export type Theme = 'dark' | 'light';

export const BOTTOM_TABS: Array<{ id: BottomTabId; label: string; shortcut: string }> = [
  { id: 'analysis', label: 'Analysis', shortcut: 'Alt+1' },
  { id: 'coach', label: 'Coach', shortcut: 'Alt+2' },
  { id: 'editor', label: 'Python Editor', shortcut: 'Alt+3' },
  { id: 'logs', label: 'Logs', shortcut: 'Alt+4' },
  { id: 'portfolio', label: 'Portfolio', shortcut: 'Alt+5' },
  { id: 'positions', label: 'Positions', shortcut: 'Alt+6' },
  { id: 'strategy', label: 'Strategy Output', shortcut: 'Alt+7' },
];

/** Chart column occupies 65% of the viewport by default. */
export const DEFAULT_RIGHT_WIDTH = 340;
export const DEFAULT_SIDEBAR_WIDTH = 260;
export const DEFAULT_BOTTOM_HEIGHT = 280;

interface LayoutState {
  theme: Theme;
  sidebarOpen: boolean;
  sidebarWidth: number;
  rightOpen: boolean;
  rightWidth: number;
  /** Vertical split of the right column between order book and time & sales (0-1). */
  rightSplit: number;
  bottomOpen: boolean;
  bottomHeight: number;
  bottomTab: BottomTabId;
  /** When set, that panel fills the workspace. */
  maximized: DockedPanel | 'chart' | null;
  commandOpen: boolean;

  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleDock: (panel: DockedPanel) => void;
  setSidebarWidth: (width: number) => void;
  setRightWidth: (width: number) => void;
  setRightSplit: (split: number) => void;
  setBottomHeight: (height: number) => void;
  setBottomTab: (tab: BottomTabId) => void;
  toggleMaximized: (panel: DockedPanel | 'chart') => void;
  setCommandOpen: (open: boolean) => void;
  resetLayout: () => void;
}

const defaults = {
  theme: 'dark' as Theme,
  sidebarOpen: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  rightOpen: true,
  rightWidth: DEFAULT_RIGHT_WIDTH,
  rightSplit: 0.55,
  bottomOpen: true,
  bottomHeight: DEFAULT_BOTTOM_HEIGHT,
  bottomTab: 'analysis' as BottomTabId,
  maximized: null,
  commandOpen: false,
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      ...defaults,

      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),

      toggleDock: (panel) =>
        set((s) => {
          if (panel === 'watchlist') return { sidebarOpen: !s.sidebarOpen };
          if (panel === 'right') return { rightOpen: !s.rightOpen };
          return { bottomOpen: !s.bottomOpen };
        }),

      setSidebarWidth: (width) => set({ sidebarWidth: clamp(width, 200, 460) }),
      setRightWidth: (width) => set({ rightWidth: clamp(width, 260, 620) }),
      setRightSplit: (split) => set({ rightSplit: clamp(split, 0.2, 0.85) }),
      setBottomHeight: (height) => set({ bottomHeight: clamp(height, 140, 720) }),
      setBottomTab: (tab) => set({ bottomTab: tab, bottomOpen: true }),

      toggleMaximized: (panel) => set((s) => ({ maximized: s.maximized === panel ? null : panel })),
      setCommandOpen: (open) => set({ commandOpen: open }),

      resetLayout: () => set({ ...defaults }),
    }),
    {
      name: 'te.layout',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ commandOpen: _commandOpen, maximized: _maximized, ...rest }) => rest,
    },
  ),
);
