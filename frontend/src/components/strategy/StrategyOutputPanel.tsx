'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { money, num, pct } from '@/lib/format';
import { useStrategyStore } from '@/store/strategyStore';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded border border-line bg-surface-2 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-faint">{label}</p>
      <p
        className={`tabular text-sm font-semibold ${
          tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-fg'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** Inline equity sparkline — avoids pulling a chart library into the dock. */
function EquityCurve({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - ((value - min) / span) * 100;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const up = points[points.length - 1] >= points[0];

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full">
      <motion.path
        d={path}
        fill="none"
        stroke={up ? 'var(--up)' : 'var(--down)'}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </svg>
  );
}

export function StrategyOutputPanel() {
  const { result, output, running, history, run, loadHistory } = useStrategyStore();

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const equity = (result?.equity_curve ?? [])
    .map((point) => (typeof point === 'number' ? point : num(point?.value)))
    .filter((value) => Number.isFinite(value) && value !== 0);

  return (
    <div className="flex h-full gap-3 overflow-auto p-3">
      <div className="min-w-0 flex-1">
        {result ? (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
              <Stat
                label="Return"
                value={pct(result.total_return_percent)}
                tone={num(result.total_return_percent) >= 0 ? 'up' : 'down'}
              />
              <Stat label="Net P&L" value={money(result.total_return)} tone={num(result.total_return) >= 0 ? 'up' : 'down'} />
              <Stat label="Trades" value={String(result.total_trades)} />
              <Stat label="Win rate" value={`${num(result.win_rate).toFixed(1)}%`} />
              <Stat label="Sharpe" value={num(result.sharpe_ratio).toFixed(2)} />
              <Stat label="Max DD" value={pct(result.max_drawdown_percent)} tone="down" />
            </div>
            <div className="mt-3 rounded border border-line bg-surface-2 p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-faint">Equity curve</p>
              <EquityCurve points={equity} />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-[11px] text-faint">
            {running
              ? 'Running backtest…'
              : 'Run a strategy from the Python Editor tab to see performance here.'}
          </div>
        )}
      </div>

      <div className="flex w-72 shrink-0 flex-col gap-2">
        <div className="rounded border border-line bg-surface-2 p-2">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-faint">Console</p>
          <div className="tabular max-h-32 overflow-auto text-[11px] leading-relaxed text-dim">
            {output.length === 0 ? (
              <span className="text-faint">no output</span>
            ) : (
              output.map((line, index) => <div key={`${index}-${line.slice(0, 12)}`}>{line}</div>)
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 rounded border border-line bg-surface-2 p-2">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-faint">Recent runs</p>
          <ul className="max-h-40 overflow-auto text-[11px]">
            {history.slice(0, 12).map((entry) => (
              <li
                key={entry.id}
                className={`flex justify-between border-b border-line/40 py-1 ${
                  run?.id === entry.id ? 'text-fg' : 'text-dim'
                }`}
              >
                <span className="truncate">{entry.name}</span>
                <span
                  className={
                    entry.status === 'COMPLETED'
                      ? 'text-up'
                      : entry.status === 'FAILED'
                        ? 'text-down'
                        : 'text-warn'
                  }
                >
                  {entry.status}
                </span>
              </li>
            ))}
            {history.length === 0 && <li className="py-2 text-faint">no runs yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
