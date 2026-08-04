'use client';

import { useEffect } from 'react';
import { useDrawingStore, type ToolId } from '@/store/drawingStore';
import { BOTTOM_TABS, useLayoutStore } from '@/store/layoutStore';
import { TIMEFRAMES, useSymbolStore } from '@/store/symbolStore';

/** Single-key drawing tool bindings, in the spirit of TradingView's. */
const DRAWING_KEYS: Record<string, ToolId> = {
  t: 'trendline',
  h: 'horizontal',
  v: 'vertical',
  r: 'rectangle',
  m: 'measure',
  a: 'ray',
  n: 'text',
};

export const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'Ctrl K  /  /', action: 'Symbol search' },
  { keys: 'Ctrl B', action: 'Toggle watchlist' },
  { keys: 'Ctrl I', action: 'Toggle order book column' },
  { keys: 'Ctrl J', action: 'Toggle bottom dock' },
  { keys: 'Alt 1-7', action: 'Bottom dock tabs' },
  { keys: 'Shift 1-7', action: 'Timeframe' },
  { keys: 'F', action: 'Maximize chart' },
  { keys: 'T / H / R', action: 'Trend line / horizontal / rectangle' },
  { keys: 'M', action: 'Measure move' },
  { keys: 'Alt F', action: 'Fibonacci retracement' },
  { keys: 'Del', action: 'Delete selected drawing' },
  { keys: 'Ctrl Shift L', action: 'Toggle theme' },
  { keys: 'Ctrl Shift R', action: 'Reset layout' },
  { keys: 'Esc', action: 'Close overlay' },
];

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.closest('.monaco-editor') !== null
  );
};

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const layout = useLayoutStore.getState();
      const symbols = useSymbolStore.getState();
      const mod = event.ctrlKey || event.metaKey;
      const typing = isTypingTarget(event.target);

      if (event.key === 'Escape') {
        if (layout.commandOpen) layout.setCommandOpen(false);
        else if (layout.maximized) layout.toggleMaximized(layout.maximized);
        return;
      }

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        layout.setCommandOpen(true);
        return;
      }

      if (!typing && event.key === '/') {
        event.preventDefault();
        layout.setCommandOpen(true);
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        layout.toggleTheme();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        layout.resetLayout();
        return;
      }

      if (mod && !event.shiftKey) {
        const key = event.key.toLowerCase();
        if (key === 'b') {
          event.preventDefault();
          layout.toggleDock('watchlist');
          return;
        }
        if (key === 'i') {
          event.preventDefault();
          layout.toggleDock('right');
          return;
        }
        if (key === 'j') {
          event.preventDefault();
          layout.toggleDock('bottom');
          return;
        }
      }

      if (event.altKey && /^[1-7]$/.test(event.key)) {
        event.preventDefault();
        layout.setBottomTab(BOTTOM_TABS[Number(event.key) - 1].id);
        return;
      }

      if (typing) return;

      // Shift+1..7 selects a timeframe; the digit arrives as a symbol on some layouts.
      if (event.shiftKey && !mod) {
        const index = '!@#$%^&'.indexOf(event.key);
        const fromDigit = /^[1-7]$/.test(event.key) ? Number(event.key) - 1 : -1;
        const slot = index >= 0 ? index : fromDigit;
        if (slot >= 0 && slot < TIMEFRAMES.length) {
          event.preventDefault();
          symbols.setTimeframe(TIMEFRAMES[slot]);
          return;
        }
      }

      if (!mod && !event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        layout.toggleMaximized('chart');
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        useDrawingStore.getState().setTool('fib');
        return;
      }

      if (!mod && !event.altKey) {
        const tool = DRAWING_KEYS[event.key.toLowerCase()];
        if (tool) {
          event.preventDefault();
          useDrawingStore.getState().setTool(tool);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
