'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { clamp } from '@/lib/format';

export type BottomTabId = 'analysis' | 'backtest' | 'coach' | 'logs';
export type RightTabId = 'orderbook' | 'tape';
export type TradeTabId = 'ticket' | 'positions' | 'account';
export type DockedPanel = 'watchlist' | 'right' | 'bottom';
export type Theme = 'dark' | 'light';

export const BOTTOM_TABS: Array<{ id: BottomTabId; label: string; shortcut: string }> = [
  { id: 'analysis', label: 'Analysis', shortcut: 'Alt+1' },
  { id: 'backtest', label: 'Backtest', shortcut: 'Alt+2' },
  { id: 'coach', label: 'AI Coach', shortcut: 'Alt+3' },
  { id: 'logs', label: 'Logs', shortcut: 'Alt+4' },
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
  /** Which feed the top of the market column shows. */
  rightTab: RightTabId;
  /** Which view the trade panel under it shows. */
  tradeTab: TradeTabId;
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
  setRightTab: (tab: RightTabId) => void;
  setTradeTab: (tab: TradeTabId) => void;
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
  rightTab: 'orderbook' as RightTabId,
  tradeTab: 'ticket' as TradeTabId,
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
      setRightTab: (tab) => set({ rightTab: tab }),
      setTradeTab: (tab) => set({ tradeTab: tab }),

      toggleMaximized: (panel) => set((s) => ({ maximized: s.maximized === panel ? null : panel })),
      setCommandOpen: (open) => set({ commandOpen: open }),

      resetLayout: () => set({ ...defaults }),
    }),
    {
      name: 'te.layout',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      /**
       * v1 had a tab per panel (editor, portfolio, positions, strategy). Those
       * moved into the Backtest split view and the market column, so a stored
       * id can now name a panel that no longer exists.
       */
      migrate: (state) => {
        const s = state as LayoutState;
        if (s && !BOTTOM_TABS.some((tab) => tab.id === s.bottomTab)) {
          s.bottomTab = defaults.bottomTab;
        }
        return s;
      },
      partialize: ({ commandOpen: _commandOpen, maximized: _maximized, ...rest }) => rest,
    },
  ),
);
