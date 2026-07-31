export const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

export const money = (v: unknown, digits = 2): string =>
  num(v).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const price = (v: unknown, digits = 2): string =>
  num(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const compact = (v: unknown): string => {
  const n = num(v);
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};

export const pct = (v: unknown, digits = 2): string => {
  const n = num(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
};

export const signed = (v: unknown, digits = 2): string => {
  const n = num(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
};

export const clockTime = (ts: string | number | Date): string =>
  new Date(ts).toLocaleTimeString('en-US', { hour12: false });

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);
