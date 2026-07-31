'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { IndicatorId } from '@/lib/indicators';
import type { Timeframe } from '@/types';

export type ChartType = 'candles' | 'line' | 'area' | 'bars';

export const TIMEFRAMES: Timeframe[] = ['1Min', '5Min', '15Min', '1Hour', '4Hour', '1Day', '1Week'];

/** Deep-history presets — the "backlog" jumps, up to 5 years. */
export const HISTORY_RANGES = [
  { id: '1D', label: '1D', timeframe: '5Min' as Timeframe, limit: 78 },
  { id: '5D', label: '5D', timeframe: '15Min' as Timeframe, limit: 130 },
  { id: '1M', label: '1M', timeframe: '1Hour' as Timeframe, limit: 160 },
  { id: '6M', label: '6M', timeframe: '1Day' as Timeframe, limit: 130 },
  { id: '1Y', label: '1Y', timeframe: '1Day' as Timeframe, limit: 260 },
  { id: '5Y', label: '5Y', timeframe: '1Week' as Timeframe, limit: 260 },
] as const;

export type HistoryRangeId = (typeof HISTORY_RANGES)[number]['id'];

interface SymbolState {
  symbol: string;
  timeframe: Timeframe;
  range: HistoryRangeId;
  chartType: ChartType;
  indicators: IndicatorId[];
  favorites: string[];
  recent: string[];

  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setRange: (range: HistoryRangeId) => void;
  setChartType: (chartType: ChartType) => void;
  toggleIndicator: (indicator: IndicatorId) => void;
  toggleFavorite: (symbol: string) => void;
}

export const useSymbolStore = create<SymbolState>()(
  persist(
    (set) => ({
      symbol: 'AAPL',
      timeframe: '1Day',
      range: '6M',
      chartType: 'candles',
      indicators: ['sma20'],
      favorites: ['AAPL', 'TSLA'],
      recent: [],

      setSymbol: (symbol) =>
        set((s) => ({
          symbol,
          recent: [symbol, ...s.recent.filter((r) => r !== symbol)].slice(0, 8),
        })),

      setTimeframe: (timeframe) => set({ timeframe }),

      setRange: (range) => {
        const preset = HISTORY_RANGES.find((r) => r.id === range);
        set({ range, ...(preset ? { timeframe: preset.timeframe } : {}) });
      },

      setChartType: (chartType) => set({ chartType }),

      toggleIndicator: (indicator) =>
        set((s) => ({
          indicators: s.indicators.includes(indicator)
            ? s.indicators.filter((i) => i !== indicator)
            : [...s.indicators, indicator],
        })),

      toggleFavorite: (symbol) =>
        set((s) => ({
          favorites: s.favorites.includes(symbol)
            ? s.favorites.filter((f) => f !== symbol)
            : [...s.favorites, symbol],
        })),
    }),
    { name: 'te.symbol', storage: createJSONStorage(() => localStorage) },
  ),
);

export const currentRange = (id: HistoryRangeId) =>
  HISTORY_RANGES.find((r) => r.id === id) ?? HISTORY_RANGES[3];
