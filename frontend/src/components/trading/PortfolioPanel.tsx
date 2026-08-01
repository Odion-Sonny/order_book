'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { OrderTicket } from './OrderTicket';
import { money, num, pct } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { useTradingStore } from '@/store/tradingStore';

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded border border-line bg-surface-2 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-faint">{label}</p>
      <p
        className={`tabular mt-0.5 text-base font-semibold ${
          tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-fg'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function PortfolioPanel() {
  const { portfolio, positions, orders, loading, refresh } = useTradingStore();
  const authenticated = useAuthStore((s) => s.authenticated);
  const setModalOpen = useAuthStore((s) => s.setModalOpen);

  // Re-fetch when auth flips, so signing in fills the panel immediately.
  useEffect(() => {
    void refresh();
  }, [refresh, authenticated]);

  const marketValue = positions.reduce(
    (sum, p) => sum + num(p.quantity) * num(p.current_price),
    0,
  );
  const costBasis = positions.reduce((sum, p) => sum + num(p.quantity) * num(p.average_cost), 0);
  const unrealised = marketValue - costBasis;
  const cash = num(portfolio?.cash_balance);
  const equity = cash + marketValue;
  const openOrders = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="flex h-full gap-3 overflow-auto p-3">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Account
          </h3>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Refresh portfolio"
            className="rounded p-1 text-faint hover:bg-surface-3 hover:text-fg"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          {!authenticated && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded bg-accent px-2 py-0.5 text-[11px] font-semibold text-white"
            >
              Sign in to load your portfolio
            </button>
          )}
          {authenticated && !portfolio && !loading && (
            <span className="text-[11px] text-warn">No portfolio for this account</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric label="Equity" value={money(equity)} />
          <Metric label="Cash" value={money(cash)} />
          <Metric label="Market value" value={money(marketValue)} />
          <Metric
            label="Unrealised P&L"
            value={`${money(unrealised)} (${pct(costBasis ? (unrealised / costBasis) * 100 : 0)})`}
            tone={unrealised >= 0 ? 'up' : 'down'}
          />
          <Metric label="Buying power" value={money(portfolio?.buying_power ?? cash)} />
          <Metric label="Open positions" value={String(positions.length)} />
          <Metric label="Working orders" value={String(openOrders)} />
          <Metric label="Fills today" value={String(orders.filter((o) => o.status === 'FILLED').length)} />
        </div>
      </div>

      <OrderTicket />
    </div>
  );
}
