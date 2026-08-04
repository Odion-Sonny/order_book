'use client';

import { Bot, RotateCcw, Send, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildContext } from '@/lib/analysis';
import type { CoachInput } from '@/lib/coach';
import { num } from '@/lib/format';
import { useCoachStore } from '@/store/coachStore';
import { useMarketStore } from '@/store/marketStore';
import { useSymbolStore } from '@/store/symbolStore';

const SUGGESTIONS = [
  'Analyze this chart',
  'Is RSI overbought?',
  'Help me size risk',
  'What is volume saying?',
  'Explain the order book',
  'Backtest strategy tips',
];

/** Bold and inline code only — the coach never emits anything richer. */
function MarkdownLite({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-fg">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="tabular rounded bg-bg px-1 py-0.5 text-[11px] text-warn">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <em key={i} className="text-dim">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function CoachPanel() {
  const symbol = useSymbolStore((s) => s.symbol);
  const series = useMarketStore((s) => s.series);
  const quote = useMarketStore((s) => s.snapshots[symbol]);
  const { messages, thinking, ask, noteSymbol, reset } = useCoachStore();

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const ctx: CoachInput | null = useMemo(() => {
    if (!series || series.symbol !== symbol) return null;
    const base = buildContext(series.candles, series.symbol, series.timeframe);
    if (!base) return null;
    return {
      ...base,
      bid: quote ? num(quote.bid_price) || undefined : undefined,
      ask: quote ? num(quote.ask_price) || undefined : undefined,
      changePercent: quote ? num(quote.price_change_percent) : undefined,
    };
  }, [series, symbol, quote]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    noteSymbol(symbol);
  }, [symbol, noteSymbol]);

  const send = (text: string) => {
    if (!ctx) return;
    ask(text, ctx);
    setInput('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-7 shrink-0 items-center gap-2 border-b border-line px-2.5">
        <Bot size={13} className="text-accent" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
          Trading coach
        </span>
        <span className="text-[10px] text-faint">
          {ctx ? `${ctx.symbol} · ${ctx.bars} ${ctx.timeframe} bars` : 'waiting for chart data'}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={reset}
          aria-label="Clear conversation"
          className="rounded p-1 text-faint transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <RotateCcw size={12} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role !== 'user' && (
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                  m.role === 'system' ? 'bg-surface-3' : 'bg-accent-soft'
                }`}
              >
                <Bot size={12} className={m.role === 'system' ? 'text-faint' : 'text-accent'} />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg border px-2.5 py-1.5 text-[12px] leading-relaxed ${
                m.role === 'user'
                  ? 'border-accent bg-accent text-white'
                  : m.role === 'system'
                    ? 'border-line bg-surface-2 text-faint'
                    : 'border-line bg-surface-2 text-dim'
              }`}
            >
              <MarkdownLite text={m.content} />
            </div>
            {m.role === 'user' && (
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-3">
                <User size={12} className="text-faint" />
              </div>
            )}
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-[11px] text-faint">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-accent-soft">
              <Bot size={12} className="text-accent" />
            </div>
            <span className="animate-pulse">Reading the tape…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-line p-2">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={!ctx || thinking}
              className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] text-faint transition-colors hover:border-accent hover:text-fg disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ctx ? 'Ask about structure, momentum, risk…' : 'Load a chart first'}
            disabled={!ctx}
            className="flex-1 rounded border border-line bg-surface-2 px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-faint focus:border-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!ctx || !input.trim() || thinking}
            aria-label="Send"
            className="flex items-center justify-center rounded bg-accent px-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
