import axios from 'axios';
import type { Asset, Order, Portfolio, Position, Trade } from '@/types';

// Use localhost:8000 since we're in dev environment, but in prod this would be relative or env var
const API_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiService = {
    // Assets
    getAssets: async (): Promise<Asset[]> => {
        const response = await api.get('/assets/');
        return response.data.results || response.data;
    },

    getAsset: async (ticker: string): Promise<Asset> => {
        // This likely needs a lookup or filter, assuming standard DRF
        const response = await api.get(`/assets/?ticker=${ticker}`);
        if (Array.isArray(response.data.results) && response.data.results.length > 0) {
            return response.data.results[0];
        }
        return response.data;
    },

    // Portfolio
    getPortfolio: async (): Promise<Portfolio> => {
        // Assuming single user/portfolio for now or first one
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

    // Orders
    getOrders: async (): Promise<Order[]> => {
        const response = await api.get('/orders/');
        return response.data.results || response.data;
    },

    createOrder: async (order: Partial<Order>): Promise<Order> => {
        const response = await api.post('/orders/', order);
        return response.data;
    },

    // Trades
    getTrades: async (): Promise<Trade[]> => {
        const response = await api.get('/trades/');
        return response.data.results || response.data;
    },
};

export default apiService;
