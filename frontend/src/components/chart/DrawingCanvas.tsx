'use client';

import type { IChartApi, ISeriesApi, Logical, SeriesType } from 'lightweight-charts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { price as fmtPrice } from '@/lib/format';
import {
  TWO_POINT_TOOLS,
  useDrawingStore,
  type Anchor,
  type Drawing,
  type ToolId,
} from '@/store/drawingStore';
import type { Candle } from '@/types';

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const HIT_TOLERANCE = 6;
/** Pixels of movement that turn a click into a drag-to-draw. */
const DRAG_THRESHOLD = 4;

/**
 * Shared empty result for symbols with no drawings. A fresh `[]` inside the
 * selector is a new reference on every snapshot, which makes the store look
 * perpetually changed and spins React into an infinite render loop.
 */
const NO_DRAWINGS: Drawing[] = [];

interface DrawingCanvasProps {
  chart: IChartApi | null;
  series: ISeriesApi<SeriesType> | null;
  candles: Candle[];
  symbol: string;
  /** Redraw trigger: bumped by the parent when the chart repaints. */
  revision: number;
}

export function DrawingCanvas({ chart, series, candles, symbol, revision }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { tool, color, width, magnet, selectedId, add, update, remove, setSelected, setTool } =
    useDrawingStore();
  const drawings = useDrawingStore((s) => s.bySymbol[symbol] ?? NO_DRAWINGS);

  const [pending, setPending] = useState<Anchor[]>([]);
  const [cursor, setCursor] = useState<Anchor | null>(null);
  const dragRef = useRef<{ id: string; index: number } | null>(null);
  /** Set on pointer-down while a tool is armed; tracks drag-to-draw. */
  const strokeRef = useRef<{ start: Anchor; x: number; y: number; moved: boolean } | null>(null);
  /** True when the pointer is over an existing drawing, so it can be grabbed. */
  const [overDrawing, setOverDrawing] = useState(false);

  const active = tool !== 'cursor';

  /* ------------------------------------------------------- coordinate maths */

  /** Median bar spacing in seconds, used to extrapolate past the last candle. */
  const barStep = useMemo(() => {
    if (candles.length < 2) return 60;
    const gaps: number[] = [];
    for (let i = 1; i < candles.length; i += 1) gaps.push(candles[i].time - candles[i - 1].time);
    gaps.sort((a, b) => a - b);
    return gaps[Math.floor(gaps.length / 2)] || 60;
  }, [candles]);

  /*
   * Anchors are converted through the time scale's *logical* index rather than
   * timeToCoordinate/coordinateToTime. Those only resolve times that exist in
   * the data, so a click on the whitespace right of the last bar — or on any
   * gap between sessions — returned null and the tool silently did nothing.
   * Logical indices are continuous and extrapolate, so drawing works anywhere.
   */
  const timeToLogical = useCallback(
    (time: number): number | null => {
      const n = candles.length;
      if (n === 0) return null;
      const first = candles[0].time;
      const last = candles[n - 1].time;
      if (time <= first) return (time - first) / barStep;
      if (time >= last) return n - 1 + (time - last) / barStep;

      let lo = 0;
      let hi = n - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (candles[mid].time <= time) lo = mid;
        else hi = mid;
      }
      const span = candles[hi].time - candles[lo].time || barStep;
      return lo + (time - candles[lo].time) / span;
    },
    [candles, barStep],
  );

  const logicalToTime = useCallback(
    (logical: number): number | null => {
      const n = candles.length;
      if (n === 0) return null;
      if (logical <= 0) return candles[0].time + logical * barStep;
      if (logical >= n - 1) return candles[n - 1].time + (logical - (n - 1)) * barStep;
      const i = Math.floor(logical);
      const frac = logical - i;
      return candles[i].time + frac * (candles[i + 1].time - candles[i].time);
    },
    [candles, barStep],
  );

  const toCanvas = useCallback(
    (anchor: Anchor): { x: number; y: number } | null => {
      if (!chart || !series) return null;
      try {
        const logical = timeToLogical(anchor.time);
        if (logical === null) return null;
        const x = chart.timeScale().logicalToCoordinate(logical as Logical);
        const y = series.priceToCoordinate(anchor.price);
        if (x === null || y === null) return null;
        return { x, y };
      } catch {
        // Chart disposed between render and paint.
        return null;
      }
    },
    [chart, series, timeToLogical],
  );

  const toAnchor = useCallback(
    (x: number, y: number): Anchor | null => {
      if (!chart || !series) return null;
      let logical: Logical | null;
      let price: number | null;
      try {
        logical = chart.timeScale().coordinateToLogical(x);
        price = series.coordinateToPrice(y);
      } catch {
        return null;
      }
      if (logical === null || price === null) return null;
      const time = logicalToTime(Number(logical));
      if (time === null) return null;

      let anchor: Anchor = { time, price: Number(price) };

      // Magnet snaps to the nearest candle's closest OHLC value.
      if (magnet && candles.length > 0) {
        let nearest = candles[0];
        for (const candle of candles) {
          if (Math.abs(candle.time - anchor.time) < Math.abs(nearest.time - anchor.time)) {
            nearest = candle;
          }
        }
        const levels = [nearest.open, nearest.high, nearest.low, nearest.close];
        const closest = levels.reduce((best, level) =>
          Math.abs(level - anchor.price) < Math.abs(best - anchor.price) ? level : best,
        );
        anchor = { time: nearest.time, price: closest };
      }
      return anchor;
    },
    [chart, series, magnet, candles, logicalToTime],
  );

  /* ------------------------------------------------------------- rendering */

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const { clientWidth: w, clientHeight: h } = canvas;
    if (canvas.width !== w * ratio || canvas.height !== h * ratio) {
      canvas.width = w * ratio;
      canvas.height = h * ratio;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const drawShape = (drawing: Drawing, isPreview = false) => {
      const points = drawing.points.map(toCanvas);
      if (points.some((p) => p === null) || points.length === 0) return;
      const pts = points as Array<{ x: number; y: number }>;

      ctx.save();
      ctx.strokeStyle = drawing.color;
      ctx.fillStyle = drawing.color;
      ctx.lineWidth = drawing.width;
      if (isPreview) ctx.setLineDash([4, 4]);

      const [a, b] = pts;

      switch (drawing.type) {
        case 'horizontal':
          ctx.beginPath();
          ctx.moveTo(0, a.y);
          ctx.lineTo(w, a.y);
          ctx.stroke();
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(fmtPrice(drawing.points[0].price), 4, a.y - 4);
          break;

        case 'vertical':
          ctx.beginPath();
          ctx.moveTo(a.x, 0);
          ctx.lineTo(a.x, h);
          ctx.stroke();
          break;

        case 'trendline':
          if (!b) break;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          break;

        case 'ray': {
          if (!b) break;
          // Extend past the second point to the canvas edge.
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const scale = dx === 0 ? h : (w - a.x) / dx;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x + dx * Math.abs(scale), a.y + dy * Math.abs(scale));
          ctx.stroke();
          break;
        }

        case 'rectangle':
          if (!b) break;
          ctx.globalAlpha = 0.12;
          ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
          ctx.globalAlpha = 1;
          ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
          break;

        case 'fib': {
          if (!b) break;
          const hi = Math.max(drawing.points[0].price, drawing.points[1].price);
          const lo = Math.min(drawing.points[0].price, drawing.points[1].price);
          ctx.font = '10px ui-monospace, monospace';
          for (const level of FIB_LEVELS) {
            const levelPrice = hi - (hi - lo) * level;
            const y = toCanvas({ time: drawing.points[0].time, price: levelPrice })?.y;
            if (y === null || y === undefined) continue;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.setLineDash(level === 0 || level === 1 ? [] : [3, 3]);
            ctx.moveTo(Math.min(a.x, b.x), y);
            ctx.lineTo(Math.max(a.x, b.x), y);
            ctx.stroke();
            ctx.fillText(
              `${(level * 100).toFixed(1)}%  ${fmtPrice(levelPrice)}`,
              Math.min(a.x, b.x) + 4,
              y - 3,
            );
          }
          ctx.globalAlpha = 1;
          break;
        }

        case 'text':
          ctx.font = '12px sans-serif';
          ctx.fillText(drawing.label ?? 'note', a.x + 4, a.y - 4);
          ctx.beginPath();
          ctx.arc(a.x, a.y, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      // Handles on the selected drawing.
      if (drawing.id === selectedId) {
        ctx.setLineDash([]);
        for (const p of pts) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = drawing.color;
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    for (const drawing of drawings) drawShape(drawing);

    /* In-progress drawing and the measure readout. */
    if (pending.length > 0 && cursor) {
      const points = [...pending, cursor];
      if (tool === 'measure') {
        const [from, to] = points;
        const p1 = toCanvas(from);
        const p2 = toCanvas(to);
        if (p1 && p2) {
          const change = to.price - from.price;
          const changePct = from.price ? (change / from.price) * 100 : 0;
          const bars = candles.filter(
            (c) => c.time >= Math.min(from.time, to.time) && c.time <= Math.max(from.time, to.time),
          ).length;

          ctx.save();
          ctx.fillStyle = change >= 0 ? 'rgba(38,166,154,0.18)' : 'rgba(239,83,80,0.18)';
          ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
          ctx.strokeStyle = change >= 0 ? '#26a69a' : '#ef5350';
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);

          const label = `${change >= 0 ? '+' : ''}${fmtPrice(change)} (${changePct.toFixed(2)}%)  ${bars} bars`;
          ctx.setLineDash([]);
          ctx.font = '11px ui-monospace, monospace';
          const tw = ctx.measureText(label).width + 10;
          const bx = Math.min(p1.x, p2.x) + Math.abs(p2.x - p1.x) / 2 - tw / 2;
          const by = Math.min(p1.y, p2.y) - 22;
          ctx.fillStyle = change >= 0 ? '#26a69a' : '#ef5350';
          ctx.fillRect(bx, by, tw, 18);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, bx + 5, by + 13);
          ctx.restore();
        }
      } else {
        drawShape(
          { id: 'preview', type: tool as Drawing['type'], points, color, width },
          true,
        );
      }
    }
  }, [drawings, pending, cursor, tool, color, width, selectedId, toCanvas, series, candles]);

  useEffect(() => {
    paint();
  }, [paint, revision]);

  /* Repaint whenever the chart moves under us. */
  useEffect(() => {
    if (!chart) return;
    const repaint = () => paint();
    try {
      chart.timeScale().subscribeVisibleLogicalRangeChange(repaint);
    } catch {
      return;
    }
    window.addEventListener('resize', repaint);
    return () => {
      window.removeEventListener('resize', repaint);
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(repaint);
      } catch {
        // Chart already disposed; nothing to detach from.
      }
    };
  }, [chart, paint]);

  /* ---------------------------------------------------------- interaction */

  const hitTest = useCallback(
    (x: number, y: number): Drawing | null => {
      for (const drawing of [...drawings].reverse()) {
        for (const point of drawing.points) {
          const p = toCanvas(point);
          if (p && Math.hypot(p.x - x, p.y - y) <= HIT_TOLERANCE + 2) return drawing;
        }
        if (drawing.type === 'horizontal') {
          const p = toCanvas(drawing.points[0]);
          if (p && Math.abs(p.y - y) <= HIT_TOLERANCE) return drawing;
        }
        if (drawing.points.length === 2) {
          const a = toCanvas(drawing.points[0]);
          const b = toCanvas(drawing.points[1]);
          if (a && b) {
            // Distance from the point to the segment.
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            if (len > 0) {
              const t = Math.max(
                0,
                Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (len * len)),
              );
              const px = a.x + t * (b.x - a.x);
              const py = a.y + t * (b.y - a.y);
              if (Math.hypot(px - x, py - y) <= HIT_TOLERANCE) return drawing;
            }
          }
        }
      }
      return null;
    },
    [drawings, toCanvas],
  );

  /*
   * While the overlay is pointer-transparent it gets no events of its own, so
   * proximity is tracked on the parent, where chart events still bubble.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent || active) return;

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      setOverDrawing(hitTest(event.clientX - rect.left, event.clientY - rect.top) !== null);
    };
    const onLeave = () => setOverDrawing(false);

    parent.addEventListener('pointermove', onMove);
    parent.addEventListener('pointerleave', onLeave);
    return () => {
      parent.removeEventListener('pointermove', onMove);
      parent.removeEventListener('pointerleave', onLeave);
    };
  }, [hitTest, active]);

  /** Close a two-point shape. `measure` is transient — it never persists. */
  const commit = (end: Anchor) => {
    const start = pending[0] ?? strokeRef.current?.start;
    if (start && tool !== 'measure') {
      add(symbol, { type: tool as Drawing['type'], points: [start, end], color, width });
    }
    setPending([]);
    setCursor(null);
    strokeRef.current = null;
  };

  const localPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = localPoint(event);

    if (!active) {
      const hit = hitTest(x, y);
      setSelected(hit?.id ?? null);
      if (hit) {
        // Grab the nearest handle so it can be dragged.
        let index = 0;
        let best = Infinity;
        hit.points.forEach((point, i) => {
          const p = toCanvas(point);
          if (!p) return;
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < best) {
            best = d;
            index = i;
          }
        });
        if (best <= HIT_TOLERANCE + 4) {
          dragRef.current = { id: hit.id, index };
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }
      return;
    }

    const anchor = toAnchor(x, y);
    if (!anchor) return;

    const needsTwo = TWO_POINT_TOOLS.includes(tool);
    if (!needsTwo) {
      const label =
        tool === 'text' ? (window.prompt('Note text', 'note')?.trim() ?? '') : undefined;
      if (tool === 'text' && !label) return;
      add(symbol, { type: tool as Drawing['type'], points: [anchor], color, width, label });
      setPending([]);
      setTool('cursor');
      return;
    }

    if (pending.length === 0) {
      // Arm both gestures: a drag finishes on pointer-up, a click waits for a
      // second click. Previously only click-click worked, so anyone who dragged
      // (the habit every charting tool teaches) got nothing.
      setPending([anchor]);
      setCursor(anchor);
      strokeRef.current = { start: anchor, x, y, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    } else {
      commit(anchor);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = localPoint(event);

    const drag = dragRef.current;
    if (drag) {
      const anchor = toAnchor(x, y);
      if (!anchor) return;
      const drawing = drawings.find((d) => d.id === drag.id);
      if (!drawing) return;
      const points = drawing.points.map((p, i) => (i === drag.index ? anchor : p));
      update(symbol, drag.id, points);
      return;
    }

    const stroke = strokeRef.current;
    if (stroke && Math.hypot(x - stroke.x, y - stroke.y) > DRAG_THRESHOLD) stroke.moved = true;

    if (pending.length > 0) setCursor(toAnchor(x, y));
    else if (!active) setOverDrawing(hitTest(x, y) !== null);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;

    const stroke = strokeRef.current;
    if (stroke) {
      const { x, y } = localPoint(event);
      strokeRef.current = null;
      // A real drag ends the shape here; a click leaves it pending for click-click.
      if (stroke.moved) {
        const anchor = toAnchor(x, y);
        if (anchor) commit(anchor);
      }
    }
  };

  /* Escape cancels, Delete removes the selection. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPending([]);
        setCursor(null);
        strokeRef.current = null;
        setTool('cursor');
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        const target = event.target;
        if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
        remove(symbol, selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, symbol, remove, setTool]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute inset-0 z-10"
      style={{
        /*
         * The overlay only takes the pointer when it has something to do:
         * a tool is armed, or the cursor is actually over a drawing. Claiming
         * it whenever any drawing existed killed chart pan and zoom outright.
         */
        pointerEvents: active || overDrawing || selectedId ? 'auto' : 'none',
        cursor: active ? 'crosshair' : overDrawing ? 'move' : 'default',
      }}
    />
  );
}
