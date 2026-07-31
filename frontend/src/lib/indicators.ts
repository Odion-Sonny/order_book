import type { Candle } from '@/types';

export interface LinePoint {
  time: number;
  value: number;
}

export const sma = (candles: Candle[], period: number): LinePoint[] => {
  const out: LinePoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
};

export const ema = (candles: Candle[], period: number): LinePoint[] => {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const out: LinePoint[] = [];
  let prev = candles.slice(0, period).reduce((a, c) => a + c.close, 0) / period;
  out.push({ time: candles[period - 1].time, value: prev });
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: prev });
  }
  return out;
};

/** Session-agnostic rolling VWAP over the loaded window. */
export const vwap = (candles: Candle[]): LinePoint[] => {
  let pv = 0;
  let vol = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vol += c.volume;
    return { time: c.time, value: vol > 0 ? pv / vol : c.close };
  });
};

export const rsi = (candles: Candle[], period = 14): LinePoint[] => {
  if (candles.length <= period) return [];
  const out: LinePoint[] = [];
  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  gain /= period;
  loss /= period;
  out.push({ time: candles[period].time, value: loss === 0 ? 100 : 100 - 100 / (1 + gain / loss) });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gain = (gain * (period - 1) + Math.max(diff, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-diff, 0)) / period;
    out.push({
      time: candles[i].time,
      value: loss === 0 ? 100 : 100 - 100 / (1 + gain / loss),
    });
  }
  return out;
};

export interface BollingerBands {
  upper: LinePoint[];
  middle: LinePoint[];
  lower: LinePoint[];
}

export const bollinger = (candles: Candle[], period = 20, mult = 2): BollingerBands => {
  const upper: LinePoint[] = [];
  const middle: LinePoint[] = [];
  const lower: LinePoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i - period + 1, i + 1);
    const mean = window.reduce((a, c) => a + c.close, 0) / period;
    const variance = window.reduce((a, c) => a + (c.close - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const time = candles[i].time;
    middle.push({ time, value: mean });
    upper.push({ time, value: mean + mult * sd });
    lower.push({ time, value: mean - mult * sd });
  }
  return { upper, middle, lower };
};

export interface MacdSeries {
  macd: LinePoint[];
  signal: LinePoint[];
  histogram: LinePoint[];
}

export const macd = (candles: Candle[], fast = 12, slow = 26, signalPeriod = 9): MacdSeries => {
  const fastEma = ema(candles, fast);
  const slowEma = ema(candles, slow);
  const slowIndex = new Map(slowEma.map((p) => [p.time, p.value]));

  const macdLine: LinePoint[] = [];
  for (const point of fastEma) {
    const slowValue = slowIndex.get(point.time);
    if (slowValue !== undefined) macdLine.push({ time: point.time, value: point.value - slowValue });
  }

  const signal: LinePoint[] = [];
  if (macdLine.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let prev = macdLine.slice(0, signalPeriod).reduce((a, p) => a + p.value, 0) / signalPeriod;
    signal.push({ time: macdLine[signalPeriod - 1].time, value: prev });
    for (let i = signalPeriod; i < macdLine.length; i++) {
      prev = macdLine[i].value * k + prev * (1 - k);
      signal.push({ time: macdLine[i].time, value: prev });
    }
  }

  const signalIndex = new Map(signal.map((p) => [p.time, p.value]));
  const histogram = macdLine
    .filter((p) => signalIndex.has(p.time))
    .map((p) => ({ time: p.time, value: p.value - (signalIndex.get(p.time) as number) }));

  return { macd: macdLine, signal, histogram };
};

export type IndicatorId = 'sma20' | 'sma50' | 'ema20' | 'vwap' | 'bollinger' | 'rsi' | 'macd';

export const INDICATOR_LABELS: Record<IndicatorId, string> = {
  sma20: 'SMA 20',
  sma50: 'SMA 50',
  ema20: 'EMA 20',
  vwap: 'VWAP',
  bollinger: 'Bollinger Bands',
  rsi: 'RSI 14',
  macd: 'MACD',
};

/** Indicators drawn in their own pane rather than on the price scale. */
export const PANE_INDICATORS: IndicatorId[] = ['rsi', 'macd'];
