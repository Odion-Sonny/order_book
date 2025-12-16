export interface Asset {
    id: number;
    ticker: string;
    name: string;
    asset_type: string;
    current_price: string;
    bid_price?: string;
    ask_price?: string;
    price_change?: string;
    price_change_percent?: string;
    volume?: string;
}

export interface Portfolio {
    id: number;
    user: number;
    cash_balance: string;
    total_value: string;
    buying_power: string;
    created_at: string;
    updated_at: string;
}

export interface Position {
    id: number;
    portfolio: number;
    asset: number;
    asset_ticker: string;
    quantity: string;
    average_cost: string;
    current_price: string;
    market_value: string;
    unrealized_pnl: string;
    unrealized_pnl_percent: string;
}

export interface Order {
    id: string; // Changed to match UUID usage
    portfolio: number;
    asset: number;
    asset_ticker: string;
    side: 'BUY' | 'SELL';
    order_type: 'MARKET' | 'LIMIT' | 'STOP';
    quantity: string;
    price?: string;
    status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
    filled_quantity: string;
    created_at: string;
}

export interface Trade {
    id: string; // Changed to string based on usage slice(0,8)
    order_id: string;
    asset_ticker: string;
    price: string;
    quantity: string; // Renamed from size or added
    side: 'BUY' | 'SELL';
    timestamp: string;
}
