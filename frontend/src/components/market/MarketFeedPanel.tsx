'use client';

import { Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { OrderBookPanel } from './OrderBookPanel';
import { TimeAndSales } from './TimeAndSales';
import { useLayoutStore, type RightTabId } from '@/store/layoutStore';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';

const TABS: Array<{ id: RightTabId; label: string }> = [
  { id: 'orderbook', label: 'Order Book' },
  { id: 'tape', label: 'Trades' },
];

/** Depth and tape share one pane: they answer the same question at one glance. */
export function MarketFeedPanel() {
  const symbol = useSymbolStore((s) => s.symbol);
  const { rightTab, setRightTab, maximized, toggleMaximized } = useLayoutStore();
  const clearTape = useMarketStore((s) => s.clearTape);
  const isMaximized = maximized === 'right';

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex h-8 shrink-0 items-center gap-0.5 border-b border-line px-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setRightTab(tab.id)}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              rightTab === tab.id ? 'bg-surface-2 text-fg' : 'text-faint hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-1 truncate text-[10px] text-faint">{symbol}</span>

        <div className="flex-1" />

        {rightTab === 'tape' && (
          <button
            type="button"
            onClick={clearTape}
            aria-label="Clear tape"
            className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-fg"
          >
            <Trash2 size={12} />
          </button>
        )}
        <button
          type="button"
          onClick={() => toggleMaximized('right')}
          aria-label={isMaximized ? 'Restore market column' : 'Maximize market column'}
          className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-fg"
        >
          {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {rightTab === 'orderbook' ? <OrderBookPanel embedded /> : <TimeAndSales embedded />}
      </div>
    </section>
  );
}
