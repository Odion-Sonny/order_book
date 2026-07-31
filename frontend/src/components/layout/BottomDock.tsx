'use client';

import { motion } from 'framer-motion';
import { ChevronDown, GripHorizontal, Maximize2, Minimize2 } from 'lucide-react';
import { LogsPanel } from '@/components/strategy/LogsPanel';
import { PythonEditorPanel } from '@/components/strategy/PythonEditorPanel';
import { StrategyOutputPanel } from '@/components/strategy/StrategyOutputPanel';
import { PortfolioPanel } from '@/components/trading/PortfolioPanel';
import { PositionsPanel } from '@/components/trading/PositionsPanel';
import { BOTTOM_TABS, useLayoutStore, type BottomTabId } from '@/store/layoutStore';
import { useLogStore } from '@/store/logStore';

const PANELS: Record<BottomTabId, () => React.ReactElement> = {
  editor: PythonEditorPanel,
  logs: LogsPanel,
  portfolio: PortfolioPanel,
  positions: PositionsPanel,
  strategy: StrategyOutputPanel,
};

export function BottomDock() {
  const { bottomTab, setBottomTab, toggleDock, maximized, toggleMaximized } = useLayoutStore();
  const logCount = useLogStore((s) => s.logs.length);

  const Active = PANELS[bottomTab];
  const isMaximized = maximized === 'bottom';

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-line bg-surface">
      <header className="flex h-8 shrink-0 items-center gap-0.5 border-b border-line px-1.5">
        <GripHorizontal size={13} className="mr-1 text-faint" aria-hidden />
        {BOTTOM_TABS.map((tab) => {
          const active = tab.id === bottomTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBottomTab(tab.id)}
              title={tab.shortcut}
              className={`relative rounded px-2.5 py-1 text-[11px] transition-colors ${
                active ? 'text-fg' : 'text-faint hover:text-dim'
              }`}
            >
              {tab.label}
              {tab.id === 'logs' && logCount > 0 && (
                <span className="ml-1 rounded bg-surface-3 px-1 text-[9px] text-dim">
                  {logCount}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="bottom-tab-underline"
                  className="absolute inset-x-1 -bottom-[5px] h-0.5 rounded bg-accent"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
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
