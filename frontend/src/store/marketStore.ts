'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';
import { log } from './logStore';
import type { Candle, MarketSnapshot, OrderBookData } from '@/types';

export interface TapePrint {
  id: string;
  ticker: string;
  price: number;
  size: number;
  ts: number;
  side: 'buy' | 'sell';
}

const MAX_TAPE = 200;

/**
 * The bars the chart currently holds, republished so the analysis and coach
 * panels read the same window the user is looking at instead of refetching it.
 */
export interface ChartSeries {
  symbol: string;
  timeframe: string;
  candles: Candle[];
}

interface MarketState {
  snapshots: Record<string, MarketSnapshot>;
  orderBook: OrderBookData | null;
  tape: TapePrint[];
  lastPrice: Record<string, number>;
  series: ChartSeries | null;
  loadingSnapshots: boolean;
  error: string | null;

  setSeries: (series: ChartSeries) => void;
  loadSnapshots: () => Promise<void>;
  setOrderBook: (book: OrderBookData) => void;
  addPrint: (print: Omit<TapePrint, 'id' | 'side'> & { side?: TapePrint['side'] }) => void;
  applyBar: (ticker: string, candle: Candle) => void;
  clearTape: () => void;
}

let printSeq = 0;

export const useMarketStore = create<MarketState>((set, get) => ({
  snapshots: {},
  orderBook: null,
  tape: [],
  lastPrice: {},
  series: null,
  loadingSnapshots: false,
  error: null,

  setSeries: (series) => set({ series }),

  loadSnapshots: async () => {
    set({ loadingSnapshots: true, error: null });
    try {
      const data = await api.marketData();
      const snapshots: Record<string, MarketSnapshot> = {};
      const lastPrice: Record<string, number> = { ...get().lastPrice };
      for (const snapshot of data) {
        snapshots[snapshot.ticker] = snapshot;
        if (snapshot.current_price) lastPrice[snapshot.ticker] = snapshot.current_price;
      }
      set({ snapshots, lastPrice, loadingSnapshots: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load market data';
      set({ error: message, loadingSnapshots: false });
      log('error', 'market', message);
    }
  },

  setOrderBook: (book) =>
    set((s) => ({
      orderBook: book,
      lastPrice: book.last_price
        ? { ...s.lastPrice, [book.ticker]: book.last_price }
        : s.lastPrice,
    })),

  addPrint: (print) =>
    set((s) => {
      const prev = s.lastPrice[print.ticker];
      const side: TapePrint['side'] =
        print.side ?? (prev === undefined || print.price >= prev ? 'buy' : 'sell');
      const entry: TapePrint = { id: `p-${++printSeq}`, side, ...print };

      // Keep the watchlist row in step with the tape: recompute the day's move
      // against the snapshot's opening reference rather than waiting for a poll.
      const snapshot = s.snapshots[print.ticker];
      const snapshots = snapshot
        ? {
            ...s.snapshots,
            [print.ticker]: (() => {
              const base = snapshot.current_price - snapshot.price_change;
              const change = base > 0 ? print.price - base : snapshot.price_change;
              return {
                ...snapshot,
                current_price: print.price,
                price_change: change,
                price_change_percent: base > 0 ? (change / base) * 100 : snapshot.price_change_percent,
              };
            })(),
          }
        : s.snapshots;

      return {
        tape: [entry, ...s.tape].slice(0, MAX_TAPE),
        lastPrice: { ...s.lastPrice, [print.ticker]: print.price },
        snapshots,
      };
    }),

  applyBar: (ticker, candle) =>
    set((s) => {
      const snapshot = s.snapshots[ticker];
      return {
        lastPrice: { ...s.lastPrice, [ticker]: candle.close },
        snapshots: snapshot
          ? { ...s.snapshots, [ticker]: { ...snapshot, current_price: candle.close } }
          : s.snapshots,
      };
    }),

  clearTape: () => set({ tape: [] }),
}));
