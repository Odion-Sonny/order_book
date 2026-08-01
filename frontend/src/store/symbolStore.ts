'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { IndicatorId } from '@/lib/indicators';
import type { Timeframe } from '@/types';

export type ChartType = 'candles' | 'line' | 'area' | 'bars';

/** A regular US session is 6.5 hours, so a daily bar is worth 390 minutes. */
const SESSION_MINUTES = 390;

/**
 * Bar resolution. `minutes` is how much market time one bar covers, which is
 * what makes range -> bar-count arithmetic work across intraday and daily.
 */
export const INTERVALS = [
  { id: '1Min', label: '1m', minutes: 1 },
  { id: '5Min', label: '5m', minutes: 5 },
  { id: '15Min', label: '15m', minutes: 15 },
  { id: '1Hour', label: '1H', minutes: 60 },
  { id: '4Hour', label: '4H', minutes: 240 },
  { id: '1Day', label: '1D', minutes: SESSION_MINUTES },
  { id: '1Week', label: '1W', minutes: SESSION_MINUTES * 5 },
] as const satisfies ReadonlyArray<{ id: Timeframe; label: string; minutes: number }>;

/** Kept as a plain id list: the keyboard shortcuts index into it by slot. */
export const TIMEFRAMES: Timeframe[] = INTERVALS.map((i) => i.id);

/**
 * How much history to load, in market minutes: 21 trading days a month, 252 a
 * year. Each range only offers resolutions that produce a sane bar count —
 * 1-minute bars over 5 years would be half a million bars.
 */
export const RANGES = [
  {
    id: '1D',
    label: '1D',
    minutes: SESSION_MINUTES,
    intervals: ['1Min', '5Min', '15Min', '1Hour'],
    defaultInterval: '5Min',
  },
  {
    id: '5D',
    label: '5D',
    minutes: SESSION_MINUTES * 5,
    intervals: ['5Min', '15Min', '1Hour', '4Hour'],
    defaultInterval: '15Min',
  },
  {
    id: '1M',
    label: '1M',
    minutes: SESSION_MINUTES * 21,
    intervals: ['15Min', '1Hour', '4Hour', '1Day'],
    defaultInterval: '1Hour',
  },
  {
    id: '6M',
    label: '6M',
    minutes: SESSION_MINUTES * 126,
    intervals: ['1Hour', '4Hour', '1Day', '1Week'],
    defaultInterval: '1Day',
  },
  {
    id: '1Y',
    label: '1Y',
    minutes: SESSION_MINUTES * 252,
    intervals: ['4Hour', '1Day', '1Week'],
    defaultInterval: '1Day',
  },
  {
    id: '5Y',
    label: '5Y',
    minutes: SESSION_MINUTES * 252 * 5,
    intervals: ['1Day', '1Week'],
    defaultInterval: '1Week',
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  minutes: number;
  intervals: readonly Timeframe[];
  defaultInterval: Timeframe;
}>;

export type HistoryRangeId = (typeof RANGES)[number]['id'];

export const rangeById = (id: HistoryRangeId) => RANGES.find((r) => r.id === id) ?? RANGES[3];

export const intervalById = (id: Timeframe) =>
  INTERVALS.find((i) => i.id === id) ?? INTERVALS[5];

/** Whether a resolution produces a usable chart over a range. */
export const isValidPair = (range: HistoryRangeId, timeframe: Timeframe) =>
  (rangeById(range).intervals as readonly Timeframe[]).includes(timeframe);

/** Upper bound on bars per request, so a wide range can't stall the browser. */
const MAX_BARS = 5000;

/** Bars needed to cover `range` at `timeframe`. Replaces hand-tuned limits. */
export const barsFor = (range: HistoryRangeId, timeframe: Timeframe) =>
  Math.min(MAX_BARS, Math.max(2, Math.ceil(rangeById(range).minutes / intervalById(timeframe).minutes)));

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

      /*
       * Range and resolution are one setting in two controls, so each side
       * repairs the other instead of silently leaving an impossible pair (the
       * old code let "5Y" sit next to "1m" and then fetched neither).
       */
      setTimeframe: (timeframe) =>
        set((s) => ({
          timeframe,
          range: isValidPair(s.range, timeframe)
            ? s.range
            : (RANGES.find((r) => (r.intervals as readonly Timeframe[]).includes(timeframe))?.id ??
              s.range),
        })),

      setRange: (range) =>
        set((s) => ({
          range,
          timeframe: isValidPair(range, s.timeframe) ? s.timeframe : rangeById(range).defaultInterval,
        })),

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
    {
      name: 'te.symbol',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      /** A persisted v1 pair can be invalid under the new rules; repair on load. */
      migrate: (state) => {
        const s = state as SymbolState;
        if (s && !isValidPair(s.range, s.timeframe)) {
          s.timeframe = rangeById(s.range).defaultInterval;
        }
        return s;
      },
    },
  ),
);
