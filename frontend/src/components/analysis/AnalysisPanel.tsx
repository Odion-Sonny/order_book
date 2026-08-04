'use client';

import { useMemo } from 'react';
import { buildContext, rsiLabel, trendLabel, trendStack, type RangeStat } from '@/lib/analysis';
import { compact, pct, price as fmtPrice, num } from '@/lib/format';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';

const value = (v: number | null, digits = 2): string =>
  v === null ? '—' : fmtPrice(v, digits);

function Card({
  label,
  value: shown,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'up' | 'down';
}) {
  return (
    <div className="rounded border border-line bg-surface-2 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-faint">{label}</p>
      <p
        className={`tabular text-sm font-semibold ${
          tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-fg'
        }`}
      >
        {shown}
      </p>
      {hint && <p className="truncate text-[10px] text-faint">{hint}</p>}
    </div>
  );
}

function StackRow({ label, bullish }: { label: string; bullish: boolean | null }) {
  return (
    <div className="flex items-center justify-between border-b border-line/50 py-1 last:border-0">
      <span className="text-[11px] text-dim">{label}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
          bullish === null
            ? 'bg-surface-3 text-faint'
            : bullish
              ? 'bg-up/15 text-up'
              : 'bg-down/15 text-down'
        }`}
      >
        {bullish === null ? 'n/a' : bullish ? 'bull' : 'bear'}
      </span>
    </div>
  );
}

function RangeBar({ label, range }: { label: string; range: RangeStat }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-faint">
        <span>{label}</span>
        <span className="tabular">
          {fmtPrice(range.low)} — {fmtPrice(range.high)}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-3">
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface"
          style={{ left: `${range.position * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Indicator dashboard for the bars the chart has loaded. Values the window is
 * too short to support render as `—` rather than a made-up number.
 */
export function AnalysisPanel() {
  const symbol = useSymbolStore((s) => s.symbol);
  const series = useMarketStore((s) => s.series);
  const quote = useMarketStore((s) => s.snapshots[symbol]);

  const ctx = useMemo(
    () =>
      series && series.symbol === symbol
        ? buildContext(series.candles, series.symbol, series.timeframe)
        : null,
    [series, symbol],
  );

  if (!ctx) {
    return (
      <div className="flex h-full items-center justify-center text-center text-[11px] text-faint">
        Waiting for chart data on {symbol}…
      </div>
    );
  }

  const s = ctx.snapshot;
  const rsiTone = s.rsi === null ? undefined : s.rsi >= 70 ? 'down' : s.rsi <= 30 ? 'up' : undefined;

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-fg">{ctx.symbol}</span>
        <span className="tabular text-sm text-fg">{value(s.price)}</span>
        {quote && (
          <span
            className={`tabular text-[11px] ${
              num(quote.price_change_percent) >= 0 ? 'text-up' : 'text-down'
            }`}
          >
            {pct(quote.price_change_percent)}
          </span>
        )}
        <span className="text-[10px] text-faint">
          {ctx.bars} {ctx.timeframe} bars · {trendLabel(s)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <Card
          label="RSI (14)"
          value={s.rsi === null ? '—' : s.rsi.toFixed(1)}
          hint={s.rsi === null ? 'needs 15 bars' : rsiLabel(s.rsi)}
          tone={rsiTone}
        />
        <Card
          label="MACD"
          value={value(s.macd, 3)}
          hint={`sig ${value(s.macdSignal, 3)} · hist ${value(s.macdHist, 3)}`}
          tone={s.macdHist === null ? undefined : s.macdHist >= 0 ? 'up' : 'down'}
        />
        <Card label="SMA 20" value={value(s.sma20)} hint="short trend" />
        <Card label="SMA 50" value={value(s.sma50)} hint="medium trend" />
        <Card label="SMA 200" value={value(s.sma200)} hint="regime filter" />
        <Card label="ATR (14)" value={value(s.atr)} hint="stop distance unit" />
        <Card label="VWAP" value={value(s.vwap)} hint="window fair value" />
        <Card label="BB upper" value={value(s.bbUpper)} hint="+2σ" />
        <Card label="BB lower" value={value(s.bbLower)} hint="−2σ" />
        <Card
          label="BB position"
          value={s.bbPosition === null ? '—' : `${(s.bbPosition * 100).toFixed(0)}%`}
          hint="0% lower · 100% upper"
        />
        <Card
          label="Bar volume"
          value={compact(ctx.volume.last)}
          hint={`${ctx.volume.ratio.toFixed(2)}× window avg`}
          tone={ctx.volume.ratio >= 1 ? 'up' : undefined}
        />
        <Card
          label="Spread"
          value={
            quote && num(quote.ask_price) > 0 && num(quote.bid_price) > 0
              ? fmtPrice(num(quote.ask_price) - num(quote.bid_price))
              : '—'
          }
          hint={
            quote && num(quote.bid_price) > 0
              ? `${fmtPrice(quote.bid_price)} / ${fmtPrice(quote.ask_price)}`
              : 'no quote'
          }
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded border border-line bg-surface-2 p-2.5">
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
            Trend stack
          </h3>
          {trendStack(s).map((row) => (
            <StackRow key={row.label} label={row.label} bullish={row.bullish} />
          ))}
        </div>

        <div className="rounded border border-line bg-surface-2 p-2.5">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-faint">
            Ranges
          </h3>
          {ctx.session && <RangeBar label="Session" range={ctx.session} />}
          <div className={ctx.session ? 'mt-3' : ''}>
            <RangeBar label={`Loaded window (${ctx.bars} bars)`} range={ctx.window} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-faint">Last 5 bars up</p>
              <p className="tabular text-up">{ctx.recent.up}</p>
            </div>
            <div>
              <p className="text-faint">Last 5 bars down</p>
              <p className="tabular text-down">{ctx.recent.down}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
