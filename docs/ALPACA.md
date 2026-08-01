# Alpaca setup and tooling

## Credentials

`trading_engine/.env` (gitignored) holds the only copy:

```
ALPACA_API_KEY=...
ALPACA_API_SECRET=...
ALPACA_API_BASE_URL=https://paper-api.alpaca.markets
ALPACA_DATA_FEED=iex
```

**Both** values are required. With only one set, `AlpacaService` stays unconfigured
and every bar request comes back empty — which surfaced as "No bars returned for
\<symbol\>" on the chart.

## The feed matters

Free Alpaca accounts have IEX data only. Requesting the SIP feed without a market-data
subscription fails the whole request, so `ALPACA_DATA_FEED` defaults to `iex`. Set it to
`sip` only if the account has the paid subscription.

## CLI

`alpaca-cli` (`pip install alpaca-cli`) is a fast way to check the account and data
independently of Django — when the chart is empty, this tells you whether the problem is
your credentials or our code.

Use the wrapper, which reads the same `.env` so the secret is not duplicated:

```bash
./scripts/alpaca config verify                        # credentials + connectivity
./scripts/alpaca quote AAPL                           # latest quote
./scripts/alpaca data stock bars AAPL -t 1Day --limit 5
./scripts/alpaca data stock bars AAPL -t 1Week --limit 260 --feed iex
./scripts/alpaca clock                                # is the market open
./scripts/alpaca status                               # account status
./scripts/alpaca data screeners movers                # top movers
./scripts/alpaca data news AAPL                       # headlines
./scripts/alpaca data stock stream AAPL               # live trades/quotes
```

### Where it helps this project

- **Diagnosis.** `config verify` and `data stock bars` isolate credential/subscription
  problems from application bugs in seconds.
- **Reference for endpoints we have not used yet.** `screeners movers` and `actives` back
  the planned stock screener; `news` backs a headlines panel; `corporate-actions` gives
  splits and dividends, which a 5-year chart needs to avoid phantom price gaps.
- **Fixture capture.** Piping `data stock bars` output into JSON gives deterministic test
  data, so tests do not depend on the live API.

## Verified working

Checked against the live API on 2026-08-01:

| Timeframe | Bars | Range |
|---|---|---|
| 1Week, limit 260 | 260 | 2021-08 → 2026-07 (5 years) |
| 1Day, limit 260 | 260 | 2025-07 → 2026-07 |
| 1Hour, limit 160 | 160 | 2026-07-06 → 2026-07-31 |
| 5Min, limit 78 | 78 | intraday |

## Gotcha: `limit` counts from the start of the window

Alpaca applies `limit` from the beginning of the requested range, so an ascending request
returns the *oldest* N bars and the chart stops short of today. `get_stock_bars` requests
`sort=DESC` when no explicit `start` is given and reverses the result, so a bar count
always means "the most recent N".
