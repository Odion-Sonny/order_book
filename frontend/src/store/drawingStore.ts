'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ToolId =
  | 'cursor'
  | 'trendline'
  | 'ray'
  | 'horizontal'
  | 'vertical'
  | 'rectangle'
  | 'fib'
  | 'measure'
  | 'text';

/** A point anchored to chart data, so drawings survive pan and zoom. */
export interface Anchor {
  time: number;
  price: number;
}

export interface Drawing {
  id: string;
  type: Exclude<ToolId, 'cursor' | 'measure'>;
  points: Anchor[];
  color: string;
  width: number;
  label?: string;
}

/** Tools that need two anchors; the rest commit on a single click. */
export const TWO_POINT_TOOLS: ToolId[] = ['trendline', 'ray', 'rectangle', 'fib', 'measure'];

export const DRAWING_COLORS = ['#2962ff', '#26a69a', '#ef5350', '#f0b90b', '#ab47bc', '#d6dae4'];

interface DrawingState {
  /** Drawings keyed by symbol, so each chart keeps its own analysis. */
  bySymbol: Record<string, Drawing[]>;
  tool: ToolId;
  color: string;
  width: number;
  selectedId: string | null;
  magnet: boolean;

  setTool: (tool: ToolId) => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
  setSelected: (id: string | null) => void;
  toggleMagnet: () => void;

  add: (symbol: string, drawing: Omit<Drawing, 'id'>) => void;
  update: (symbol: string, id: string, points: Anchor[]) => void;
  remove: (symbol: string, id: string) => void;
  undo: (symbol: string) => void;
  clear: (symbol: string) => void;
  drawingsFor: (symbol: string) => Drawing[];
}

let seq = 0;

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      bySymbol: {},
      tool: 'cursor',
      color: DRAWING_COLORS[0],
      width: 1,
      selectedId: null,
      magnet: true,

      setTool: (tool) => set({ tool, selectedId: null }),
      setColor: (color) => set({ color }),
      setWidth: (width) => set({ width }),
      setSelected: (selectedId) => set({ selectedId }),
      toggleMagnet: () => set((s) => ({ magnet: !s.magnet })),

      add: (symbol, drawing) =>
        set((s) => ({
          bySymbol: {
            ...s.bySymbol,
            [symbol]: [
              ...(s.bySymbol[symbol] ?? []),
              { ...drawing, id: `d${Date.now()}-${++seq}` },
            ],
          },
          // Drop back to the cursor so a tool is not left armed.
          tool: 'cursor',
        })),

      update: (symbol, id, points) =>
        set((s) => ({
          bySymbol: {
            ...s.bySymbol,
            [symbol]: (s.bySymbol[symbol] ?? []).map((d) => (d.id === id ? { ...d, points } : d)),
          },
        })),

      remove: (symbol, id) =>
        set((s) => ({
          bySymbol: {
            ...s.bySymbol,
            [symbol]: (s.bySymbol[symbol] ?? []).filter((d) => d.id !== id),
          },
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      undo: (symbol) =>
        set((s) => ({
          bySymbol: { ...s.bySymbol, [symbol]: (s.bySymbol[symbol] ?? []).slice(0, -1) },
        })),

      clear: (symbol) => set((s) => ({ bySymbol: { ...s.bySymbol, [symbol]: [] } })),

      drawingsFor: (symbol) => get().bySymbol[symbol] ?? [],
    }),
    {
      name: 'te.drawings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ bySymbol, color, width, magnet }) => ({ bySymbol, color, width, magnet }),
    },
  ),
);
