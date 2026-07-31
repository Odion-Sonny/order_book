'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { price } from '@/lib/format';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';
import { useTradingStore } from '@/store/tradingStore';
import type { OrderSide, OrderType } from '@/types';

const ORDER_TYPES: OrderType[] = ['LIMIT', 'MARKET', 'STOP_LOSS'];

export function OrderTicket() {
  const symbol = useSymbolStore((s) => s.symbol);
  const last = useMarketStore((s) => s.lastPrice[symbol] ?? s.snapshots[symbol]?.current_price ?? 0);
  const { submitOrder, submitting, error } = useTradingStore();

  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('LIMIT');
  const [limitPrice, setLimitPrice] = useState('');
  const [size, setSize] = useState('10');
  const [flash, setFlash] = useState<string | null>(null);

  // Follow the market until the trader types their own price.
  useEffect(() => {
    if (last > 0 && limitPrice === '') setLimitPrice(last.toFixed(2));
  }, [last, limitPrice]);

  useEffect(() => setLimitPrice(last > 0 ? last.toFixed(2) : ''), [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectivePrice = type === 'MARKET' ? last : parseFloat(limitPrice || '0');
  const quantity = parseFloat(size || '0');
  const notional = effectivePrice * quantity;

  const submit = async () => {
    if (!(quantity > 0) || !(effectivePrice > 0)) return;
    const ok = await submitOrder({ ticker: symbol, side, type, price: effectivePrice, size: quantity });
    setFlash(ok ? `${side} ${quantity} ${symbol} submitted` : 'Order rejected');
    window.setTimeout(() => setFlash(null), 2500);
  };

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded border border-line bg-surface-2 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
          Simulate Trade
        </span>
        <span className="tabular text-[11px] text-faint">{price(last)}</span>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {(['BUY', 'SELL'] as OrderSide[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSide(option)}
            className={`rounded py-1.5 text-xs font-semibold transition-colors ${
              side === option
                ? option === 'BUY'
                  ? 'bg-up text-white'
                  : 'bg-down text-white'
                : 'bg-surface-3 text-dim hover:text-fg'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {ORDER_TYPES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={`flex-1 rounded px-1 py-1 text-[10px] transition-colors ${
              type === option ? 'bg-surface-3 text-fg' : 'text-faint hover:text-fg'
            }`}
          >
            {option.replace('_', ' ')}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-faint">
        Price
        <input
          value={type === 'MARKET' ? price(last) : limitPrice}
          onChange={(event) => setLimitPrice(event.target.value)}
          disabled={type === 'MARKET'}
          inputMode="decimal"
          className="tabular rounded bg-surface px-2 py-1.5 text-xs text-fg outline-none focus:ring-1 focus:ring-accent disabled:text-faint"
        />
      </label>

      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-faint">
        Quantity
        <input
          value={size}
          onChange={(event) => setSize(event.target.value)}
          inputMode="decimal"
          className="tabular rounded bg-surface px-2 py-1.5 text-xs text-fg outline-none focus:ring-1 focus:ring-accent"
        />
      </label>

      <div className="flex justify-between text-[11px] text-faint">
        <span>Notional</span>
        <span className="tabular text-dim">{price(notional)}</span>
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting || !(quantity > 0)}
        className={`rounded py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-50 ${
          side === 'BUY' ? 'bg-up' : 'bg-down'
        }`}
      >
        {submitting ? 'Submitting…' : `${side} ${symbol}`}
      </button>

      {(flash || error) && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-[11px] ${error ? 'text-down' : 'text-up'}`}
        >
          {flash ?? error}
        </motion.p>
      )}
    </div>
  );
}
