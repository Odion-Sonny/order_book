/**
 * API Service Layer
 * Handles all HTTP requests to the Django backend with JWT authentication
 */

const API_BASE_URL = 'http://localhost:8000';

interface AuthTokens {
  access: string;
  refresh: string;
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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
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

  async getAssets() {
    return this.request('/api/assets/');
  }

  async getAsset(id: number) {
    return this.request(`/api/assets/${id}/`);
  }

  async getMarketData() {
    return this.request('/api/assets/market_data/');
  }

  // ==================== Orders ====================

  async getOrders() {
    return this.request('/api/orders/');
  }

  async createOrder(orderData: {
    asset: number;
    side: 'BUY' | 'SELL';
    order_type: 'LIMIT' | 'MARKET' | 'STOP_LOSS';
    price: string;
    size: string;
  }) {
    return this.request('/api/orders/', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async cancelOrder(id: number) {
    return this.request(`/api/orders/${id}/cancel/`, {
      method: 'POST',
    });
  }

  // ==================== Portfolio ====================

  async getCurrentPortfolio() {
    return this.request('/api/portfolios/current/');
  }

  async getPortfolios() {
    return this.request('/api/portfolios/');
  }

  async getPortfolioPerformance() {
    return this.request('/api/portfolios/performance/');
  }

  // ==================== Positions ====================

  async getPositions() {
    return this.request('/api/positions/');
  }

  async getPosition(id: number) {
    return this.request(`/api/positions/${id}/`);
  }

  // ==================== Trades ====================

  async getTrades() {
    return this.request('/api/trades/');
  }

  async getTradeHistory() {
    return this.request('/api/trades-list/');
  }

  // ==================== Risk Limits ====================

  async getRiskLimits() {
    return this.request('/api/risk-limits/');
  }

  async updateRiskLimits(id: number, data: any) {
    return this.request(`/api/risk-limits/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== Backtesting ====================

  async getBacktests() {
    return this.request('/api/backtests/');
  }

  async createBacktest(data: {
    name: string;
    strategy_code: string;
    start_date: string;
    end_date: string;
    initial_capital: string;
  }) {
    return this.request('/api/backtests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBacktest(id: number) {
    return this.request(`/api/backtests/${id}/`);
  }

  async runBacktest(id: number) {
    return this.request(`/api/backtests/${id}/run/`, {
      method: 'POST',
    });
  }

  // ==================== Audit Logs ====================

  async getAuditLogs() {
    return this.request('/api/audit-logs/');
  }

  // ==================== OrderBooks ====================

  async getOrderBooks() {
    return this.request('/api/orderbooks/');
  }

  async getOrderBook(ticker: string) {
    return this.request(`/api/orderbooks/?asset__ticker=${ticker}`);
  }
}

export const apiService = new ApiService();
export default apiService;
