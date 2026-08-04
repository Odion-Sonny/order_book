import type { Candle } from '@/types';
import { atr, bollinger, ema, lastValue, macd, rsi, sma, vwap } from './indicators';

/**
 * Scalar read of every indicator at the newest loaded bar.
 *
 * Everything is derived from the bars the chart already fetched, so a field is
 * `null` whenever the loaded window is shorter than the indicator's period —
 * an SMA 200 over 60 bars is not a number we are willing to invent.
 */
export interface IndicatorSnapshot {
  price: number;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  /** Where price sits inside the Bollinger channel: 0 = lower band, 1 = upper. */
  bbPosition: number | null;
  atr: number | null;
  vwap: number | null;
}

export interface RangeStat {
  low: number;
  high: number;
  /** Position of the last price inside the range, 0-1. */
  position: number;
}

export interface VolumeStat {
  last: number;
  average: number;
  /** Last bar's volume as a multiple of the loaded window's average. */
  ratio: number;
}

export interface MarketContext {
  symbol: string;
  timeframe: string;
  bars: number;
  snapshot: IndicatorSnapshot;
  /** Bars sharing the newest bar's calendar day — absent on daily/weekly data. */
  session: RangeStat | null;
  /** High/low across every loaded bar. */
  window: RangeStat;
  volume: VolumeStat;
  /** Green/red split over the last five bars. */
  recent: { up: number; down: number };
}

const positionIn = (low: number, high: number, value: number): number =>
  high === low ? 0.5 : Math.min(1, Math.max(0, (value - low) / (high - low)));

const rangeOf = (candles: Candle[], price: number): RangeStat => {
  const low = Math.min(...candles.map((c) => c.low));
  const high = Math.max(...candles.map((c) => c.high));
  return { low, high, position: positionIn(low, high, price) };
};

export const buildSnapshot = (candles: Candle[]): IndicatorSnapshot => {
  const price = candles[candles.length - 1]?.close ?? 0;
  const macdSeries = macd(candles);
  const bands = bollinger(candles);

  const bbUpper = lastValue(bands.upper);
  const bbLower = lastValue(bands.lower);

  return {
    price,
    rsi: lastValue(rsi(candles)),
    macd: lastValue(macdSeries.macd),
    macdSignal: lastValue(macdSeries.signal),
    macdHist: lastValue(macdSeries.histogram),
    sma20: lastValue(sma(candles, 20)),
    sma50: lastValue(sma(candles, 50)),
    sma200: lastValue(sma(candles, 200)),
    ema12: lastValue(ema(candles, 12)),
    ema26: lastValue(ema(candles, 26)),
    bbUpper,
    bbMiddle: lastValue(bands.middle),
    bbLower,
    bbPosition:
      bbUpper !== null && bbLower !== null ? positionIn(bbLower, bbUpper, price) : null,
    atr: lastValue(atr(candles)),
    vwap: lastValue(vwap(candles)),
  };
};

/** Bars of the newest calendar day, for the session range on intraday data. */
const sessionBars = (candles: Candle[]): Candle[] => {
  const last = candles[candles.length - 1];
  if (!last) return [];
  const day = new Date(last.time * 1000).toDateString();
  const out: Candle[] = [];
  for (let i = candles.length - 1; i >= 0; i--) {
    if (new Date(candles[i].time * 1000).toDateString() !== day) break;
    out.unshift(candles[i]);
  }
  return out;
};

export const buildContext = (
  candles: Candle[],
  symbol: string,
  timeframe: string,
): MarketContext | null => {
  if (candles.length === 0) return null;

  const snapshot = buildSnapshot(candles);
  const session = sessionBars(candles);
  const recentFive = candles.slice(-5);
  const volumes = candles.map((c) => c.volume);
  const average = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const last = volumes[volumes.length - 1];

  return {
    symbol,
    timeframe,
    bars: candles.length,
    snapshot,
    // One bar per day means the "session" and the bar are the same thing.
    session: session.length > 1 ? rangeOf(session, snapshot.price) : null,
    window: rangeOf(candles, snapshot.price),
    volume: { last, average, ratio: average > 0 ? last / average : 0 },
    recent: {
      up: recentFive.filter((c) => c.close >= c.open).length,
      down: recentFive.filter((c) => c.close < c.open).length,
    },
  };
};

export interface StackRow {
  label: string;
  /** `null` when the underlying indicator has no value on this window. */
  bullish: boolean | null;
}

/** The trend checklist: each row is one comparison a trend follower would make. */
export const trendStack = (s: IndicatorSnapshot): StackRow[] => {
  const cmp = (a: number | null, b: number | null): boolean | null =>
    a === null || b === null ? null : a >= b;

  return [
    { label: 'Price vs SMA 20', bullish: cmp(s.price, s.sma20) },
    { label: 'SMA 20 vs SMA 50', bullish: cmp(s.sma20, s.sma50) },
    { label: 'SMA 50 vs SMA 200', bullish: cmp(s.sma50, s.sma200) },
    { label: 'Price vs VWAP', bullish: cmp(s.price, s.vwap) },
    { label: 'MACD vs signal', bullish: cmp(s.macd, s.macdSignal) },
  ];
};

/** Plain-language structure read, used by both the dashboard and the coach. */
export const trendLabel = (s: IndicatorSnapshot): string => {
  const { price, sma20, sma50, sma200 } = s;
  if (sma20 !== null && sma50 !== null && sma200 !== null) {
    if (price > sma20 && sma20 > sma50 && sma50 > sma200) return 'strong uptrend';
    if (price < sma20 && sma20 < sma50 && sma50 < sma200) return 'strong downtrend';
  }
  if (sma50 !== null) return price > sma50 ? 'mild bullish bias' : 'mild bearish bias';
  if (sma20 !== null) return price > sma20 ? 'short-term bullish' : 'short-term bearish';
  return 'range / mixed structure';
};

export const rsiLabel = (value: number): string => {
  if (value >= 70) return 'overbought';
  if (value <= 30) return 'oversold';
  if (value >= 55) return 'bullish momentum';
  if (value <= 45) return 'bearish momentum';
  return 'neutral momentum';
};
