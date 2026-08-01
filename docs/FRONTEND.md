# Frontend — Trading Terminal

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Zustand · Framer Motion ·
lightweight-charts · Monaco.

## Run

```bash
cd frontend
npm install
cp .env.example .env.local     # point at the Django host if it is not localhost:8000
npm run dev                    # http://localhost:3000
```

Backend must be running for data:

```bash
cd trading_engine
daphne -b 127.0.0.1 -p 8000 trading_engine.asgi:application   # REST + WebSockets
python manage.py run_live_stream          # Alpaca -> ws/stream/, during market hours
```

Use `daphne`, not `runserver`: the WebSocket routes need ASGI.

Every price in the terminal is real. There is no simulator and no mock feed: quotes,
bars and prints come from Alpaca, and the order book merges those with orders resting
in this engine's own matching book. Alpaca's free IEX feed is top-of-book only, so the
market side of the ladder is one bid and one ask — depth beyond that is not invented.

Outside market hours the venue publishes little or nothing, so the tape empties and the
book thins out. The top bar carries a **MARKET CLOSED** badge (fed by `/api/market-clock/`)
so a quiet feed is never mistaken for a broken one.

### Drawing tools

The left rail on the chart has trend line, ray, horizontal and vertical lines, rectangle,
Fibonacci retracement, measure, and text. Shortcuts: `T` trend, `H` horizontal, `V`
vertical, `R` rectangle, `A` ray, `M` measure, `N` note, `Alt+F` fib. Drawings anchor to
time and price so they stay put through pan and zoom, snap to candle OHLC when the magnet
is on, and persist per symbol. `Esc` cancels, `Del` removes the selection.

### WSL note

On a `/mnt/c` (drvfs) checkout the native SWC binary crashes the build worker with
`SIGBUS`. Next falls back to the WASM compiler automatically when
`@next/swc-linux-x64-*` is absent — the build is slower but correct, so leave those
packages uninstalled here. Building from a Linux-native path (e.g. `~/`) gets the
native speed back.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ TopBar: search · price · timeframes · ranges · indicators     │
├───────────┬───────────────────────────────┬──────────────────┤
│ Watchlist │ Chart (≈65% of viewport)      │ Order book (L2)  │
│ (dockable)│ candles/bars/line/area        │ ── resize ──     │
│           │ SMA EMA VWAP BB · RSI/MACD    │ Time & Sales     │
├───────────┴───────────────────────────────┴──────────────────┤
│ Bottom dock: Python Editor · Logs · Portfolio · Positions ·   │
│              Strategy Output          (drag top edge to size) │
└──────────────────────────────────────────────────────────────┘
```

Every divider is drag-resizable; double-clicking one collapses that panel. Panel sizes,
theme, favorites, symbol, and strategy code persist to `localStorage`.

## Keyboard

| Keys | Action |
|---|---|
| `Ctrl K` / `/` | Symbol search |
| `Ctrl B` | Toggle watchlist |
| `Ctrl I` | Toggle order book column |
| `Ctrl J` | Toggle bottom dock |
| `Alt 1..5` | Bottom dock tabs |
| `Shift 1..7` | Timeframe |
| `F` | Maximize chart |
| `Ctrl Shift L` | Toggle theme |
| `Ctrl Shift R` | Reset layout |
| `Esc` | Close overlay / restore |

## Data flow

- `src/lib/api.ts` — typed client for the DRF endpoints, JWT-aware, pagination-tolerant.
- `src/lib/ws.ts` — one reconnecting socket per URL shared by all subscribers, exponential
  backoff to 15s. `ws/stream/` carries `bar` and `trade` events; `ws/orderbook/<ticker>/`
  carries `orderbook_update`.
- Zustand slices in `src/store/` — `layout`, `symbol`, `market`, `trading`, `strategy`, `log`.
  Components read state, never sockets.

## Backend endpoints in use

`assets/market_data`, `assets/chart_data`, `orderbooks/by_ticker`, `trades`, `orders`
(+`cancel`), `portfolios/current`, `positions`, `backtests` (+`run`, `results`),
`auth/token`.

Roadmap and backend gaps: [PLATFORM_PLAN.md](./PLATFORM_PLAN.md).
