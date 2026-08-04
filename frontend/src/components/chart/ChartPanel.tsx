'use client';

import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type MouseEventParams,
  type SeriesType,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DrawingCanvas } from './DrawingCanvas';
import { DrawingToolbar } from './DrawingToolbar';
import { api } from '@/lib/api';
import { compact, price } from '@/lib/format';
import {
  INDICATOR_LABELS,
  PANE_INDICATORS,
  bollinger,
  ema,
  macd,
  rsi,
  sma,
  vwap,
  type IndicatorId,
} from '@/lib/indicators';
import { log } from '@/store/logStore';
import { useLayoutStore } from '@/store/layoutStore';
import { useMarketStore } from '@/store/marketStore';
import { barsFor, useSymbolStore, type ChartType } from '@/store/symbolStore';
import type { Candle, Timeframe } from '@/types';

interface Palette {
  bg: string;
  grid: string;
  text: string;
  border: string;
  up: string;
  down: string;
}

const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: {
    bg: '#131722',
    grid: '#1f2432',
    text: '#8b93a7',
    border: '#2a3040',
    up: '#26a69a',
    down: '#ef5350',
  },
  light: {
    bg: '#ffffff',
    grid: '#eceef2',
    text: '#5b6472',
    border: '#dcdfe6',
    up: '#089981',
    down: '#f23645',
  },
};

const OVERLAY_COLORS: Record<string, string> = {
  sma20: '#2962ff',
  sma50: '#ff9800',
  ema20: '#ab47bc',
  vwap: '#00bcd4',
  bollingerUpper: '#787b86',
  bollingerLower: '#787b86',
};

const asTime = (t: number) => t as UTCTimestamp;

/** Push one bar into the main series, in whichever shape the series expects. */
const applyBar = (series: ISeriesApi<SeriesType>, chartType: ChartType, bar: Candle) => {
  if (chartType === 'candles' || chartType === 'bars') {
    (series as ISeriesApi<'Candlestick'>).update({
      time: asTime(bar.time),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    });
  } else {
    (series as ISeriesApi<'Line'>).update({ time: asTime(bar.time), value: bar.close });
  }
};

/**
 * Fetch older bars once the viewport comes within this many bars of the start
 * of the loaded history, so the data arrives before the user reaches the edge.
 */
const LOAD_MORE_THRESHOLD = 12;

/**
 * Load this many times the visible window. The range button frames what you
 * see; the surplus sits off-screen to the left so panning and switching to a
 * wider range are instant instead of a round trip.
 */
const HISTORY_BUFFER = 4;

/** Ceiling on a single request, so a wide range can't stall the browser. */
const MAX_FETCH_BARS = 5000;

/** Empty bars kept to the right of the last candle, for breathing room. */
const RIGHT_MARGIN_BARS = 4;

/**
 * Bar width in seconds, used to roll live ticks into a new candle once the
 * current one closes. Daily and weekly bars are deliberately absent: their
 * boundaries follow the venue's session calendar, not a fixed number of
 * seconds, so those resolutions keep forming the last bar until the next fetch.
 */
const INTRADAY_SECONDS: Partial<Record<Timeframe, number>> = {
  '1Min': 60,
  '5Min': 5 * 60,
  '15Min': 15 * 60,
  '1Hour': 60 * 60,
  '4Hour': 4 * 60 * 60,
};

export function ChartPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const paneChartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlayRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const paneRefs = useRef<Map<string, ISeriesApi<'Line' | 'Histogram'>>>(new Map());
  /** time -> candle, for the crosshair legend. */
  const candleIndexRef = useRef<Map<number, Candle>>(new Map());

  const theme = useLayoutStore((s) => s.theme);
  const { symbol, timeframe, range, chartType, indicators } = useSymbolStore();
  const livePrice = useMarketStore((s) => s.lastPrice[symbol]);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /** Latest candles, so the range subscription never closes over a stale array. */
  const candlesRef = useRef<Candle[]>([]);
  /** Set once the venue has no more history for this symbol/resolution. */
  const exhaustedRef = useRef(false);
  const loadingMoreRef = useRef(false);
  /** Bars just prepended, used to hold the viewport still across the update. */
  const shiftRef = useRef(0);
  /** Frame the visible window on the next paint (new symbol, resolution, range). */
  const frameRef = useRef(true);
  /** What the loaded series actually is, to tell a zoom from a new dataset. */
  const lastFetchRef = useRef<{ symbol: string; timeframe: string } | null>(null);
  /** Lets the top-up effect call loadOlder without depending on its identity. */
  const loadOlderRef = useRef<(() => Promise<void>) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<Candle | null>(null);
  /**
   * The bar being built from live ticks, once the clock has moved past the last
   * bar the venue returned. Held in a ref so ticks accumulate a high and low,
   * and mirrored into state so the OHLC header follows it.
   */
  const formingRef = useRef<Candle | null>(null);
  const [forming, setForming] = useState<Candle | null>(null);
  /** Bumped whenever the chart is rebuilt so the drawing layer repaints. */
  const [revision, setRevision] = useState(0);
  /**
   * Handed to the drawing layer as state, not refs: a ref would still point at
   * a chart that has been disposed by a theme or chart-type change, and every
   * call on it throws.
   */
  const [chartApi, setChartApi] = useState<IChartApi | null>(null);
  const [seriesApi, setSeriesApi] = useState<ISeriesApi<SeriesType> | null>(null);

  const palette = PALETTES[theme];
  const paneIndicators = useMemo(
    () => indicators.filter((i) => PANE_INDICATORS.includes(i)),
    [indicators],
  );
  const showPane = paneIndicators.length > 0;

  /* ---------------------------------------------------------------- data */

  /** Bars the range asks to *show*. */
  const visibleBars = barsFor(range, timeframe);
  /** Bars to *load* — a buffer past the window, so panning has somewhere to go. */
  const fetchBars = Math.min(MAX_FETCH_BARS, visibleBars * HISTORY_BUFFER);

  useEffect(() => {
    let cancelled = false;

    // Reframe on any of these changes; the data effect applies it after setData.
    frameRef.current = true;

    /*
     * A range change at the same resolution is a zoom, not a new dataset: 6M
     * already holds the bars 1M and 1D need, so reframe what is loaded instead
     * of refetching. Only a new symbol or resolution actually needs the network.
     */
    const sameSeries =
      lastFetchRef.current?.symbol === symbol && lastFetchRef.current?.timeframe === timeframe;
    if (sameSeries && candlesRef.current.length >= visibleBars) return;

    // A fresh symbol/resolution starts a new history: allow paging again.
    exhaustedRef.current = false;
    loadingMoreRef.current = false;
    shiftRef.current = 0;
    lastFetchRef.current = { symbol, timeframe };

    setLoading(true);
    setError(null);
    api
      .chartData(symbol, timeframe, fetchBars)
      .then((data) => {
        if (cancelled) return;
        setCandles(data);
        if (data.length === 0) setError(`No bars returned for ${symbol}`);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Chart data failed';
        setError(message);
        log('error', 'chart', `${symbol} ${timeframe}: ${message}`);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe, range, visibleBars, fetchBars]);

  /*
   * Widening the range beyond what is loaded (6M -> 1Y at the same resolution)
   * tops up from the same paging path the pan-left handler uses.
   */
  useEffect(() => {
    if (loading || candles.length === 0) return;
    if (candles.length < visibleBars && !exhaustedRef.current) void loadOlderRef.current?.();
  }, [candles, visibleBars, loading]);

  /*
   * Extend history when the user pans or zooms past the oldest loaded bar.
   * Without this the chart simply ends in mid-air at whatever the range
   * preset fetched, which reads as missing data rather than a boundary.
   */
  const loadOlder = useCallback(async () => {
    if (loadingMoreRef.current || exhaustedRef.current) return;
    const oldest = candlesRef.current[0];
    if (!oldest) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const older = await api.chartData(
        symbol,
        timeframe,
        barsFor(range, timeframe),
        new Date(oldest.time * 1000).toISOString(),
      );

      /*
       * Merge by timestamp rather than splicing at the boundary. The page
       * deliberately overlaps the bar we anchored on, and `candlesRef` only
       * catches up on the next render, so a splice can interleave a stale
       * cutoff with newer bars — which lightweight-charts rejects outright
       * ("data must be asc ordered by time").
       */
      const current = candlesRef.current;
      const byTime = new Map(current.map((c) => [c.time, c]));
      let added = 0;
      for (const candle of older) {
        if (!byTime.has(candle.time)) {
          byTime.set(candle.time, candle);
          added += 1;
        }
      }

      if (added === 0) {
        exhaustedRef.current = true;
        return;
      }

      const merged = [...byTime.values()].sort((a, b) => a.time - b.time);
      // Keep the ref in step now: the next page may be requested before React
      // re-renders, and it must not measure against the pre-merge array.
      candlesRef.current = merged;
      // Keep the viewport still: prepending shifts every logical index right.
      shiftRef.current = added;
      setCandles(merged);
    } catch (err) {
      exhaustedRef.current = true;
      log(
        'warn',
        'chart',
        `No older ${timeframe} bars for ${symbol}: ${err instanceof Error ? err.message : 'request failed'}`,
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [symbol, timeframe, range]);

  useEffect(() => {
    loadOlderRef.current = loadOlder;
  }, [loadOlder]);

  useEffect(() => {
    if (!chartApi) return;
    const timeScale = chartApi.timeScale();

    const onRangeChange = (logicalRange: LogicalRange | null) => {
      if (!logicalRange) return;
      // `from` goes negative once the viewport runs past the first bar.
      if (logicalRange.from < LOAD_MORE_THRESHOLD) void loadOlder();
    };

    try {
      timeScale.subscribeVisibleLogicalRangeChange(onRangeChange);
    } catch {
      return;
    }
    return () => {
      try {
        timeScale.unsubscribeVisibleLogicalRangeChange(onRangeChange);
      } catch {
        // Chart already disposed.
      }
    };
  }, [chartApi, loadOlder]);

  /* -------------------------------------------------------------- charts */

  const createMainChart = useCallback(() => {
    if (!containerRef.current) return null;
    return createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: palette.bg },
        textColor: palette.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      rightPriceScale: { borderColor: palette.border, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderColor: palette.border, timeVisible: true, secondsVisible: false },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: palette.text, width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2962ff' },
        horzLine: { color: palette.text, width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2962ff' },
      },
      autoSize: true,
    });
  }, [palette]);

  useEffect(() => {
    const chart = createMainChart();
    if (!chart) return;
    chartRef.current = chart;

    const volume = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    volumeSeriesRef.current = volume;

    const onCrosshair = (param: MouseEventParams) => {
      if (!param.time) {
        setHover(null);
        return;
      }
      setHover(candleIndexRef.current.get(Number(param.time)) ?? null);
    };

    chart.subscribeCrosshairMove(onCrosshair);
    setChartApi(chart);

    return () => {
      // Drop the handles before disposing so nothing can call into a dead chart.
      setChartApi(null);
      setSeriesApi(null);
      chart.unsubscribeCrosshairMove(onCrosshair);
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlayRefs.current.clear();
    };
  }, [createMainChart]);

  /* Main price series — recreated when the chart type changes. */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
    }

    const shared = { priceLineVisible: true, lastValueVisible: true };
    let series: ISeriesApi<SeriesType>;
    if (chartType === 'candles') {
      series = chart.addCandlestickSeries({
        ...shared,
        upColor: palette.up,
        downColor: palette.down,
        borderUpColor: palette.up,
        borderDownColor: palette.down,
        wickUpColor: palette.up,
        wickDownColor: palette.down,
      });
    } else if (chartType === 'bars') {
      series = chart.addBarSeries({ ...shared, upColor: palette.up, downColor: palette.down });
    } else if (chartType === 'area') {
      series = chart.addAreaSeries({
        ...shared,
        lineColor: '#2962ff',
        topColor: 'rgba(41,98,255,0.28)',
        bottomColor: 'rgba(41,98,255,0.02)',
        lineWidth: 2,
      });
    } else {
      series = chart.addLineSeries({ ...shared, color: '#2962ff', lineWidth: 2 });
    }
    mainSeriesRef.current = series;
    setSeriesApi(series);

    return () => {
      setSeriesApi(null);
    };
  }, [chartType, palette, chartApi]);

  /* Feed data into price + volume series. */
  useEffect(() => {
    const series = mainSeriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || candles.length === 0) return;

    // The ref is a union of series kinds; narrow at the call site.
    if (chartType === 'candles' || chartType === 'bars') {
      (series as ISeriesApi<'Candlestick'>).setData(
        candles.map((c) => ({
          time: asTime(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
    } else {
      (series as ISeriesApi<'Line'>).setData(
        candles.map((c) => ({ time: asTime(c.time), value: c.close })),
      );
    }

    volumeSeriesRef.current?.setData(
      candles.map((c) => ({
        time: asTime(c.time),
        value: c.volume,
        color: c.close >= c.open ? `${palette.up}55` : `${palette.down}55`,
      })),
    );

    candleIndexRef.current = new Map(candles.map((c) => [c.time, c]));
    candlesRef.current = candles;

    if (shiftRef.current > 0) {
      // Older bars were prepended: every logical index moved right by that many,
      // so shift the viewport back to leave the user looking at the same candles.
      const shift = shiftRef.current;
      shiftRef.current = 0;
      const visible = chart.timeScale().getVisibleLogicalRange();
      if (visible) {
        chart.timeScale().setVisibleLogicalRange({
          from: visible.from + shift,
          to: visible.to + shift,
        });
      }
    }
    setRevision((r) => r + 1);
  }, [candles, chartType, palette]);

  /*
   * Frame the visible window. Runs after the data effect above, and also on a
   * range-only change where `candles` is untouched — that is the case that lets
   * 6M -> 1M -> 1D reframe the same loaded series with no refetch.
   */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0 || !frameRef.current) return;

    const len = candles.length;
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, len - visibleBars),
      to: len - 1 + RIGHT_MARGIN_BARS,
    });
    frameRef.current = false;
    setRevision((r) => r + 1);
  }, [candles, visibleBars, range, chartType]);

  /* Overlay indicators drawn on the price scale. */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const wanted = new Map<string, { data: Array<{ time: number; value: number }>; color: string }>();
    for (const id of indicators) {
      if (id === 'sma20') wanted.set(id, { data: sma(candles, 20), color: OVERLAY_COLORS.sma20 });
      if (id === 'sma50') wanted.set(id, { data: sma(candles, 50), color: OVERLAY_COLORS.sma50 });
      if (id === 'ema20') wanted.set(id, { data: ema(candles, 20), color: OVERLAY_COLORS.ema20 });
      if (id === 'vwap') wanted.set(id, { data: vwap(candles), color: OVERLAY_COLORS.vwap });
      if (id === 'bollinger') {
        const bands = bollinger(candles);
        wanted.set('bollingerUpper', { data: bands.upper, color: OVERLAY_COLORS.bollingerUpper });
        wanted.set('bollingerLower', { data: bands.lower, color: OVERLAY_COLORS.bollingerLower });
      }
    }

    for (const [key, series] of overlayRefs.current) {
      if (!wanted.has(key)) {
        chart.removeSeries(series);
        overlayRefs.current.delete(key);
      }
    }

    for (const [key, { data, color }] of wanted) {
      let series = overlayRefs.current.get(key);
      if (!series) {
        series = chart.addLineSeries({
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        overlayRefs.current.set(key, series);
      }
      series.setData(data.map((p) => ({ time: asTime(p.time), value: p.value })));
    }
  }, [indicators, candles]);

  /* Separate pane chart for RSI / MACD, time-synced with the price chart. */
  useEffect(() => {
    if (!showPane || !paneRef.current) return;

    const chart = createChart(paneRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: palette.bg },
        textColor: palette.text,
        fontSize: 10,
      },
      grid: { vertLines: { color: palette.grid }, horzLines: { color: palette.grid } },
      rightPriceScale: { borderColor: palette.border },
      timeScale: { borderColor: palette.border, timeVisible: true, visible: true },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });
    paneChartRef.current = chart;

    const main = chartRef.current;
    const syncFromMain = (range: LogicalRange | null) =>
      range && chart.timeScale().setVisibleLogicalRange(range);
    const syncFromPane = (range: LogicalRange | null) =>
      range && main?.timeScale().setVisibleLogicalRange(range);

    main?.timeScale().subscribeVisibleLogicalRangeChange(syncFromMain);
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncFromPane);

    return () => {
      main?.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromMain);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromPane);
      chart.remove();
      paneChartRef.current = null;
      paneRefs.current.clear();
    };
  }, [showPane, palette]);

  useEffect(() => {
    const chart = paneChartRef.current;
    if (!chart) return;

    for (const [, series] of paneRefs.current) chart.removeSeries(series);
    paneRefs.current.clear();

    if (paneIndicators.includes('rsi')) {
      const series = chart.addLineSeries({ color: '#ab47bc', lineWidth: 1 });
      series.setData(rsi(candles).map((p) => ({ time: asTime(p.time), value: p.value })));
      series.createPriceLine({ price: 70, color: '#ef5350', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: '' });
      series.createPriceLine({ price: 30, color: '#26a69a', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: '' });
      paneRefs.current.set('rsi', series);
    }

    if (paneIndicators.includes('macd')) {
      const series = macd(candles);
      const macdLine = chart.addLineSeries({ color: '#2962ff', lineWidth: 1 });
      macdLine.setData(series.macd.map((p) => ({ time: asTime(p.time), value: p.value })));
      const signalLine = chart.addLineSeries({ color: '#ff9800', lineWidth: 1 });
      signalLine.setData(series.signal.map((p) => ({ time: asTime(p.time), value: p.value })));
      paneRefs.current.set('macd', macdLine);
      paneRefs.current.set('macdSignal', signalLine);
    }
  }, [paneIndicators, candles]);

  /* A new symbol or resolution invalidates whatever bar was being built. */
  useEffect(() => {
    formingRef.current = null;
    setForming(null);
  }, [symbol, timeframe]);

  /* Drop the local bar once the venue returns a real one that covers it. */
  useEffect(() => {
    const last = candles[candles.length - 1];
    if (last && formingRef.current && last.time >= formingRef.current.time) {
      formingRef.current = null;
      setForming(null);
    }
  }, [candles]);

  /*
   * Live price ticks build the current bar without a refetch. While the clock
   * is still inside the last bar the venue returned, ticks extend that bar;
   * once it closes they open the next one, so the chart keeps advancing
   * between fetches instead of piling every trade onto one candle.
   */
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series || !livePrice || candles.length === 0) return;
    const lastCandle = candles[candles.length - 1];

    const barSeconds = INTRADAY_SECONDS[timeframe];
    const now = Date.now() / 1000;
    /*
     * Anchor the grid to the last bar the venue sent rather than to the epoch,
     * so the boundaries line up with however the venue aligns its bars.
     */
    const elapsed = barSeconds ? Math.floor((now - lastCandle.time) / barSeconds) : 0;

    if (!barSeconds || elapsed < 1) {
      // Still inside the venue's last bar: extend it.
      if (formingRef.current) {
        formingRef.current = null;
        setForming(null);
      }
      const bar: Candle = {
        time: lastCandle.time,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, livePrice),
        low: Math.min(lastCandle.low, livePrice),
        close: livePrice,
        volume: lastCandle.volume,
      };
      applyBar(series, chartType, bar);
      return;
    }

    // The venue's last bar has closed; build the one the clock is now in.
    const barTime = lastCandle.time + elapsed * barSeconds;
    const current = formingRef.current;
    const bar: Candle =
      current && current.time === barTime
        ? {
            ...current,
            high: Math.max(current.high, livePrice),
            low: Math.min(current.low, livePrice),
            close: livePrice,
          }
        : { time: barTime, open: livePrice, high: livePrice, low: livePrice, close: livePrice, volume: 0 };

    formingRef.current = bar;
    setForming(bar);
    applyBar(series, chartType, bar);
  }, [livePrice, candles, chartType, timeframe]);

  /* --------------------------------------------------------------- view */

  const shown = hover ?? forming ?? candles[candles.length - 1] ?? null;
  const bullish = shown ? shown.close >= shown.open : true;

  /* Indicator values at the bar under the crosshair, for the legend. */
  const legend = useMemo(() => {
    const at = shown?.time;
    if (!at || candles.length === 0) return {} as Partial<Record<IndicatorId, number>>;
    const valueAt = (points: Array<{ time: number; value: number }>) =>
      points.find((p) => p.time === at)?.value;

    const out: Partial<Record<IndicatorId, number>> = {};
    for (const id of indicators) {
      if (id === 'sma20') out.sma20 = valueAt(sma(candles, 20));
      if (id === 'sma50') out.sma50 = valueAt(sma(candles, 50));
      if (id === 'ema20') out.ema20 = valueAt(ema(candles, 20));
      if (id === 'vwap') out.vwap = valueAt(vwap(candles));
      if (id === 'bollinger') out.bollinger = valueAt(bollinger(candles).middle);
      if (id === 'rsi') out.rsi = valueAt(rsi(candles));
    }
    return out;
  }, [indicators, candles, shown]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-surface">
      <div className="pointer-events-none absolute left-2.5 top-2 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="font-semibold text-fg">
          {symbol} · {timeframe} · {range}
          <span className="ml-1 font-normal text-faint">
            {Math.min(visibleBars, candles.length)} shown / {candles.length} loaded
          </span>
        </span>
        {shown && (
          <span className={`tabular flex gap-2 ${bullish ? 'text-up' : 'text-down'}`}>
            <span>O {price(shown.open)}</span>
            <span>H {price(shown.high)}</span>
            <span>L {price(shown.low)}</span>
            <span>C {price(shown.close)}</span>
            <span className="text-dim">V {compact(shown.volume)}</span>
          </span>
        )}
        {indicators
          .filter((i) => !PANE_INDICATORS.includes(i))
          .map((id: IndicatorId) => (
            <span key={id} className="tabular text-dim">
              <span style={{ color: OVERLAY_COLORS[id] ?? 'inherit' }}>
                {INDICATOR_LABELS[id]}
              </span>{' '}
              {legend[id] !== undefined ? price(legend[id]) : '—'}
            </span>
          ))}
      </div>

      {(loading || loadingMore) && (
        <div className="absolute right-3 top-2 z-10 text-[11px] text-faint">
          {loadingMore ? 'loading history…' : 'loading…'}
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center text-xs text-down">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <DrawingToolbar />
        <div className="relative min-h-0 min-w-0 flex-1">
          <div ref={containerRef} className="absolute inset-0" />
          <DrawingCanvas
            chart={chartApi}
            series={seriesApi}
            candles={candles}
            symbol={symbol}
            revision={revision}
          />
        </div>
      </div>
      {showPane && <div ref={paneRef} className="h-32 shrink-0 border-t border-line" />}
    </div>
  );
}
