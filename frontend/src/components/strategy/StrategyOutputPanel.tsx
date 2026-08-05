'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { money, num, pct, price } from '@/lib/format';
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

  // The engine writes `{date, equity}`; tolerate the older `value` shape too.
  const equity = (result?.equity_curve ?? [])
    .map((point) => (typeof point === 'number' ? point : num(point?.equity ?? point?.value)))
    .filter((value) => Number.isFinite(value) && value !== 0);

  const fills = result?.trades_data ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="text-[11px] font-semibold text-faint">Results</span>
        {run && (
          <span className="truncate text-[10px] text-faint">
            run #{run.id} · {run.name}
          </span>
        )}
        {running && <span className="animate-pulse text-[10px] text-warn">running…</span>}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3">
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

            <div className="mt-3 rounded border border-line bg-surface-2 p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-faint">
                Fills ({fills.length})
              </p>
              <div className="max-h-40 overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-surface-2 text-faint">
                    <tr>
                      <th className="px-1.5 py-1 text-left font-medium">Time</th>
                      <th className="px-1.5 py-1 text-left font-medium">Symbol</th>
                      <th className="px-1.5 py-1 text-left font-medium">Side</th>
                      <th className="px-1.5 py-1 text-right font-medium">Qty</th>
                      <th className="px-1.5 py-1 text-right font-medium">Price</th>
                      <th className="px-1.5 py-1 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fills
                      .slice()
                      .reverse()
                      .slice(0, 100)
                      .map((fill, index) => (
                        <tr key={`${fill.timestamp}-${index}`} className="border-t border-line/40">
                          <td className="tabular px-1.5 py-1 text-dim">
                            {fill.timestamp ? String(fill.timestamp).slice(0, 10) : '—'}
                          </td>
                          <td className="px-1.5 py-1 text-dim">{fill.symbol ?? '—'}</td>
                          <td
                            className={`px-1.5 py-1 font-medium ${
                              fill.side === 'SELL' ? 'text-down' : 'text-up'
                            }`}
                          >
                            {fill.side ?? '—'}
                          </td>
                          <td className="tabular px-1.5 py-1 text-right text-dim">
                            {num(fill.quantity)}
                          </td>
                          <td className="tabular px-1.5 py-1 text-right text-dim">
                            {price(fill.price)}
                          </td>
                          <td className="tabular px-1.5 py-1 text-right text-dim">
                            {money(fill.value)}
                          </td>
                        </tr>
                      ))}
                    {fills.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-2 text-center text-faint">
                          strategy placed no orders
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-24 items-center justify-center text-center text-[11px] text-faint">
            {running ? 'Running backtest…' : 'Run the strategy on the left to see performance here.'}
          </div>
        )}

        <div className="mt-3 grid gap-2 md:grid-cols-2">
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

          <div className="rounded border border-line bg-surface-2 p-2">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-faint">Recent runs</p>
            <ul className="max-h-32 overflow-auto text-[11px]">
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
    </div>
  );
}
