/**
 * API Service Layer
 * Handles all HTTP requests to the Django backend with JWT authentication
 */

const API_BASE_URL = 'http://localhost:8000';

// ==================== Type Definitions ====================

interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Portfolio {
  id: number;
  user: number;
  user_username?: string;
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
  total_value: string;
  unrealized_pnl: string;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: number;
  order: number;
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
  timestamp: string;
  asset_ticker?: string;
}

export interface Order {
  id: number;
  portfolio: number;
  asset: number;
  asset_ticker?: string;
  side: 'BUY' | 'SELL';
  order_type: 'LIMIT' | 'MARKET' | 'STOP_LOSS';
  price: string;
  size: string;
  filled_size: string;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  ticker: string;
  name: string;
  asset_type?: string;
  exchange?: string;
  is_tradable?: boolean;
  current_price?: string | number;
  bid_price?: string | number;
  ask_price?: string | number;
  bid_size?: number;
  ask_size?: number;
  price_change?: string | number;
  price_change_percent?: string | number;
  description?: string;
}

export interface Backtest {
  id: number;
  user: number;
  name: string;
  strategy_code: string;
  start_date: string;
  end_date: string;
  initial_capital: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  results?: {
    total_return: string;
    total_return_percent: string;
    sharpe_ratio: string;
    max_drawdown: string;
    win_rate: string;
    total_trades: number;
  };
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.access;
    this.refreshToken = tokens.refresh;
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
  }

  /**
   * Clear authentication tokens
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.access;
        localStorage.setItem('access_token', data.access);
        return true;
      }

      this.clearTokens();
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // If unauthorized, try refreshing token
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle empty responses (like 204 No Content from DELETE)
      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ==================== Authentication ====================

  async login(username: string, password: string): Promise<AuthTokens> {
    const data = await this.request<AuthTokens>('/api/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setTokens(data);
    return data;
  }

  logout() {
    this.clearTokens();
  }

  // ==================== Assets ====================

  async getAssets(): Promise<PaginatedResponse<Asset>> {
    return this.request<PaginatedResponse<Asset>>('/api/assets/');
  }

  async getAsset(id: number): Promise<Asset> {
    return this.request<Asset>(`/api/assets/${id}/`);
  }

  async createAsset(assetData: {
    ticker: string;
    name: string;
    description: string;
  }): Promise<Asset> {
    return this.request<Asset>('/api/assets/', {
      method: 'POST',
      body: JSON.stringify(assetData),
    });
  }

  async deleteAsset(id: number): Promise<void> {
    return this.request<void>(`/api/assets/${id}/`, {
      method: 'DELETE',
    });
  }

  async getMarketData(): Promise<Asset[]> {
    return this.request<Asset[]>('/api/assets/market_data/');
  }

  // ==================== Orders ====================

  async getOrders(): Promise<PaginatedResponse<Order>> {
    return this.request<PaginatedResponse<Order>>('/api/orders/');
  }

  async createOrder(orderData: {
    asset: number;
    side: 'BUY' | 'SELL';
    order_type: 'LIMIT' | 'MARKET' | 'STOP_LOSS';
    price: string;
    size: string;
  }): Promise<Order> {
    return this.request<Order>('/api/orders/', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async cancelOrder(id: number): Promise<Order> {
    return this.request<Order>(`/api/orders/${id}/cancel/`, {
      method: 'POST',
    });
  }

  // ==================== Portfolio ====================

  async getCurrentPortfolio(): Promise<Portfolio> {
    return this.request<Portfolio>('/api/portfolios/current/');
  }

  async getPortfolios(): Promise<PaginatedResponse<Portfolio>> {
    return this.request<PaginatedResponse<Portfolio>>('/api/portfolios/');
  }

  async getPortfolioPerformance(): Promise<any> {
    return this.request<any>('/api/portfolios/performance/');
  }

  // ==================== Positions ====================

  async getPositions(): Promise<PaginatedResponse<Position>> {
    return this.request<PaginatedResponse<Position>>('/api/positions/');
  }

  async getPosition(id: number): Promise<Position> {
    return this.request<Position>(`/api/positions/${id}/`);
  }

  // ==================== Trades ====================

  async getTrades(): Promise<PaginatedResponse<Trade>> {
    return this.request<PaginatedResponse<Trade>>('/api/trades/');
  }

  async getTradeHistory(): Promise<Trade[]> {
    return this.request<Trade[]>('/api/trades-list/');
  }

  // ==================== Risk Limits ====================

  async getRiskLimits(): Promise<any> {
    return this.request<any>('/api/risk-limits/');
  }

  async updateRiskLimits(id: number, data: any): Promise<any> {
    return this.request<any>(`/api/risk-limits/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== Backtesting ====================

  async getBacktests(): Promise<PaginatedResponse<Backtest>> {
    return this.request<PaginatedResponse<Backtest>>('/api/backtests/');
  }

  async createBacktest(data: {
    name: string;
    strategy_code: string;
    start_date: string;
    end_date: string;
    initial_capital: string;
  }): Promise<Backtest> {
    return this.request<Backtest>('/api/backtests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBacktest(id: number): Promise<Backtest> {
    return this.request<Backtest>(`/api/backtests/${id}/`);
  }

  async runBacktest(id: number): Promise<Backtest> {
    return this.request<Backtest>(`/api/backtests/${id}/run/`, {
      method: 'POST',
    });
  }

  // ==================== Audit Logs ====================

  async getAuditLogs(): Promise<any> {
    return this.request<any>('/api/audit-logs/');
  }

  // ==================== OrderBooks ====================

  async getOrderBooks(): Promise<any> {
    return this.request<any>('/api/orderbooks/');
  }

  async getOrderBook(ticker: string): Promise<any> {
    return this.request<any>(`/api/orderbooks/?asset__ticker=${ticker}`);
  }
}

export const apiService = new ApiService();
export default apiService;
