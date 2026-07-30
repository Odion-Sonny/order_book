export interface Asset {
  id: string | number;
  name: string;
  ticker: string;
  description: string;
  current_price?: string | number;
  volume_24h?: string | number;
  change_24h?: string | number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  last_price: number;
  ticker: string;
}

export interface Trade {
  id: string;
  asset_ticker: string;
  price: string | number;
  quantity: string | number;
  volume?: string | number;
  side: 'BUY' | 'SELL';
  type: string;
  timestamp: string;
}

export interface ChartData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Portfolio {
  id: number;
  user: number;
  cash_balance: string | number;
  buying_power: string | number;
  total_value: string | number;
}

export interface Position {
  id: number;
  asset: Asset;
  quantity: string | number;
  average_price: string | number;
  current_price?: string | number;
  unrealized_pnl?: string | number;
}

export interface Order {
  id?: string | number;
  asset_ticker: string;
  side: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT';
  price?: number;
  size: number;
  status?: string;
  created_at?: string;
}
