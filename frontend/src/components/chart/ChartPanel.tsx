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
import { api } from '@/lib/api';
import { compact, price } from '@/lib/format';
import {
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
import { currentRange, useSymbolStore } from '@/store/symbolStore';
import type { Candle } from '@/types';

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
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<Candle | null>(null);

  const palette = PALETTES[theme];
  const paneIndicators = useMemo(
    () => indicators.filter((i) => PANE_INDICATORS.includes(i)),
    [indicators],
  );
  const showPane = paneIndicators.length > 0;

  /* ---------------------------------------------------------------- data */

  useEffect(() => {
    let cancelled = false;
    const preset = currentRange(range);

    setLoading(true);
    setError(null);
    api
      .chartData(symbol, timeframe, Math.max(preset.limit, 200))
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
  }, [symbol, timeframe, range]);

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

    return () => {
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
  }, [chartType, palette]);

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
    chart.timeScale().fitContent();
  }, [candles, chartType, palette]);

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

  /* Live price ticks update the forming candle without a refetch. */
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series || !livePrice || candles.length === 0) return;
    const lastCandle = candles[candles.length - 1];

    if (chartType === 'candles' || chartType === 'bars') {
      (series as ISeriesApi<'Candlestick'>).update({
        time: asTime(lastCandle.time),
        open: lastCandle.open,
        high: Math.max(lastCandle.high, livePrice),
        low: Math.min(lastCandle.low, livePrice),
        close: livePrice,
      });
    } else {
      (series as ISeriesApi<'Line'>).update({ time: asTime(lastCandle.time), value: livePrice });
    }
  }, [livePrice, candles, chartType]);

  /* --------------------------------------------------------------- view */

  const shown = hover ?? candles[candles.length - 1] ?? null;
  const bullish = shown ? shown.close >= shown.open : true;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-surface">
      <div className="pointer-events-none absolute left-2.5 top-2 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="font-semibold text-fg">
          {symbol} · {timeframe}
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
            <span key={id} className="text-dim">
              {id.toUpperCase()}
            </span>
          ))}
      </div>

      {loading && (
        <div className="absolute right-3 top-2 z-10 text-[11px] text-faint">loading…</div>
      )}
      {error && !loading && (
        <div className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center text-xs text-down">
          {error}
        </div>
      )}

      <div ref={containerRef} className="min-h-0 flex-1" />
      {showPane && <div ref={paneRef} className="h-32 shrink-0 border-t border-line" />}
    </div>
  );
}
