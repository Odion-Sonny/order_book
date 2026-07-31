'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  CandlestickChart,
  Keyboard,
  LineChart,
  LogIn,
  Moon,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Search,
  Sun,
  TrendingUp,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { INDICATOR_LABELS, type IndicatorId } from '@/lib/indicators';
import { pct, price } from '@/lib/format';
import { useLayoutStore } from '@/store/layoutStore';
import { useMarketStore } from '@/store/marketStore';
import { HISTORY_RANGES, TIMEFRAMES, useSymbolStore, type ChartType } from '@/store/symbolStore';
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useAuthStore } from '@/store/authStore';
import type { StreamStatus } from '@/lib/ws';

const CHART_TYPES: Array<{ id: ChartType; icon: typeof LineChart; label: string }> = [
  { id: 'candles', icon: CandlestickChart, label: 'Candles' },
  { id: 'bars', icon: BarChart3, label: 'Bars' },
  { id: 'line', icon: LineChart, label: 'Line' },
  { id: 'area', icon: TrendingUp, label: 'Area' },
];

const STATUS_COLOR: Record<StreamStatus, string> = {
  open: 'bg-up',
  connecting: 'bg-warn',
  closed: 'bg-down',
};

function IconToggle({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`rounded p-1.5 transition-colors ${
        active ? 'bg-surface-3 text-fg' : 'text-faint hover:bg-surface-2 hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}

export function TopBar({ streamStatus }: { streamStatus: StreamStatus }) {
  const layout = useLayoutStore();
  const {
    symbol,
    timeframe,
    range,
    chartType,
    indicators,
    setTimeframe,
    setRange,
    setChartType,
    toggleIndicator,
  } = useSymbolStore();
  const snapshot = useMarketStore((s) => s.snapshots[symbol]);
  const livePrice = useMarketStore((s) => s.lastPrice[symbol]);
  const { authenticated, username, logout, setModalOpen } = useAuthStore();

  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const last = livePrice ?? snapshot?.current_price ?? 0;
  const change = snapshot?.price_change ?? 0;
  const changePercent = snapshot?.price_change_percent ?? 0;
  const up = changePercent >= 0;

  return (
    <header className="relative z-30 flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface px-2">
      <div className="flex items-center gap-2 pr-2">
        <Activity size={17} className="text-accent" />
        <span className="hidden text-sm font-semibold tracking-tight sm:block">Terminal</span>
      </div>

      <button
        type="button"
        onClick={() => layout.setCommandOpen(true)}
        className="flex items-center gap-2 rounded border border-line bg-surface-2 px-2.5 py-1.5 transition-colors hover:border-line-strong"
      >
        <Search size={13} className="text-faint" />
        <span className="text-sm font-bold">{symbol}</span>
        <kbd className="hidden rounded border border-line px-1 text-[10px] text-faint md:inline">
          Ctrl K
        </kbd>
      </button>

      <motion.div
        key={`${symbol}-${last}`}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="ml-1 flex items-baseline gap-2 px-1"
      >
        <span className="tabular text-sm font-semibold">{price(last)}</span>
        <span className={`tabular text-xs ${up ? 'text-up' : 'text-down'}`}>
          {change >= 0 ? '+' : ''}
          {price(change)} {pct(changePercent)}
        </span>
      </motion.div>

      <div className="mx-2 h-5 w-px bg-line" />

      <div className="flex items-center gap-0.5">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setTimeframe(tf)}
            className={`rounded px-1.5 py-1 text-[11px] font-medium transition-colors ${
              timeframe === tf ? 'bg-accent text-white' : 'text-dim hover:bg-surface-2 hover:text-fg'
            }`}
          >
            {tf.replace('Min', 'm').replace('Hour', 'H').replace('Day', 'D').replace('Week', 'W')}
          </button>
        ))}
      </div>

      <div className="mx-2 hidden h-5 w-px bg-line lg:block" />

      <div className="hidden items-center gap-0.5 lg:flex">
        {HISTORY_RANGES.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setRange(preset.id)}
            title={`${preset.label} history (${preset.timeframe})`}
            className={`rounded px-1.5 py-1 text-[11px] transition-colors ${
              range === preset.id
                ? 'bg-surface-3 text-fg'
                : 'text-faint hover:bg-surface-2 hover:text-fg'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mx-2 h-5 w-px bg-line" />

      <div className="flex items-center gap-0.5">
        {CHART_TYPES.map(({ id, icon: Icon, label }) => (
          <IconToggle
            key={id}
            label={label}
            active={chartType === id}
            onClick={() => setChartType(id)}
          >
            <Icon size={15} />
          </IconToggle>
        ))}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIndicatorsOpen((open) => !open)}
          className="ml-1 rounded px-2 py-1 text-[11px] text-dim transition-colors hover:bg-surface-2 hover:text-fg"
        >
          Indicators{indicators.length > 0 ? ` (${indicators.length})` : ''}
        </button>
        {indicatorsOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIndicatorsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 top-full z-40 mt-1 w-48 rounded border border-line-strong bg-surface p-1 shadow-xl"
            >
              {(Object.keys(INDICATOR_LABELS) as IndicatorId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleIndicator(id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-dim hover:bg-surface-2 hover:text-fg"
                >
                  <span
                    className={`h-3 w-3 rounded-sm border ${
                      indicators.includes(id) ? 'border-accent bg-accent' : 'border-line-strong'
                    }`}
                  />
                  {INDICATOR_LABELS[id]}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </div>

      <div className="flex-1" />

      <div className="mr-1 flex items-center gap-1.5 rounded bg-surface-2 px-2 py-1">
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[streamStatus]}`} />
        <span className="text-[10px] uppercase tracking-wide text-faint">{streamStatus}</span>
      </div>

      <div className="relative">
        <IconToggle label="Keyboard shortcuts" onClick={() => setHelpOpen((open) => !open)}>
          <Keyboard size={15} />
        </IconToggle>
        {helpOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setHelpOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full z-40 mt-1 w-64 rounded border border-line-strong bg-surface p-2 shadow-xl"
            >
              <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-dim">
                Shortcuts
              </p>
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  className="flex items-center justify-between px-1 py-1 text-xs"
                >
                  <span className="text-dim">{shortcut.action}</span>
                  <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </div>

      <IconToggle
        label="Toggle watchlist (Ctrl B)"
        active={layout.sidebarOpen}
        onClick={() => layout.toggleDock('watchlist')}
      >
        <PanelLeft size={15} />
      </IconToggle>
      <IconToggle
        label="Toggle order book (Ctrl I)"
        active={layout.rightOpen}
        onClick={() => layout.toggleDock('right')}
      >
        <PanelRight size={15} />
      </IconToggle>
      <IconToggle
        label="Toggle bottom dock (Ctrl J)"
        active={layout.bottomOpen}
        onClick={() => layout.toggleDock('bottom')}
      >
        <PanelBottom size={15} />
      </IconToggle>
      <IconToggle label="Toggle theme (Ctrl Shift L)" onClick={layout.toggleTheme}>
        {layout.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </IconToggle>

      {authenticated ? (
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          className="ml-1 flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[11px] text-dim transition-colors hover:text-fg"
        >
          <User size={12} />
          {username}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ml-1 flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-white"
        >
          <LogIn size={12} /> Sign in
        </button>
      )}
    </header>
  );
}
