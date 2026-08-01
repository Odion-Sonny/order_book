'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { money, num, pct, price } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';
import { useTradingStore } from '@/store/tradingStore';

type Tab = 'positions' | 'orders';

export function PositionsPanel() {
  const { positions, orders, refresh, cancelOrder } = useTradingStore();
  const lastPrice = useMarketStore((s) => s.lastPrice);
  const setSymbol = useSymbolStore((s) => s.setSymbol);
  const [tab, setTab] = useState<Tab>('positions');
  const authenticated = useAuthStore((s) => s.authenticated);

  useEffect(() => {
    void refresh();
  }, [refresh, authenticated]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 border-b border-line px-2 py-1">
        {(['positions', 'orders'] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded px-2 py-1 text-[11px] capitalize transition-colors ${
              tab === id ? 'bg-surface-3 text-fg' : 'text-faint hover:text-fg'
            }`}
          >
            {id} ({id === 'positions' ? positions.length : orders.length})
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'positions' ? (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-wide text-faint">
              <tr>
                {['Symbol', 'Qty', 'Avg cost', 'Last', 'Market value', 'Unrealised', '%'].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-right font-medium first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const ticker = position.asset_ticker ?? position.ticker ?? '—';
                const qty = num(position.quantity);
                const avg = num(position.average_cost);
                const last = lastPrice[ticker] ?? num(position.current_price);
                const value = qty * last;
                const pnl = value - qty * avg;
                const pnlPct = qty * avg !== 0 ? (pnl / (qty * avg)) * 100 : 0;
                return (
                  <motion.tr
                    key={position.id}
                    layout
                    onClick={() => ticker !== '—' && setSymbol(ticker)}
                    className="cursor-pointer border-b border-line/50 hover:bg-surface-2"
                  >
                    <td className="px-2 py-1.5 font-semibold">{ticker}</td>
                    <td className="tabular px-2 py-1.5 text-right">{qty}</td>
                    <td className="tabular px-2 py-1.5 text-right text-dim">{price(avg)}</td>
                    <td className="tabular px-2 py-1.5 text-right">{price(last)}</td>
                    <td className="tabular px-2 py-1.5 text-right">{money(value)}</td>
                    <td
                      className={`tabular px-2 py-1.5 text-right ${pnl >= 0 ? 'text-up' : 'text-down'}`}
                    >
                      {money(pnl)}
                    </td>
                    <td
                      className={`tabular px-2 py-1.5 text-right ${pnl >= 0 ? 'text-up' : 'text-down'}`}
                    >
                      {pct(pnlPct)}
                    </td>
                  </motion.tr>
                );
              })}
              {positions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-faint">
                    {authenticated
                      ? 'No open positions. Submit a simulated order from the Portfolio tab.'
                      : 'Sign in to see your positions.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-wide text-faint">
              <tr>
                {['Symbol', 'Side', 'Type', 'Price', 'Size', 'Status', ''].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-right font-medium first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-line/50 hover:bg-surface-2">
                  <td className="px-2 py-1.5 font-semibold">
                    {order.asset_ticker ?? String(order.asset)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right ${
                      order.side === 'BUY' ? 'text-up' : 'text-down'
                    }`}
                  >
                    {order.side}
                  </td>
                  <td className="px-2 py-1.5 text-right text-dim">{order.order_type}</td>
                  <td className="tabular px-2 py-1.5 text-right">{price(order.price)}</td>
                  <td className="tabular px-2 py-1.5 text-right">{num(order.size)}</td>
                  <td className="px-2 py-1.5 text-right text-dim">{order.status}</td>
                  <td className="px-2 py-1.5 text-right">
                    {order.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => void cancelOrder(order.id)}
                        className="rounded border border-line px-1.5 py-0.5 text-[10px] text-faint hover:border-down hover:text-down"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-faint">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
