/** Types mirroring the Django `order_book` API contract. */

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LOSS';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface Asset {
  id: number;
  name: string;
  ticker: string;
  description?: string;
}

/** Shape returned by `GET /api/assets/market_data/`. */
export interface MarketSnapshot extends Asset {
  current_price: number;
  price_change: number;
  price_change_percent: number;
  bid_price: number;
  ask_price: number;
  bid_size: number;
  ask_size: number;
  chart_data?: Bar[];
}

/** Bar as returned by Alpaca through `assets/chart_data`. */
export interface Bar {
  t?: string;
  timestamp?: string;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

/** Normalised candle used everywhere in the UI. */
export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookData {
  ticker: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  last_price: number;
  market_data?: {
    bid_price?: number;
    ask_price?: number;
    bid_size?: number;
    ask_size?: number;
  };
}

export interface Order {
  id: number;
  asset: number | string;
  asset_ticker?: string;
  price: string | number;
  size: string | number;
  order_type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  created_at: string;
  executed_at?: string | null;
}

/**
 * `/trades/` (user fills) and `/trades-list/` (public tape) return slightly
 * different shapes: executed_at vs timestamp, asset_ticker vs asset.
 */
export interface Trade {
  id: number | string;
  asset?: number | string;
  asset_ticker?: string;
  ticker?: string;
  price: string | number;
  size: string | number;
  executed_at?: string;
  timestamp?: string;
  side?: OrderSide;
}

export interface Portfolio {
  id: number;
  cash_balance: string | number;
  buying_power: string | number;
  total_value?: string | number;
  pnl?: string | number;
}

export interface Position {
  id: number;
  asset?: number;
  asset_ticker?: string;
  ticker?: string;
  quantity: string | number;
  average_cost: string | number;
  current_price: string | number;
  unrealized_pnl?: string | number;
  pnl_percent?: string | number;
}

export interface BacktestRun {
  id: number;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  start_date: string;
  end_date: string;
  initial_capital: string | number;
  created_at: string;
  error_message?: string;
}

/** One fill recorded by `BacktestEngine` (services/backtesting_engine.py). */
export interface BacktestTrade {
  timestamp?: string;
  symbol?: string;
  side?: 'BUY' | 'SELL';
  price?: number | string;
  quantity?: number | string;
  value?: number | string;
}

/** Equity samples are `{date, equity}`; older runs may carry `value`. */
export interface EquityPoint {
  date?: string;
  equity?: number;
  value?: number;
}

export interface BacktestResult {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_return: string | number;
  total_return_percent: string | number;
  sharpe_ratio: string | number;
  max_drawdown_percent: string | number;
  win_rate: string | number;
  profit_factor: string | number;
  equity_curve: Array<EquityPoint | number>;
  trades_data: BacktestTrade[];
}

export type Timeframe = '1Min' | '5Min' | '15Min' | '1Hour' | '4Hour' | '1Day' | '1Week';

export interface LogEntry {
  id: string;
  ts: number;
  level: 'info' | 'warn' | 'error' | 'success';
  source: string;
  message: string;
}
