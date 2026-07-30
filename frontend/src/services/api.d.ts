import type { Asset, Order, Portfolio, Position, Trade, OrderBookData } from '../types';
export declare const apiService: {
    getAssets: () => Promise<Asset[]>;
    getPortfolio: () => Promise<Portfolio>;
    getPositions: () => Promise<Position[]>;
    createOrder: (order: Partial<Order>) => Promise<Order>;
    getTrades: (ticker?: string) => Promise<Trade[]>;
    getOrderBook: (ticker: string) => Promise<OrderBookData>;
};
export default apiService;
