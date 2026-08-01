'use client';

import {
  Magnet,
  Minus,
  MousePointer2,
  MoveUpRight,
  Ruler,
  Slash,
  Square,
  Trash2,
  TrendingUp,
  Type,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { DRAWING_COLORS, useDrawingStore, type ToolId } from '@/store/drawingStore';
import { useSymbolStore } from '@/store/symbolStore';

const TOOLS: Array<{ id: ToolId; icon: typeof Minus; label: string }> = [
  { id: 'cursor', icon: MousePointer2, label: 'Select / move (Esc)' },
  { id: 'trendline', icon: Slash, label: 'Trend line' },
  { id: 'ray', icon: MoveUpRight, label: 'Ray' },
  { id: 'horizontal', icon: Minus, label: 'Horizontal line — support / resistance' },
  { id: 'vertical', icon: TrendingUp, label: 'Vertical line — mark an event' },
  { id: 'rectangle', icon: Square, label: 'Rectangle — consolidation zone' },
  { id: 'fib', icon: Ruler, label: 'Fibonacci retracement' },
  { id: 'measure', icon: Ruler, label: 'Measure move (% and bars)' },
  { id: 'text', icon: Type, label: 'Text note' },
];

export function DrawingToolbar() {
  const symbol = useSymbolStore((s) => s.symbol);
  const { tool, color, magnet, setTool, setColor, toggleMagnet, undo, clear } = useDrawingStore();
  const count = useDrawingStore((s) => (s.bySymbol[symbol] ?? []).length);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="flex w-9 shrink-0 flex-col items-center gap-0.5 border-r border-line bg-surface py-1.5">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={tool === id}
          onClick={() => setTool(id)}
          className={`rounded p-1.5 transition-colors ${
            tool === id ? 'bg-accent text-white' : 'text-faint hover:bg-surface-2 hover:text-fg'
          }`}
        >
          <Icon size={15} />
        </button>
      ))}

      <div className="my-1 h-px w-5 bg-line" />

      <div className="relative">
        <button
          type="button"
          title="Colour"
          aria-label="Drawing colour"
          onClick={() => setPaletteOpen((open) => !open)}
          className="rounded p-1.5 hover:bg-surface-2"
        >
          <span
            className="block h-3.5 w-3.5 rounded-sm border border-line-strong"
            style={{ background: color }}
          />
        </button>
        {paletteOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setPaletteOpen(false)} />
            <div className="absolute left-9 top-0 z-40 flex gap-1 rounded border border-line-strong bg-surface p-1.5 shadow-xl">
              {DRAWING_COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Colour ${value}`}
                  onClick={() => {
                    setColor(value);
                    setPaletteOpen(false);
                  }}
                  className={`h-4 w-4 rounded-sm border ${
                    color === value ? 'border-fg' : 'border-transparent'
                  }`}
                  style={{ background: value }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        title="Magnet — snap to candle OHLC"
        aria-label="Toggle magnet"
        aria-pressed={magnet}
        onClick={toggleMagnet}
        className={`rounded p-1.5 transition-colors ${
          magnet ? 'bg-surface-3 text-fg' : 'text-faint hover:bg-surface-2 hover:text-fg'
        }`}
      >
        <Magnet size={15} />
      </button>

      <div className="my-1 h-px w-5 bg-line" />

      <button
        type="button"
        title="Undo last drawing"
        aria-label="Undo drawing"
        onClick={() => undo(symbol)}
        disabled={count === 0}
        className="rounded p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30"
      >
        <Undo2 size={15} />
      </button>
      <button
        type="button"
        title={`Clear ${count} drawing${count === 1 ? '' : 's'} on ${symbol}`}
        aria-label="Clear drawings"
        onClick={() => clear(symbol)}
        disabled={count === 0}
        className="rounded p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-down disabled:opacity-30"
      >
        <Trash2 size={15} />
      </button>

      {count > 0 && <span className="mt-0.5 text-[9px] text-faint">{count}</span>}
    </div>
  );
}
