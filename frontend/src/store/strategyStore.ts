'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { log } from './logStore';
import type { BacktestResult, BacktestRun } from '@/types';

/**
 * Must define `on_data` — the engine checks for that exact name and silently
 * falls back to a built-in MA crossover if it is missing.
 *
 * Signature (order_book/services/backtesting_engine.py):
 *   on_data(data, cash, positions, buy, sell)
 *     data      pandas DataFrame up to the current bar, columns:
 *               timestamp, symbol, open, high, low, close, volume
 *     cash      float, uninvested cash
 *     positions dict {symbol: quantity}
 *     buy/sell  callables (symbol, quantity)
 *
 * Runs under RestrictedPython: `pd`, `len`, `int` and `float` are available,
 * imports and file access are not.
 */
export const STARTER_STRATEGY = `# Moving-average crossover.
# Called once per bar with history up to that point.

FAST, SLOW = 10, 30
SYMBOL = "AAPL"

def on_data(data, cash, positions, buy, sell):
    bars = data[data['symbol'] == SYMBOL]
    if len(bars) < SLOW:
        return

    closes = bars['close']
    fast = float(closes.tail(FAST).mean())
    slow = float(closes.tail(SLOW).mean())
    price = float(closes.iloc[-1])
    held = positions.get(SYMBOL, 0)

    if fast > slow and held == 0 and cash > price * 10:
        buy(SYMBOL, 10)
    elif fast < slow and held > 0:
        sell(SYMBOL, held)
`;

interface StrategyState {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  running: boolean;
  run: BacktestRun | null;
  result: BacktestResult | null;
  output: string[];
  history: BacktestRun[];

  setCode: (code: string) => void;
  setName: (name: string) => void;
  setDates: (startDate: string, endDate: string) => void;
  setInitialCapital: (capital: number) => void;
  appendOutput: (line: string) => void;
  clearOutput: () => void;
  loadHistory: () => Promise<void>;
  runBacktest: () => Promise<void>;
}

const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

export const useStrategyStore = create<StrategyState>()(
  persist(
    (set, get) => ({
      code: STARTER_STRATEGY,
      name: 'MA Crossover',
      startDate: isoDaysAgo(365),
      endDate: isoDaysAgo(1),
      initialCapital: 100_000,
      running: false,
      run: null,
      result: null,
      output: [],
      history: [],

      setCode: (code) => set({ code }),
      setName: (name) => set({ name }),
      setDates: (startDate, endDate) => set({ startDate, endDate }),
      setInitialCapital: (initialCapital) => set({ initialCapital }),
      appendOutput: (line) => set((s) => ({ output: [...s.output.slice(-400), line] })),
      clearOutput: () => set({ output: [] }),

      loadHistory: async () => {
        const history = await api.backtests().catch(() => []);
        set({ history });
      },

      runBacktest: async () => {
        const { code, name, startDate, endDate, initialCapital, appendOutput } = get();
        set({ running: true, result: null, output: [] });
        appendOutput(`[${new Date().toLocaleTimeString()}] creating backtest "${name}"...`);

        try {
          const run = await api.createBacktest({
            name,
            strategy_code: code,
            start_date: startDate,
            end_date: endDate,
            initial_capital: initialCapital,
          });
          set({ run });
          appendOutput(`run #${run.id} created — executing ${startDate} to ${endDate}`);

          await api.runBacktest(run.id);
          const result = await api.backtestResults(run.id);

          set({ result, running: false });
          appendOutput(
            `completed: ${result.total_trades} trades, ` +
              `return ${Number(result.total_return_percent).toFixed(2)}%, ` +
              `win rate ${Number(result.win_rate).toFixed(1)}%`,
          );
          log('success', 'backtest', `${name} finished (run #${run.id})`);
          void get().loadHistory();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Backtest failed';
          appendOutput(`error: ${message}`);
          log('error', 'backtest', message);
          set({ running: false });
        }
      },
    }),
    {
      name: 'te.strategy',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ code, name, startDate, endDate, initialCapital }) => ({
        code,
        name,
        startDate,
        endDate,
        initialCapital,
      }),
    },
  ),
);
