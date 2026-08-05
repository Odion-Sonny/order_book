'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  ChevronDown,
  FlaskConical,
  GripHorizontal,
  Maximize2,
  Minimize2,
  ScrollText,
} from 'lucide-react';
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel';
import { CoachPanel } from '@/components/analysis/CoachPanel';
import { BacktestPanel } from '@/components/strategy/BacktestPanel';
import { LogsPanel } from '@/components/strategy/LogsPanel';
import { BOTTOM_TABS, useLayoutStore, type BottomTabId } from '@/store/layoutStore';
import { useLogStore } from '@/store/logStore';

const PANELS: Record<BottomTabId, () => React.ReactElement> = {
  analysis: AnalysisPanel,
  backtest: BacktestPanel,
  coach: CoachPanel,
  logs: LogsPanel,
};

const ICONS: Record<BottomTabId, typeof BarChart3> = {
  analysis: BarChart3,
  backtest: FlaskConical,
  coach: Bot,
  logs: ScrollText,
};

export function BottomDock() {
  const { bottomTab, setBottomTab, toggleDock, maximized, toggleMaximized } = useLayoutStore();
  const logCount = useLogStore((s) => s.logs.length);

  const Active = PANELS[bottomTab];
  const isMaximized = maximized === 'bottom';

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-line bg-surface">
      <header className="flex h-9 shrink-0 items-center gap-0.5 border-b border-line px-1.5">
        <GripHorizontal size={13} className="mr-1 text-faint" aria-hidden />
        {BOTTOM_TABS.map((tab) => {
          const active = tab.id === bottomTab;
          const Icon = ICONS[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBottomTab(tab.id)}
              title={tab.shortcut}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-medium transition-colors ${
                active ? 'bg-surface-2 text-fg' : 'text-faint hover:text-fg'
              }`}
            >
              <Icon size={13} aria-hidden />
              {tab.label}
              {tab.id === 'logs' && logCount > 0 && (
                <span className="rounded bg-surface-3 px-1 text-[9px] text-dim">{logCount}</span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => toggleMaximized('bottom')}
          aria-label={isMaximized ? 'Restore dock' : 'Maximize dock'}
          className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-fg"
        >
          {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <button
          type="button"
          onClick={() => toggleDock('bottom')}
          aria-label="Collapse dock"
          className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <ChevronDown size={13} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <motion.div
          key={bottomTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          <Active />
        </motion.div>
      </div>
    </section>
  );
}
