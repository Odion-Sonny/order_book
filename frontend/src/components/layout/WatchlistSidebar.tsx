'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Plus, RefreshCw, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { pct, price } from '@/lib/format';
import { useLayoutStore } from '@/store/layoutStore';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';

type Filter = 'all' | 'favorites';

export function WatchlistSidebar() {
  const snapshots = useMarketStore((s) => s.snapshots);
  const lastPrice = useMarketStore((s) => s.lastPrice);
  const loading = useMarketStore((s) => s.loadingSnapshots);
  const loadSnapshots = useMarketStore((s) => s.loadSnapshots);
  const { symbol, favorites, setSymbol, toggleFavorite } = useSymbolStore();
  const setCommandOpen = useLayoutStore((s) => s.setCommandOpen);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const tickers = Object.keys(snapshots);
    const merged = tickers.length > 0 ? tickers : favorites;
    return merged
      .filter((t) => (filter === 'favorites' ? favorites.includes(t) : true))
      .filter((t) => (query ? t.includes(query.toUpperCase()) : true))
      .sort();
  }, [snapshots, favorites, filter, query]);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-line px-2">
        <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-dim">
          Watchlist
        </h2>
        <button
          type="button"
          onClick={() => void loadSnapshots()}
          aria-label="Refresh watchlist"
          className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-line px-2 py-1.5">
        {(['all', 'favorites'] as Filter[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded px-2 py-1 text-[11px] capitalize transition-colors ${
              filter === id ? 'bg-surface-3 text-fg' : 'text-faint hover:text-fg'
            }`}
          >
            {id}
          </button>
        ))}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter…"
          className="min-w-0 flex-1 rounded bg-surface-2 px-2 py-1 text-[11px] outline-none placeholder:text-faint focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="grid shrink-0 grid-cols-[1fr_auto_auto] gap-2 border-b border-line px-2 py-1 text-[10px] uppercase tracking-wide text-faint">
        <span>Symbol</span>
        <span className="text-right">Last</span>
        <span className="w-14 text-right">Chg%</span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {rows.map((ticker) => {
            const snapshot = snapshots[ticker];
            const last = lastPrice[ticker] ?? snapshot?.current_price ?? 0;
            const change = snapshot?.price_change_percent ?? 0;
            const active = ticker === symbol;
            return (
              <motion.li
                key={ticker}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSymbol(ticker)}
                  onKeyDown={(event) => event.key === 'Enter' && setSymbol(ticker)}
                  className={`grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-2 border-l-2 px-2 py-1.5 transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft'
                      : 'border-transparent hover:bg-surface-2'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Toggle favorite ${ticker}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(ticker);
                      }}
                    >
                      <Star
                        size={11}
                        className={
                          favorites.includes(ticker)
                            ? 'fill-warn text-warn'
                            : 'text-faint hover:text-warn'
                        }
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{ticker}</p>
                      {snapshot?.name && (
                        <p className="truncate text-[10px] text-faint">{snapshot.name}</p>
                      )}
                    </div>
                  </div>
                  <span className="tabular text-right text-xs">{price(last)}</span>
                  <span
                    className={`tabular w-14 text-right text-[11px] ${
                      change >= 0 ? 'text-up' : 'text-down'
                    }`}
                  >
                    {pct(change)}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>

        {rows.length === 0 && (
          <li className="px-3 py-6 text-center text-[11px] text-faint">
            {loading ? 'Loading market data…' : 'No symbols. Add assets in Django admin.'}
          </li>
        )}
      </ul>

      <div className="shrink-0 border-t border-line p-1.5">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-line py-1.5 text-[11px] text-faint transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={12} /> Add symbol
        </button>
      </div>
    </aside>
  );
}
