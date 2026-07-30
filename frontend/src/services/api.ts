import axios from 'axios';
import type { Asset, Order, Portfolio, Position, Trade, OrderBookData } from '../types';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

export const apiService = {
    getAssets: async (): Promise<Asset[]> => {
        const response = await api.get('/assets/');
        return response.data.results || response.data;
    },

    getPortfolio: async (): Promise<Portfolio> => {
        const response = await api.get('/portfolios/');
        if (Array.isArray(response.data.results)) {
            return response.data.results[0];
        }
        return response.data;
    },

    getPositions: async (): Promise<Position[]> => {
        const response = await api.get('/positions/');
        return response.data.results || response.data;
    },

    createOrder: async (order: Partial<Order>): Promise<Order> => {
        const response = await api.post('/orders/', order);
        return response.data;
    },

    getTrades: async (ticker?: string): Promise<Trade[]> => {
        const url = ticker ? `/trades/?ticker=${ticker}&limit=100` : '/trades/?limit=100';
        const response = await api.get(url);
        return response.data.results || response.data;
    },
    
    getOrderBook: async (ticker: string): Promise<OrderBookData> => {
        const response = await api.get(`/orderbooks/by_ticker/?ticker=${ticker}`);
        return response.data;
    },
};

export default apiService;
