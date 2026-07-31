# Trading Platform — Implementation Plan

Goal: a TradingView-class analysis and simulated-trading terminal on top of the existing
Django/Channels backend, built to demonstrate real-time data streaming competence to employers.

## 0. What already exists

Backend (`trading_engine/`) is substantial and stays:

| Area | Status |
|---|---|
| Models | `Asset`, `Order`, `OrderBook`, `Trade`, `Portfolio`, `Position`, `RiskLimit`, `AuditLog`, `BacktestRun`, `BacktestResult`, `LiveBot` |
| REST | DRF router: `assets`, `orders`, `orderbooks`, `portfolios`, `positions`, `trades`, `risk-limits`, `audit-logs`, `backtests` + JWT auth |
| Key actions | `assets/chart_data`, `assets/market_data`, `orderbooks/by_ticker`, `orderbooks/{id}/depth`, `orders/{id}/cancel`, `portfolios/current`, `portfolios/performance`, `positions/summary`, `trades/statistics`, `backtests/{id}/run`, `backtests/{id}/results` |
| WebSockets | `ws/market-data/`, `ws/stream/`, `ws/orderbook/<ticker>/` |
| Services | Alpaca client, matching engine, backtesting engine, bot engine, risk management, audit logger |

Frontend was a Vite + React SPA (~2.8k LOC). It is replaced by a Next.js app in this plan.

## 1. Target architecture

```
frontend/                      Next.js 15 App Router, TS strict, Tailwind v4
  src/app/                     routes: /, /terminal, /backtest, /learn
  src/components/
    layout/                    Shell, TopBar, Watchlist, DockPanel, ResizeHandle
    chart/                     ChartCanvas, indicator + drawing overlays, timeframe bar
    market/                    OrderBook (L2, depth bars), TimeAndSales, DepthChart
    trading/                   OrderTicket, Positions, Portfolio, OrdersTable
    strategy/                  PythonEditor (Monaco), StrategyOutput, BacktestReport
    ui/                        primitives (Button, Tabs, Modal, Command palette)
  src/store/                   Zustand slices: layout, symbol, market, trading, strategy, prefs
  src/lib/                     api client, WS manager, formatters, keymap, indicators
  src/types/                   API-mirroring types
```

State rules:
- Zustand for UI/session state (layout geometry, active symbol, favorites, panel tabs).
- WebSocket data flows into a dedicated `market` slice via a single connection manager — never
  one socket per component.
- Server data (portfolio, orders, backtests) is fetched through the typed API client; components
  never call `fetch` directly.
- Layout state persists to `localStorage` so a reload restores the user's workspace.

## 2. Phases

### Phase 1 — Terminal shell (delivered)
Collapsible watchlist sidebar, top nav with symbol search, chart area at 65% of viewport width,
resizable right column (order book + time & sales), draggable/resizable bottom dock with tabs:
Python editor, logs, portfolio, positions, strategy output. Docking, drag-resize, keyboard
shortcuts, dark/light theme, Framer Motion transitions.

### Phase 2 — Charting depth
- Candles/line/area/bars/Heikin-Ashi via `lightweight-charts`.
- Indicators: SMA, EMA, VWAP, RSI, MACD, Bollinger, ATR, volume profile.
- Drawing tools: trendline, horizontal ray, fib retracement, rectangle, text; persisted per symbol.
- Multi-chart layouts (1/2/4 panes) with linked crosshair and synced timeframe.
- Compare mode (overlay a second symbol normalised to %).

### Phase 3 — 5-year history / backlog replay
Backend gap: `assets/chart_data` proxies Alpaca live and stores nothing, so deep history is
slow and rate-limited. Fix:

1. New model `Candle(asset, timeframe, ts, open, high, low, close, volume)` with
   `unique_together (asset, timeframe, ts)` and an index on `(asset, timeframe, ts)`.
2. Management command `backfill_candles --ticker AAPL --years 5 --timeframe 1Day,1Hour,5Min`
   pulling from Alpaca in pages and bulk-upserting.
3. `GET /api/assets/candles/?ticker=&timeframe=&from=&to=&limit=` served from the DB, falling
   back to Alpaca only on a cache miss for recent bars.
4. Replay endpoint: `ws/replay/<ticker>/` streaming stored candles + synthesised tick sequence at
   1x–100x speed, driven by client `play/pause/seek/speed` messages. This is the feature that
   shows streaming skill — same consumer contract as live, so the UI code path is identical.

### Phase 4 — Paper trading simulation
- `Portfolio` already carries cash/buying power; add `mode` field (`PAPER` | `SIM_REPLAY`).
- Order submission routes through `matching_engine`; for symbols with no local liquidity, fill
  against the Alpaca NBBO snapshot with configurable slippage and latency.
- Publish every fill to `ws/stream/` so the order book, time & sales, positions, and P&L all
  update live from one event source.
- Reset button: wipe positions/orders, restore starting cash — makes the demo repeatable.

### Phase 5 — Python bot authoring + backtesting
- Editor already has Monaco; add a strategy template library and a schema-documented API
  (`on_bar(ctx)`, `ctx.buy/sell/position/indicators`).
- `POST /api/backtests/` + `/run` exist — extend to accept ticker, timeframe, and date range,
  and run in a worker (Celery or `run_in_executor`) rather than the request thread.
- Stream progress and log lines over `ws/stream/` into the Logs and Strategy Output tabs.
- Report: equity curve vs buy-and-hold, drawdown chart, trade list, Sharpe/win-rate/profit-factor
  (all already computed in `BacktestResult`).
- Promote a backtested strategy to a `LiveBot` running against the paper market.
  Backend gap: `LiveBot` has no viewset — add `LiveBotViewSet` with `start`/`stop`/`logs`.

**Sandboxing is mandatory** before any deployment: user Python must run with restricted builtins,
no imports outside an allowlist, a CPU/wall-clock cap, and a memory cap — ideally in a separate
process or container, not the web worker.

### Phase 6 — Order book microstructure view
- Full L2 ladder with cumulative depth bars, spread, imbalance ratio.
- Depth chart (bid/ask cumulative curves).
- Tape with aggressor-side colouring, large-print highlighting, and per-trade flash animation.
- Heatmap of resting liquidity over time — visually the strongest proof of streaming work.

### Phase 7 — Teaching layer
- `/learn`: short lessons (candlestick anatomy, support/resistance, RSI divergence, order book
  imbalance, risk sizing) each with a live mini-chart on the user's current symbol.
- Contextual coach: when an indicator crosses or a pattern triggers, an inline card explains what
  it means and what a trader might do — text is static, the trigger is live data.
- Trade journal: every simulated trade gets an auto-generated critique (entry vs signal, position
  size vs risk limit, holding period vs plan).

### Phase 8 — Production hardening
- JWT login page, refresh interception, per-user layouts.
- Redis channel layer for Channels (currently in-memory in dev), gunicorn/uvicorn behind nginx.
- Rate limiting on Alpaca-backed endpoints; response caching for candles.
- Playwright smoke test of the terminal; pytest coverage on new endpoints.
- Dockerfile + compose (web, worker, redis, postgres) and a seeded demo account so an employer
  can run one command.

## 3. Backend work items, ordered

1. `Candle` model + `backfill_candles` command + `assets/candles` endpoint.
2. `ws/replay/<ticker>/` consumer.
3. `LiveBotViewSet` (`start`, `stop`, `logs`) registered in the router.
4. Watchlist/favorites + alerts models (`Watchlist`, `PriceAlert`) — currently client-only.
5. Screener endpoint over stored candles (`% change`, volume, RSI, market cap filters).
6. Backtest execution moved off the request thread + progress events.
7. Strategy sandbox.
8. Redis channel layer, Docker compose, seeded demo user.

## 4. Sequencing advice

Do 1–2 before anything else: deep history plus replay unlocks charting, backtesting, and the
"watch the book move" demo at once, and it is the part employers actually read as streaming work.
Ship the terminal shell (done), then history, then replay, then paper fills, then bots, then the
teaching layer. Keep every real-time surface on the single `ws/stream/` event bus so adding a
feature never means adding a socket.
