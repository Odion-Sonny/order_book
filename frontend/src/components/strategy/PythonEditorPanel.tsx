'use client';

import Editor from '@monaco-editor/react';
import { Play, RotateCcw } from 'lucide-react';
import { useLayoutStore } from '@/store/layoutStore';
import { STARTER_STRATEGY, useStrategyStore } from '@/store/strategyStore';
import { useSymbolStore } from '@/store/symbolStore';

export function PythonEditorPanel() {
  const theme = useLayoutStore((s) => s.theme);
  const setBottomTab = useLayoutStore((s) => s.setBottomTab);
  const symbol = useSymbolStore((s) => s.symbol);
  const {
    code,
    name,
    startDate,
    endDate,
    initialCapital,
    running,
    setCode,
    setName,
    setDates,
    setInitialCapital,
    runBacktest,
  } = useStrategyStore();

  const start = () => {
    setBottomTab('strategy');
    void runBacktest();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-2 py-1.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Strategy name"
          className="w-40 rounded bg-surface-2 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-[11px] text-faint">on</span>
        <span className="rounded bg-surface-3 px-2 py-1 text-[11px] font-semibold">{symbol}</span>

        <label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-faint">
          From
          <input
            type="date"
            value={startDate}
            onChange={(event) => setDates(event.target.value, endDate)}
            className="tabular rounded bg-surface-2 px-1.5 py-1 text-[11px] text-fg outline-none"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-faint">
          To
          <input
            type="date"
            value={endDate}
            onChange={(event) => setDates(startDate, event.target.value)}
            className="tabular rounded bg-surface-2 px-1.5 py-1 text-[11px] text-fg outline-none"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-faint">
          Capital
          <input
            value={initialCapital}
            onChange={(event) => setInitialCapital(Number(event.target.value) || 0)}
            inputMode="numeric"
            className="tabular w-24 rounded bg-surface-2 px-1.5 py-1 text-[11px] text-fg outline-none"
          />
        </label>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setCode(STARTER_STRATEGY)}
          className="flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-dim hover:text-fg"
        >
          <RotateCcw size={11} /> Reset
        </button>
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="flex items-center gap-1 rounded bg-accent px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          <Play size={11} /> {running ? 'Running…' : 'Run backtest'}
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          language="python"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={code}
          onChange={(value) => setCode(value ?? '')}
          options={{
            fontSize: 12,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 4,
            renderLineHighlight: 'gutter',
            smoothScrolling: true,
            automaticLayout: true,
          }}
          loading={<span className="p-3 text-[11px] text-faint">Loading editor…</span>}
        />
      </div>
    </div>
  );
}
