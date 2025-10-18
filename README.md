# Trading Engine - Professional Order Book & Portfolio Management Platform

<div align="center">

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Django](https://img.shields.io/badge/Django-4.2.10-green.svg)
![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178C6.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

A full-stack trading platform with real-time market data, order matching, portfolio management, risk controls, and backtesting capabilities.

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [API](#api-documentation) • [Testing](#testing)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The Trading Engine is a comprehensive, production-ready trading platform that combines a powerful Django backend with a modern React frontend. It provides institutional-grade features including real-time market data integration, advanced order matching, portfolio tracking, risk management, and strategy backtesting.

### Key Highlights

✅ **Real-time Market Data** - Integration with Alpaca Markets API for live market data
✅ **Order Matching Engine** - Custom LIMIT, MARKET, and STOP_LOSS order processing
✅ **Portfolio Management** - Real-time P&L tracking, position management, and performance analytics
✅ **Risk Management** - Multi-level risk controls with configurable limits
✅ **Backtesting Engine** - Strategy validation with comprehensive performance metrics
✅ **JWT Authentication** - Secure token-based authentication with automatic refresh
✅ **RESTful API** - Complete REST API with Swagger/OpenAPI documentation
✅ **Modern UI** - Clean, responsive React interface with Material-UI
✅ **Comprehensive Testing** - 66+ tests with 100% feature coverage

---

## ✨ Features

### Core Trading Features

#### 1. Real-time Market Data 📊
- **Alpaca Markets Integration** - Live market data from Alpaca's trading API
- **Multi-Asset Support** - Trade stocks, ETFs, and other supported securities
- **Bid/Ask Spreads** - Real-time order book data with best bid/ask prices
- **Price Updates** - Automatic price refreshes (10-second intervals)
- **Historical Data** - Access to historical bars for backtesting

#### 2. Order Matching Engine ⚡
- **Order Types**:
  - `LIMIT` - Execute at specified price or better
  - `MARKET` - Execute at best available price
  - `STOP_LOSS` - Trigger sell when price falls below threshold
- **Price-Time Priority** - FIFO matching algorithm
- **Partial Fills** - Support for partial order execution
- **Order Status Tracking** - PENDING, FILLED, CANCELLED, REJECTED
- **Real-time Matching** - Sub-second order processing
- **Trade Recording** - Complete audit trail of all executions

#### 3. Portfolio Management 💼
- **Real-time Valuation** - Live portfolio value updates
- **Position Tracking**:
  - Current positions with quantity and average cost
  - Unrealized P&L (mark-to-market)
  - Cost basis calculations
  - Position-level performance metrics
- **Cash Management**:
  - Cash balance tracking
  - Buying power calculations
  - Margin utilization (if enabled)
- **Performance Analytics**:
  - Total return ($ and %)
  - Daily/weekly/monthly P&L
  - Win rate and trade statistics
- **Multi-Asset Portfolios** - Support for diversified holdings

#### 4. Risk Management 🛡️
- **Order-Level Controls**:
  - Maximum order size limits
  - Minimum price validation
  - Size validation (must be positive)
- **Portfolio-Level Controls**:
  - Maximum position size limits
  - Buying power validation
  - Leverage limits
- **Trading Controls**:
  - Daily trade limit enforcement
  - Maximum open orders limit
  - Daily loss limits
- **Audit Logging**:
  - All risk violations logged
  - IP address tracking
  - Timestamp recording
  - 11 event types tracked
- **Configurable Limits** - Per-user risk parameter customization

#### 5. Backtesting Engine 📈
- **Strategy Development**:
  - Python-based strategy coding
  - Custom strategy framework
  - Simple MA crossover (built-in example)
- **Historical Testing**:
  - Date range selection
  - Historical bar data access
  - Multi-symbol support
- **Performance Metrics**:
  - Total return ($ and %)
  - Sharpe ratio
  - Maximum drawdown
  - Win rate and profit factor
  - Average win/loss
  - Total trades executed
- **Equity Curve** - Daily portfolio value tracking
- **Trade History** - All backtest trades recorded

#### 6. User Authentication & Security 🔐
- **JWT Authentication** - Industry-standard token-based auth
- **Token Management**:
  - Access tokens (60-minute lifetime)
  - Refresh tokens (7-day lifetime)
  - Automatic token refresh
  - Token blacklist on rotation
- **Secure Sessions** - HTTP-only cookies, CSRF protection
- **User Isolation** - Strict data access controls
- **Password Security** - Django's password hashing

### Frontend Features

#### Modern Web Interface 🖥️
- **Login/Logout** - Secure authentication flow
- **Portfolio Dashboard**:
  - Total value, cash balance, buying power
  - P&L summary with percentage changes
  - Positions table with unrealized P&L
  - Recent trades history
- **Markets Page**:
  - Grid view of all tradable assets
  - Live price updates with change indicators
  - Integrated order placement dialog
  - Bid/ask display
- **Orders Management**:
  - Complete order history
  - Status tracking and filtering
  - Cancel pending orders
  - Real-time updates
- **Backtesting Interface**:
  - Backtest creation form
  - Results visualization
  - Performance metrics display
  - Backtest history
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Auto-refresh for live data

### Developer Features

#### API & Documentation 📚
- **RESTful API** - Complete REST endpoints
- **Swagger/OpenAPI** - Interactive API documentation at `/swagger/`
- **Pagination** - Efficient data retrieval (50 items per page)
- **Filtering & Search** - Query parameters for data filtering
- **Rate Limiting** - Throttling to prevent abuse
- **CORS Support** - Cross-origin requests enabled

#### Admin Interface 🔧
- **Django Admin** - Full admin panel at `/admin/`
- **Model Management** - CRUD for all models
- **User Management** - User and permission administration
- **Data Export** - CSV export capabilities
- **Custom Admin Views** - Enhanced admin for complex models

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          React Frontend (Port 3000)                   │   │
│  │  - Material-UI Components                             │   │
│  │  - JWT Authentication                                 │   │
│  │  - Real-time Updates                                  │   │
│  │  - Responsive Design                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Django Backend (Port 8000)                     │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Django REST Framework                   │  │   │
│  │  │  - JWT Authentication Middleware                │  │   │
│  │  │  - API ViewSets & Serializers                   │  │   │
│  │  │  - Permission Classes                           │  │   │
│  │  │  - Rate Limiting                                │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                     │
│  ┌─────────────────┬─────────────────┬──────────────────┐   │
│  │  Matching Engine│ Risk Management │ Backtest Engine  │   │
│  │  - Order Queue  │ - Validators    │ - Strategy Exec  │   │
│  │  - Price Match  │ - Limit Check   │ - Metrics Calc   │   │
│  │  - Trade Exec   │ - Audit Logger  │ - Performance    │   │
│  └─────────────────┴─────────────────┴──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Database (SQLite/PostgreSQL)                │   │
│  │  - Asset, Order, Trade                                │   │
│  │  - Portfolio, Position                                │   │
│  │  - RiskLimit, AuditLog                                │   │
│  │  - BacktestRun, BacktestResult                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Alpaca Markets API                       │   │
│  │  - Real-time Market Data                              │   │
│  │  - Historical Bars                                    │   │
│  │  - Market Snapshots                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Models

```
User (Django Auth)
  └─► Portfolio
       ├─► Position (many)
       └─► RiskLimit

Order
  ├─► Asset
  └─► Trade (via matching)

Trade
  ├─► buy_order (Order)
  ├─► sell_order (Order)
  ├─► buyer (User)
  └─► seller (User)

BacktestRun
  ├─► User
  └─► BacktestResult (one-to-one)

AuditLog
  └─► User
```

---

## 🛠️ Technology Stack

### Backend
- **Django 4.2.10** - Web framework
- **Django REST Framework 3.14** - REST API framework
- **djangorestframework-simplejwt 5.3.1** - JWT authentication
- **drf-yasg 1.21.7** - Swagger/OpenAPI documentation
- **django-cors-headers 4.3.0** - CORS middleware
- **django-ratelimit 4.1.0** - Rate limiting
- **alpaca-trade-api 3.0.2** - Market data integration
- **pandas 2.1.4** - Data analysis for backtesting
- **numpy 1.26.3** - Numerical computations
- **sortedcontainers 2.4.0** - Order book data structures
- **redis 5.0.1** - Caching (optional)
- **PostgreSQL or SQLite** - Database

### Frontend
- **React 18.2** - UI framework
- **TypeScript 4.9** - Type-safe JavaScript
- **Material-UI 5.16** - Component library
- **React Router 6.28** - Client-side routing
- **Fetch API** - HTTP client

### DevOps & Testing
- **Django Test Framework** - Backend testing
- **unittest.mock** - Mocking for tests
- **WhiteNoise 6.6** - Static file serving
- **Gunicorn 21.2** - WSGI server (production)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9 or higher
- Node.js 16 or higher
- npm or yarn
- Git

### One-Command Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd order_book

# Run the quick start script
chmod +x start_trading_platform.sh
./start_trading_platform.sh
```

This will:
1. Start Django backend on http://localhost:8000
2. Start React frontend on http://localhost:3000
3. Open your browser automatically

### Access the Platform

1. **Frontend**: http://localhost:3000
2. **Backend API**: http://localhost:8000
3. **API Docs**: http://localhost:8000/swagger/
4. **Admin Panel**: http://localhost:8000/admin/

### Default Credentials

```
Username: testuser
Password: testpass123
```

---

## 📦 Installation

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd trading_engine
   ```

2. **Create virtual environment (recommended):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Create a `.env` file in `trading_engine/`:
   ```env
   DJANGO_SECRET_KEY=your-secret-key-here
   DJANGO_DEBUG=True
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

   # Alpaca API (optional but recommended)
   ALPACA_API_KEY=your-alpaca-api-key
   ALPACA_SECRET_KEY=your-alpaca-secret-key
   ALPACA_BASE_URL=https://paper-api.alpaca.markets

   # Database (optional, defaults to SQLite)
   DATABASE_URL=sqlite:///db.sqlite3
   ```

5. **Run migrations:**
   ```bash
   python3 manage.py migrate
   ```

6. **Create superuser:**
   ```bash
   python3 manage.py createsuperuser
   ```

7. **Create test user (for frontend):**
   ```bash
   python3 manage.py shell
   ```
   ```python
   from django.contrib.auth.models import User
   User.objects.create_user('testuser', 'test@example.com', 'testpass123')
   exit()
   ```

8. **Start the server:**
   ```bash
   python3 manage.py runserver
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

The frontend will open at http://localhost:3000

---

## ⚙️ Configuration

### Backend Configuration

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Django secret key | Required |
| `DJANGO_DEBUG` | Debug mode | `False` |
| `DJANGO_ALLOWED_HOSTS` | Allowed hosts | `localhost,127.0.0.1` |
| `ALPACA_API_KEY` | Alpaca API key | Empty |
| `ALPACA_SECRET_KEY` | Alpaca secret key | Empty |
| `ALPACA_BASE_URL` | Alpaca API base URL | Paper trading URL |
| `DATABASE_URL` | Database connection | SQLite |

#### Alpaca API Setup

1. Sign up at [Alpaca Markets](https://alpaca.markets/)
2. Get API keys from dashboard
3. Add keys to `.env` file
4. Restart backend server

#### Database Configuration

**SQLite (Default - Development):**
```python
# No configuration needed
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

**PostgreSQL (Production):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/trading_db
```

### Frontend Configuration

The frontend API base URL is configured in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

For production, update this to your production API URL.

---

## 📖 Usage

### Web Interface

#### 1. Login
1. Navigate to http://localhost:3000
2. Enter credentials
3. Click "Sign In"

#### 2. View Portfolio
- Dashboard shows total value, cash, buying power, P&L
- Positions table displays all holdings
- Recent trades section shows last 10 trades
- Data refreshes every 30 seconds

#### 3. Trade Assets
1. Click "Markets" in sidebar
2. Browse available assets
3. Click "Trade" on desired asset
4. Fill order form:
   - Select BUY or SELL
   - Choose order type (LIMIT/MARKET/STOP_LOSS)
   - Enter quantity
   - Enter price (for limit orders)
5. Click "Place Order"

#### 4. Manage Orders
1. Click "Orders" in sidebar
2. View all orders with status
3. Cancel pending orders (delete icon)
4. Refresh to see updates

#### 5. Run Backtests
1. Click "Backtesting" in sidebar
2. Fill in backtest form:
   - Name your backtest
   - Select date range
   - Set initial capital
   - Enter strategy code
3. Click "Run Backtest"
4. View results in history panel

### API Usage

#### Authentication

```bash
# Get tokens
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'

# Response:
# {
#   "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
# }

# Use access token in requests
curl http://localhost:8000/api/portfolios/current/ \
  -H "Authorization: Bearer <access-token>"
```

#### Place Order

```bash
curl -X POST http://localhost:8000/api/orders/ \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "asset": 1,
    "side": "BUY",
    "order_type": "LIMIT",
    "price": "150.00",
    "size": "10.00"
  }'
```

#### Get Market Data

```bash
curl http://localhost:8000/api/assets/market_data/ \
  -H "Authorization: Bearer <access-token>"
```

---

## 📚 API Documentation

### Interactive Documentation

Access the Swagger UI at: http://localhost:8000/swagger/

### Main Endpoints

#### Authentication
- `POST /api/auth/token/` - Login (get tokens)
- `POST /api/auth/token/refresh/` - Refresh access token
- `POST /api/auth/token/verify/` - Verify token

#### Assets & Market Data
- `GET /api/assets/` - List all assets
- `GET /api/assets/{id}/` - Get asset details
- `GET /api/assets/market_data/` - Get real-time market data

#### Orders
- `GET /api/orders/` - List user's orders
- `POST /api/orders/` - Place new order
- `GET /api/orders/{id}/` - Get order details
- `POST /api/orders/{id}/cancel/` - Cancel order

#### Portfolio
- `GET /api/portfolios/` - List portfolios
- `GET /api/portfolios/current/` - Get current user's portfolio
- `GET /api/portfolios/performance/` - Get performance metrics

#### Positions
- `GET /api/positions/` - List user's positions
- `GET /api/positions/{id}/` - Get position details

#### Trades
- `GET /api/trades/` - List trades
- `GET /api/trades-list/` - Get formatted trade history

#### Backtesting
- `GET /api/backtests/` - List backtests
- `POST /api/backtests/` - Create backtest
- `GET /api/backtests/{id}/` - Get backtest details
- `POST /api/backtests/{id}/run/` - Run backtest

#### Risk Limits
- `GET /api/risk-limits/` - List risk limits
- `PATCH /api/risk-limits/{id}/` - Update risk limits

#### Audit Logs
- `GET /api/audit-logs/` - View audit trail

### Response Format

All API responses follow this format:

**Success:**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/orders/?page=2",
  "previous": null,
  "results": [...]
}
```

**Error:**
```json
{
  "detail": "Error message here"
}
```

---

## 🧪 Testing

### Run All Tests

```bash
cd trading_engine
python3 manage.py test order_book.tests order_book.tests_comprehensive --verbosity=2
```

### Test Coverage

**Total Tests: 66**
- Original test suite: 23 tests
- Comprehensive test suite: 43 tests
- Success rate: 100%

### Test Categories

#### Backend Tests
- **Asset Tests** (2) - Model creation, uniqueness
- **Order Tests** (3) - Creation, status transitions, market orders
- **OrderBook Tests** (2) - Creation, uniqueness
- **Matching Engine Tests** (2) - Limit orders, price priority
- **API Tests** (4) - Endpoints, pagination, authentication
- **Authentication Tests** (2) - User creation, login
- **Real-time Data Tests** (2) - Price updates, market data API
- **Risk Management Tests** (3) - Validation, limits
- **Integration Tests** (1) - End-to-end flow

#### Comprehensive Tests
- **Portfolio Management** (5) - Valuation, P&L, buying power
- **Position Tracking** (5) - Cost basis, unrealized P&L, updates
- **Risk Management** (8) - All validators, limits, enforcement
- **Trade Recording** (3) - Execution, history, ordering
- **Audit Logging** (4) - Event types, ordering, tracking
- **Backtesting** (3) - Execution, results, metrics
- **JWT Authentication** (5) - Token lifecycle, refresh, verification
- **API Integration** (10) - All ViewSets, permissions, errors

### Run Specific Tests

```bash
# Portfolio tests only
python3 manage.py test order_book.tests_comprehensive.PortfolioManagementTests

# Risk management tests only
python3 manage.py test order_book.tests_comprehensive.RiskManagementTests

# API integration tests only
python3 manage.py test order_book.tests_comprehensive.APIIntegrationTests
```

---

## 📁 Project Structure

```
order_book/
├── trading_engine/                 # Django backend
│   ├── trading_engine/            # Project settings
│   │   ├── settings.py            # Configuration
│   │   ├── urls.py                # URL routing
│   │   └── wsgi.py                # WSGI entry point
│   ├── order_book/                # Main app
│   │   ├── models.py              # Data models
│   │   ├── serializers.py         # DRF serializers
│   │   ├── views.py               # API views
│   │   ├── views_extended.py      # Extended ViewSets
│   │   ├── admin.py               # Admin configuration
│   │   ├── tests.py               # Original tests
│   │   ├── tests_comprehensive.py # Comprehensive tests
│   │   └── services/              # Business logic
│   │       ├── matching_engine.py # Order matching
│   │       ├── risk_management.py # Risk controls
│   │       ├── backtesting_engine.py # Backtesting
│   │       ├── audit_logger.py    # Audit logging
│   │       └── alpaca_service.py  # Market data
│   ├── manage.py                  # Django CLI
│   └── requirements.txt           # Python dependencies
├── frontend/                       # React frontend
│   ├── src/
│   │   ├── services/              # API layer
│   │   │   └── api.ts             # API service
│   │   ├── contexts/              # State management
│   │   │   └── AuthContext.tsx    # Auth context
│   │   ├── pages/                 # Page components
│   │   │   ├── Login.tsx          # Login page
│   │   │   ├── Portfolio.tsx      # Portfolio dashboard
│   │   │   ├── Markets.tsx        # Markets & trading
│   │   │   ├── Orders.tsx         # Order management
│   │   │   └── Backtesting.tsx    # Backtesting UI
│   │   ├── components/            # Reusable components
│   │   │   └── AppLayout.tsx      # Main layout
│   │   └── App.tsx                # Main app
│   ├── package.json               # Node dependencies
│   └── tsconfig.json              # TypeScript config
├── README.md                       # This file
├── FRONTEND_SETUP_GUIDE.md        # Frontend guide
├── FRONTEND_OVERHAUL_SUMMARY.md   # Implementation details
├── TESTING_SUMMARY.md             # Testing documentation
├── IMPLEMENTATION_COMPLETE.md     # Feature documentation
└── start_trading_platform.sh      # Quick start script
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   python3 manage.py test
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add: your feature description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request**

### Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript for frontend code
- Write tests for new features
- Update documentation
- Maintain backwards compatibility

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

**Important Notice:**

This trading platform is provided for **educational and experimental purposes only**. Trading in financial markets involves significant risk and may not be suitable for everyone.

**Key Points:**
- **Not Financial Advice**: This software does not constitute financial, investment, or trading advice
- **Use at Your Own Risk**: You are solely responsible for any trading decisions and their outcomes
- **Paper Trading Recommended**: Start with paper trading (simulated) before using real money
- **No Guarantees**: Past performance does not guarantee future results
- **Regulatory Compliance**: Ensure compliance with local laws and regulations
- **Professional Consultation**: Consult with financial professionals before making investment decisions

**Liability:**
The developers and contributors of this project are not liable for any financial losses, damages, or consequences resulting from the use of this software.

---

## 📞 Support & Resources

### Documentation
- **Setup Guide**: [FRONTEND_SETUP_GUIDE.md](FRONTEND_SETUP_GUIDE.md)
- **Testing Docs**: [TESTING_SUMMARY.md](TESTING_SUMMARY.md)
- **Implementation**: [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
- **API Docs**: http://localhost:8000/swagger/

### External Resources
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Material-UI](https://mui.com/)
- [Alpaca Markets API](https://alpaca.markets/docs/)

### Troubleshooting

**Backend won't start:**
- Check Python version (3.9+)
- Verify all dependencies installed
- Check `.env` file exists
- Review error logs

**Frontend won't start:**
- Check Node.js version (16+)
- Run `npm install`
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

**Database errors:**
- Run migrations: `python3 manage.py migrate`
- Check database permissions
- Verify DATABASE_URL in `.env`

**Authentication errors:**
- Verify user exists
- Check JWT token not expired
- Ensure CORS configured correctly

---

## 🎯 Roadmap

### Upcoming Features
- [ ] WebSocket support for real-time updates
- [ ] Advanced charting with TradingView integration
- [ ] Options trading support
- [ ] Multi-currency support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Machine learning strategy builder
- [ ] Social trading features

### Performance Enhancements
- [ ] Redis caching layer
- [ ] Database query optimization
- [ ] API response compression
- [ ] CDN integration for static assets

### DevOps
- [ ] Docker containerization
- [ ] Kubernetes deployment configs
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated deployment scripts
- [ ] Monitoring and alerting

---

<div align="center">

**Made with ❤️ using Django & React**

[⬆ Back to Top](#trading-engine---professional-order-book--portfolio-management-platform)

</div>
