'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { clockTime } from '@/lib/format';
import { useLogStore } from '@/store/logStore';
import type { LogEntry } from '@/types';

const LEVEL_STYLE: Record<LogEntry['level'], string> = {
  info: 'text-dim',
  warn: 'text-warn',
  error: 'text-down',
  success: 'text-up',
};

export function LogsPanel() {
  const logs = useLogStore((s) => s.logs);
  const clear = useLogStore((s) => s.clear);
  const [filter, setFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () =>
      filter
        ? logs.filter(
            (entry) =>
              entry.message.toLowerCase().includes(filter.toLowerCase()) ||
              entry.source.includes(filter.toLowerCase()),
          )
        : logs,
    [logs, filter],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [rows.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-2 py-1.5">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter logs…"
          className="w-48 rounded bg-surface-2 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-[11px] text-faint">{rows.length} entries</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-dim hover:text-fg"
        >
          <Trash2 size={11} /> Clear
        </button>
      </div>

      <div className="tabular min-h-0 flex-1 overflow-auto px-2 py-1 text-[11px] leading-relaxed">
        {rows.map((entry) => (
          <div key={entry.id} className="flex gap-2">
            <span className="text-faint">{clockTime(entry.ts)}</span>
            <span className="w-20 shrink-0 text-faint">[{entry.source}]</span>
            <span className={LEVEL_STYLE[entry.level]}>{entry.message}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-8 text-center text-faint">No log output yet.</p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
