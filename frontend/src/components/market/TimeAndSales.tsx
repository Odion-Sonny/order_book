'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { api } from '@/lib/api';
import { clockTime, compact, num, price } from '@/lib/format';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';

/** A print this size or larger is highlighted as block activity. */
const BLOCK_SIZE = 500;

/** See `OrderBookPanel` — `embedded` drops the chrome for the market column. */
export function TimeAndSales({ embedded = false }: { embedded?: boolean }) {
  const symbol = useSymbolStore((s) => s.symbol);
  const tape = useMarketStore((s) => s.tape);
  const addPrint = useMarketStore((s) => s.addPrint);
  const clearTape = useMarketStore((s) => s.clearTape);

  // Seed from executed trades so the tape is never empty on load.
  useEffect(() => {
    let cancelled = false;
    clearTape();
    api
      .trades(symbol, 50)
      .then((trades) => {
        if (cancelled) return;
        for (const trade of [...trades].reverse()) {
          addPrint({
            ticker: symbol,
            price: num(trade.price),
            size: num(trade.size),
            ts: Date.parse(trade.executed_at ?? trade.timestamp ?? '') || Date.now(),
            side: trade.side === 'SELL' ? 'sell' : trade.side === 'BUY' ? 'buy' : undefined,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [symbol, addPrint, clearTape]);

  const rows = tape.filter((print) => print.ticker === symbol);

  const body = (
    <>
      <div className="grid shrink-0 grid-cols-[1fr_1fr_1fr] border-b border-line px-2 py-1 text-[10px] uppercase tracking-wide text-faint">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {rows.map((print) => (
            <motion.li
              key={print.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`grid grid-cols-[1fr_1fr_1fr] px-2 py-[3px] text-[11px] ${
                print.size >= BLOCK_SIZE ? 'bg-surface-2' : ''
              }`}
            >
              <span className="tabular text-faint">{clockTime(print.ts)}</span>
              <span
                className={`tabular text-right ${print.side === 'buy' ? 'text-up' : 'text-down'}`}
              >
                {price(print.price)}
              </span>
              <span
                className={`tabular text-right ${
                  print.size >= BLOCK_SIZE ? 'font-semibold text-fg' : 'text-dim'
                }`}
              >
                {compact(print.size)}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {rows.length === 0 && (
          <li className="px-3 py-6 text-center text-[11px] text-faint">
            No prints. The tape fills from real executions while the market is open.
          </li>
        )}
      </ul>
    </>
  );

  if (embedded) return <div className="flex h-full min-h-0 flex-col">{body}</div>;

  return (
    <Panel
      title="Time & Sales"
      subtitle={symbol}
      actions={
        <button
          type="button"
          onClick={clearTape}
          aria-label="Clear tape"
          className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <Trash2 size={12} />
        </button>
      }
      bodyClassName="flex flex-col"
    >
      {body}
    </Panel>
  );
}
