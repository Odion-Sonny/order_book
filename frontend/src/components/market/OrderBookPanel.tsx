'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { compact, price } from '@/lib/format';
import { useStream } from '@/hooks/useStream';
import { Panel } from '@/components/ui/Panel';
import { log } from '@/store/logStore';
import { useLayoutStore } from '@/store/layoutStore';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';
import type { OrderBookData, OrderBookLevel } from '@/types';

const LEVELS = 12;

function Ladder({
  levels,
  side,
  maxSize,
}: {
  levels: OrderBookLevel[];
  side: 'bid' | 'ask';
  maxSize: number;
}) {
  const bid = side === 'bid';
  // Asks arrive ascending but must render with the best (lowest) ask nearest the spread.
  return (
    <div className={`flex ${bid ? 'flex-col' : 'flex-col-reverse'}`}>
      {levels.map((level, index) => (
        <motion.div
          key={`${side}-${level.price}-${index}`}
          layout
          transition={{ duration: 0.12 }}
          className="relative grid grid-cols-[1fr_1fr_1fr] items-center px-2 py-[3px] text-[11px]"
        >
          <span
            aria-hidden
            className="absolute inset-y-0 right-0"
            style={{
              width: `${maxSize > 0 ? Math.min((level.size / maxSize) * 100, 100) : 0}%`,
              background: bid ? 'var(--bid-bar)' : 'var(--ask-bar)',
            }}
          />
          <span className={`tabular relative ${bid ? 'text-up' : 'text-down'}`}>
            {price(level.price)}
          </span>
          <span className="tabular relative text-right text-dim">{compact(level.size)}</span>
          <span className="tabular relative text-right text-faint">{compact(level.total)}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function OrderBookPanel() {
  const symbol = useSymbolStore((s) => s.symbol);
  const orderBook = useMarketStore((s) => s.orderBook);
  const setOrderBook = useMarketStore((s) => s.setOrderBook);
  const maximized = useLayoutStore((s) => s.maximized);
  const toggleMaximized = useLayoutStore((s) => s.toggleMaximized);

  const [error, setError] = useState<string | null>(null);
  const lastRef = useRef<number>(0);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  // REST snapshot on symbol change, then live updates over the socket.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .orderBook(symbol, LEVELS)
      .then((book) => !cancelled && setOrderBook(book))
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Order book unavailable';
        setError(message);
        log('error', 'orderbook', `${symbol}: ${message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, setOrderBook]);

  useStream(`ws/orderbook/${symbol}/`, (msg) => {
    if (msg.type !== 'orderbook_update') return;
    const book = msg.data as OrderBookData;
    if (!book || (book.bids?.length ?? 0) + (book.asks?.length ?? 0) === 0) return;
    setOrderBook({ ...book, ticker: book.ticker ?? symbol });
    setError(null);
  });

  const book = orderBook?.ticker === symbol ? orderBook : null;

  const { bids, asks, spread, spreadPct, imbalance, maxSize } = useMemo(() => {
    const bidLevels = (book?.bids ?? []).slice(0, LEVELS);
    const askLevels = (book?.asks ?? []).slice(0, LEVELS);
    const bestBid = bidLevels[0]?.price ?? 0;
    const bestAsk = askLevels[0]?.price ?? 0;
    const spreadValue = bestAsk && bestBid ? bestAsk - bestBid : 0;
    const bidVolume = bidLevels.reduce((a, l) => a + l.size, 0);
    const askVolume = askLevels.reduce((a, l) => a + l.size, 0);
    return {
      bids: bidLevels,
      asks: askLevels,
      spread: spreadValue,
      spreadPct: bestBid ? (spreadValue / bestBid) * 100 : 0,
      imbalance: bidVolume + askVolume > 0 ? bidVolume / (bidVolume + askVolume) : 0.5,
      maxSize: Math.max(...bidLevels.map((l) => l.size), ...askLevels.map((l) => l.size), 1),
    };
  }, [book]);

  const last = book?.last_price ?? 0;

  useEffect(() => {
    if (!last) return;
    if (lastRef.current && last !== lastRef.current) {
      setFlash(last > lastRef.current ? 'up' : 'down');
      const id = window.setTimeout(() => setFlash(null), 600);
      lastRef.current = last;
      return () => window.clearTimeout(id);
    }
    lastRef.current = last;
  }, [last]);

  return (
    <Panel
      title="Order Book"
      subtitle={`L1 · ${symbol}`}
      maximized={maximized === 'right'}
      onMaximize={() => toggleMaximized('right')}
      bodyClassName="flex flex-col"
    >
      <div className="grid shrink-0 grid-cols-[1fr_1fr_1fr] border-b border-line px-2 py-1 text-[10px] uppercase tracking-wide text-faint">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && !book && (
          <p className="px-3 py-6 text-center text-[11px] text-faint">{error}</p>
        )}
        {book && asks.length === 0 && bids.length === 0 && (
          <p className="px-3 py-6 text-center text-[11px] text-faint">
            No quotes. The venue publishes none while the market is closed.
          </p>
        )}
        <Ladder levels={asks} side="ask" maxSize={maxSize} />

        <div
          className={`sticky top-0 z-10 flex items-center justify-between border-y border-line bg-surface-2 px-2 py-1.5 ${
            flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''
          }`}
        >
          <span className="tabular text-sm font-semibold">{price(last)}</span>
          <span className="text-[10px] text-faint">
            spread {price(spread)} ({spreadPct.toFixed(3)}%)
          </span>
        </div>

        <Ladder levels={bids} side="bid" maxSize={maxSize} />
      </div>

      <div className="shrink-0 border-t border-line px-2 py-1.5">
        <div className="mb-1 flex justify-between text-[10px] text-faint">
          <span>Bid {Math.round(imbalance * 100)}%</span>
          <span>Ask {Math.round((1 - imbalance) * 100)}%</span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className="bg-up"
            animate={{ width: `${imbalance * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
          <div className="flex-1 bg-down" />
        </div>
      </div>
    </Panel>
  );
}
