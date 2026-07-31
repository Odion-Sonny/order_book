'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Search, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { pct, price } from '@/lib/format';
import { useLayoutStore } from '@/store/layoutStore';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';

/** Symbols always offered even before `market_data` resolves. */
const FALLBACK_SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'SPY', 'QQQ'];

export function CommandPalette() {
  const open = useLayoutStore((s) => s.commandOpen);
  const setOpen = useLayoutStore((s) => s.setCommandOpen);
  const snapshots = useMarketStore((s) => s.snapshots);
  const { symbol, favorites, recent, setSymbol, toggleFavorite } = useSymbolStore();

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const universe = useMemo(() => {
    const tickers = new Set([...Object.keys(snapshots), ...FALLBACK_SYMBOLS, ...favorites]);
    return Array.from(tickers).sort();
  }, [snapshots, favorites]);

  const results = useMemo(() => {
    const q = query.trim().toUpperCase();
    const pool = q
      ? universe.filter(
          (t) => t.includes(q) || (snapshots[t]?.name ?? '').toUpperCase().includes(q),
        )
      : [...recent.filter((r) => universe.includes(r)), ...universe.filter((t) => !recent.includes(t))];
    return pool.slice(0, 40);
  }, [query, universe, snapshots, recent]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      // Autofocus after the entry animation begins so the caret does not jump.
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  const choose = (ticker: string) => {
    setSymbol(ticker);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === 'Enter' && results[cursor]) {
      event.preventDefault();
      choose(results[cursor]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-[12vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Symbol search"
            className="w-[560px] max-w-[92vw] overflow-hidden rounded-lg border border-line-strong bg-surface shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
              <Search size={16} className="text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search symbol or company…"
                className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-faint"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">
                ESC
              </kbd>
            </div>

            <ul className="max-h-[46vh] overflow-y-auto py-1">
              {results.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-faint">No matching symbol</li>
              )}
              {results.map((ticker, index) => {
                const snapshot = snapshots[ticker];
                const change = snapshot?.price_change_percent ?? 0;
                const up = change >= 0;
                return (
                  <li key={ticker}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => choose(ticker)}
                      className={`flex w-full items-center gap-3 px-3.5 py-2 text-left ${
                        index === cursor ? 'bg-accent-soft' : ''
                      }`}
                    >
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Toggle favorite ${ticker}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite(ticker);
                        }}
                      >
                        <Star
                          size={13}
                          className={
                            favorites.includes(ticker)
                              ? 'fill-warn text-warn'
                              : 'text-faint hover:text-warn'
                          }
                        />
                      </span>
                      <span className="w-16 font-semibold text-fg">{ticker}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-dim">
                        {snapshot?.name ?? '—'}
                      </span>
                      {snapshot && (
                        <>
                          <span className="tabular text-xs text-fg">
                            {price(snapshot.current_price)}
                          </span>
                          <span
                            className={`tabular flex w-20 items-center justify-end gap-1 text-xs ${
                              up ? 'text-up' : 'text-down'
                            }`}
                          >
                            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {pct(change)}
                          </span>
                        </>
                      )}
                      {ticker === symbol && (
                        <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent">
                          active
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
