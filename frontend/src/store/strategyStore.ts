'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { log } from './logStore';
import type { BacktestResult, BacktestRun } from '@/types';

export const STARTER_STRATEGY = `# Strategy runs against historical bars of the selected symbol.
# The backtest engine calls on_bar() once per candle.

FAST, SLOW = 10, 30

def on_bar(ctx):
    closes = ctx.history("close", SLOW)
    if len(closes) < SLOW:
        return

    fast = sum(closes[-FAST:]) / FAST
    slow = sum(closes) / SLOW

    if fast > slow and ctx.position == 0:
        ctx.buy(size=10)
        ctx.log(f"golden cross @ {ctx.price:.2f}")
    elif fast < slow and ctx.position > 0:
        ctx.sell(size=ctx.position)
        ctx.log(f"death cross @ {ctx.price:.2f}")
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
