'use client';

import { useEffect } from 'react';
import { useMarketClockStore } from '@/store/marketClockStore';

/** "in 3h 20m" for the next open/close, or null when we have no timestamp. */
function untilLabel(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `in ${days}d ${hours % 24}h`;
  if (hours >= 1) return `in ${hours}h ${minutes % 60}m`;
  return `in ${minutes}m`;
}

/**
 * Says plainly whether the venue is trading. Without it a closed market looks
 * identical to a broken feed — flat chart, empty tape, still order book.
 */
export function MarketStatusBadge() {
  const { isOpen, nextOpen, nextClose, error } = useMarketClockStore();
  const start = useMarketClockStore((s) => s.start);

  useEffect(() => start(), [start]);

  if (error || isOpen === null) {
    return (
      <span
        title={error ?? 'Market status unknown'}
        className="rounded bg-surface-3 px-1 text-[9px] font-semibold uppercase text-faint"
      >
        clock ?
      </span>
    );
  }

  const until = untilLabel(isOpen ? nextClose : nextOpen);

  return (
    <span
      title={
        isOpen
          ? `US equities open${until ? ` — closes ${until}` : ''}`
          : `US equities closed${until ? ` — opens ${until}` : ''}. Quotes and the tape stay still until the bell.`
      }
      className={`rounded px-1 text-[9px] font-semibold uppercase ${
        isOpen ? 'bg-up/20 text-up' : 'bg-warn/20 text-warn'
      }`}
    >
      {isOpen ? 'market open' : 'market closed'}
    </span>
  );
}
