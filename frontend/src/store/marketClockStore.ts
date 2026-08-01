'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

/** Re-check the venue calendar this often. The clock moves slowly. */
const POLL_MS = 60_000;

interface MarketClockState {
  /** null until the first successful fetch, or when the venue clock is unreachable. */
  isOpen: boolean | null;
  nextOpen: string | null;
  nextClose: string | null;
  /** Set when the clock could not be read at all, so the UI can say so. */
  error: string | null;

  refresh: () => Promise<void>;
  start: () => () => void;
}

export const useMarketClockStore = create<MarketClockState>((set) => ({
  isOpen: null,
  nextOpen: null,
  nextClose: null,
  error: null,

  refresh: async () => {
    try {
      const clock = await api.marketClock();
      set({
        isOpen: clock.is_open ?? null,
        nextOpen: clock.next_open ?? null,
        nextClose: clock.next_close ?? null,
        error: null,
      });
    } catch (err) {
      set({
        isOpen: null,
        error: err instanceof Error ? err.message : 'Market clock unavailable',
      });
    }
  },

  start: () => {
    const tick = () => void useMarketClockStore.getState().refresh();
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  },
}));
