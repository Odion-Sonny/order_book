import type {
  Asset,
  BacktestResult,
  BacktestRun,
  Bar,
  Candle,
  MarketSnapshot,
  Order,
  OrderBookData,
  Portfolio,
  Position,
  Timeframe,
  Trade,
} from '@/types';
import { num } from './format';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const BASE = `${API_URL}/api`;

const TOKEN_KEY = 'te.access_token';

export const getToken = (): string | null =>
  typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => undefined);
    }
    throw new ApiError(`${init.method ?? 'GET'} ${path} failed (${res.status})`, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** DRF pagination-tolerant list unwrap. */
function list<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

/** Alpaca bars come back with either short or long keys; normalise both. */
export function toCandle(bar: Bar): Candle {
  const raw = bar.t ?? bar.timestamp ?? '';
  const ms = typeof raw === 'string' ? Date.parse(raw) : Number(raw);
  return {
    time: Math.floor((Number.isFinite(ms) ? ms : Date.now()) / 1000),
    open: num(bar.o ?? bar.open),
    high: num(bar.h ?? bar.high),
    low: num(bar.l ?? bar.low),
    close: num(bar.c ?? bar.close),
    volume: num(bar.v ?? bar.volume),
  };
}

export const api = {
  assets: () => request<unknown>('/assets/').then(list<Asset>),

  marketData: () => request<unknown>('/assets/market_data/').then(list<MarketSnapshot>),

  chartData: async (ticker: string, timeframe: Timeframe, limit = 500): Promise<Candle[]> => {
    const data = await request<{ bars?: Bar[] }>(
      `/assets/chart_data/?ticker=${encodeURIComponent(ticker)}&timeframe=${timeframe}&limit=${limit}`,
    );
    return (data.bars ?? [])
      .map(toCandle)
      .filter((c) => c.close > 0)
      .sort((a, b) => a.time - b.time);
  },

  orderBook: (ticker: string, levels = 12) =>
    request<OrderBookData>(
      `/orderbooks/by_ticker/?ticker=${encodeURIComponent(ticker)}&levels=${levels}`,
    ),

  trades: (ticker?: string, limit = 100) =>
    request<unknown>(
      `/trades/?limit=${limit}${ticker ? `&ticker=${encodeURIComponent(ticker)}` : ''}`,
    ).then(list<Trade>),

  orders: () => request<unknown>('/orders/').then(list<Order>),

  createOrder: (payload: {
    asset: string | number;
    price: number;
    size: number;
    side: 'BUY' | 'SELL';
    order_type: 'LIMIT' | 'MARKET' | 'STOP_LOSS';
  }) => request<Order>('/orders/', { method: 'POST', body: JSON.stringify(payload) }),

  cancelOrder: (id: number) => request<Order>(`/orders/${id}/cancel/`, { method: 'POST' }),

  portfolio: () => request<Portfolio>('/portfolios/current/'),

  positions: () => request<unknown>('/positions/').then(list<Position>),

  backtests: () => request<unknown>('/backtests/').then(list<BacktestRun>),

  createBacktest: (payload: {
    name: string;
    strategy_code: string;
    start_date: string;
    end_date: string;
    initial_capital: number;
  }) => request<BacktestRun>('/backtests/', { method: 'POST', body: JSON.stringify(payload) }),

  runBacktest: (id: number) =>
    request<{ status?: string; message?: string }>(`/backtests/${id}/run/`, { method: 'POST' }),

  backtestResults: (id: number) => request<BacktestResult>(`/backtests/${id}/results/`),

  login: async (username: string, password: string) => {
    const data = await request<{ access: string; refresh: string }>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.access);
    return data;
  },
};
