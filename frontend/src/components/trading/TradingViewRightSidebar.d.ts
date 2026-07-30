import React from 'react';
import type { Asset, OrderBookData, Trade, Position, Portfolio } from '../../types';
interface SidebarProps {
    assets: Asset[];
    selectedTicker: string;
    onSelectTicker: (ticker: string) => void;
    orderBook: OrderBookData | null;
    trades: Trade[];
    portfolio: Portfolio | null;
    positions: Position[];
    onPlaceOrder: (side: 'BUY' | 'SELL', type: 'MARKET' | 'LIMIT', price: number, size: number) => Promise<void>;
}
export declare const TradingViewRightSidebar: React.FC<SidebarProps>;
export {};
