'use client';

import { OrderTicket } from './OrderTicket';
import { PortfolioPanel } from './PortfolioPanel';
import { PositionsPanel } from './PositionsPanel';
import { money, num } from '@/lib/format';
import { useLayoutStore, type TradeTabId } from '@/store/layoutStore';
import { useTradingStore } from '@/store/tradingStore';

const TABS: Array<{ id: TradeTabId; label: string }> = [
  { id: 'ticket', label: 'Trade' },
  { id: 'positions', label: 'Positions' },
  { id: 'account', label: 'Account' },
];

/** Order entry and the account it draws on, directly under the depth ladder. */
export function TradePanel() {
  const { tradeTab, setTradeTab } = useLayoutStore();
  const portfolio = useTradingStore((s) => s.portfolio);

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex h-8 shrink-0 items-center gap-0.5 border-b border-line px-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTradeTab(tab.id)}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tradeTab === tab.id ? 'bg-surface-2 text-fg' : 'text-faint hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        {portfolio && (
          <span className="tabular truncate pr-1 text-[10px] text-faint">
            {money(num(portfolio.cash_balance), 0)}
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {tradeTab === 'ticket' && (
          <div className="p-2">
            <OrderTicket />
          </div>
        )}
        {tradeTab === 'positions' && <PositionsPanel />}
        {tradeTab === 'account' && <PortfolioPanel showTicket={false} />}
      </div>
    </section>
  );
}
