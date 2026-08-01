'use client';

import { create } from 'zustand';
import { api, getToken } from '@/lib/api';
import { log } from './logStore';
import type { Order, OrderSide, OrderType, Portfolio, Position } from '@/types';

interface TradingState {
  portfolio: Portfolio | null;
  positions: Position[];
  orders: Order[];
  loading: boolean;
  submitting: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  submitOrder: (input: {
    ticker: string;
    side: OrderSide;
    type: OrderType;
    price: number;
    size: number;
  }) => Promise<boolean>;
  cancelOrder: (id: number) => Promise<void>;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  portfolio: null,
  positions: [],
  orders: [],
  loading: false,
  submitting: false,
  error: null,

  refresh: async () => {
    // Every trading endpoint is IsAuthenticated; calling them signed out just
    // produces a burst of 401s in the console and the server log.
    if (!getToken()) {
      set({ portfolio: null, positions: [], orders: [], loading: false });
      return;
    }

    set({ loading: true });
    const [portfolio, positions, orders] = await Promise.all([
      api.portfolio().catch(() => null),
      api.positions().catch(() => []),
      api.orders().catch(() => []),
    ]);
    set({ portfolio, positions, orders, loading: false });
  },

  submitOrder: async ({ ticker, side, type, price, size }) => {
    set({ submitting: true, error: null });
    try {
      const order = await api.createOrder({
        asset: ticker,
        side,
        order_type: type,
        price,
        size,
      });
      log('success', 'orders', `${side} ${size} ${ticker} @ ${type === 'MARKET' ? 'MKT' : price}`);
      set((s) => ({ orders: [order, ...s.orders], submitting: false }));
      void get().refresh();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Order rejected';
      set({ error: message, submitting: false });
      log('error', 'orders', message);
      return false;
    }
  },

  cancelOrder: async (id) => {
    try {
      await api.cancelOrder(id);
      log('info', 'orders', `Cancelled order #${id}`);
      void get().refresh();
    } catch (err) {
      log('error', 'orders', err instanceof Error ? err.message : `Cancel #${id} failed`);
    }
  },
}));
