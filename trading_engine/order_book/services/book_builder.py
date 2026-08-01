"""
Order book construction shared by the REST endpoint and the WebSocket consumer.

Both used to build the ladder themselves, and they disagreed about how to merge
resting local orders with venue data.

Everything here is real: resting orders from the matching engine, and top-of-book
from the quote feed. Alpaca's free IEX feed publishes level 1 only, so the market
side is at most one bid and one ask. Depth beyond that is not invented.
"""

import logging
import os
import time
from decimal import Decimal

from django.db.models import Sum

from ..models import Asset, Order, OrderBook
from .alpaca_service import alpaca_service

logger = logging.getLogger(__name__)

# Most recent traded price per symbol, written by the live market stream.
# Quotes stand still when the market is closed, so a tick that just crossed the
# wire is a better mark than a stale quote.
TICK_TTL_SECONDS = 90
_tick_redis = None


def _redis():
    global _tick_redis
    if _tick_redis is None:
        try:
            import redis as redis_lib

            _tick_redis = redis_lib.Redis.from_url(
                os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
                socket_timeout=1,
                socket_connect_timeout=1,
                decode_responses=True,
            )
        except Exception as e:
            logger.debug(f"Tick cache unavailable: {e}")
            _tick_redis = False
    return _tick_redis or None


def publish_tick(ticker: str, price: float) -> None:
    """Record the latest traded price so the order book can mark against it."""
    client = _redis()
    if not client or price <= 0:
        return
    try:
        client.setex(f'tick:{ticker.upper()}', TICK_TTL_SECONDS, f'{price}:{time.time()}')
    except Exception as e:
        logger.debug(f"Could not publish tick for {ticker}: {e}")


def latest_tick(ticker: str) -> float:
    """Most recent streamed price for a symbol, or 0 when there is none."""
    client = _redis()
    if not client:
        return 0.0
    try:
        raw = client.get(f'tick:{ticker.upper()}')
        if not raw:
            return 0.0
        price, _ = raw.split(':', 1)
        return float(price)
    except Exception:
        return 0.0



def ensure_asset(ticker: str) -> Asset | None:
    """
    Create an Asset (and its OrderBook) for a symbol the user asked for but that
    was never seeded, provided the venue actually has data for it.

    Returns None when the symbol looks untradable, so callers can 404.
    """
    ticker = ticker.upper()
    existing = Asset.objects.filter(ticker=ticker).first()
    if existing:
        OrderBook.objects.get_or_create(asset=existing)
        return existing

    price = 0.0
    try:
        price = reference_price(ticker)
    except Exception as e:
        logger.warning(f"Could not price {ticker} while provisioning: {e}")

    if price <= 0:
        # Fall back to a bar lookup before giving up; quotes go quiet out of hours.
        try:
            bars = alpaca_service.get_stock_bars([ticker], timeframe='1Day', limit=1)
            rows = bars.get(ticker) or []
            price = float(rows[-1]['close']) if rows else 0.0
        except Exception as e:
            logger.warning(f"No bars for {ticker} while provisioning: {e}")

    if price <= 0:
        return None

    asset = Asset.objects.create(
        name=ticker, ticker=ticker, description='Added on demand from market data'
    )
    OrderBook.objects.create(asset=asset, last_price=Decimal(str(round(price, 2))))
    logger.info(f"Provisioned asset {ticker} at {price}")
    return asset


def reference_price(ticker: str, quote: dict | None = None, order_book: OrderBook | None = None) -> float:
    """
    Best available price for a symbol, in order of preference:
    quote mid, single-sided quote, last trade, stored last price.
    """
    # A tick that just arrived beats a quote that stopped moving hours ago.
    tick = latest_tick(ticker)
    if tick > 0:
        return tick

    quote = quote if quote is not None else alpaca_service.get_latest_quotes([ticker]).get(ticker, {})

    bid = float(quote.get('bid_price') or 0)
    ask = float(quote.get('ask_price') or 0)

    if bid > 0 and ask > 0:
        return (bid + ask) / 2
    if bid > 0:
        return bid
    if ask > 0:
        return ask

    try:
        trades = alpaca_service.get_recent_trades([ticker], limit=1)
        for trade in trades:
            price = float(trade.get('price') or 0)
            if price > 0:
                return price
    except Exception as e:  # network or credentials
        logger.debug(f"No recent trade for {ticker}: {e}")

    if order_book is not None and order_book.last_price:
        return float(order_book.last_price)
    return 0.0


def _market_depth(quote: dict) -> tuple[list, list]:
    """
    Real venue depth, which on Alpaca's free IEX feed is top-of-book only:
    one bid and one ask, exactly as published. Nothing is inferred — a side the
    feed does not quote is simply absent.
    """
    bids, asks = [], []

    bid_price = float(quote.get('bid_price') or 0)
    bid_size = float(quote.get('bid_size') or 0)
    if bid_price > 0 and bid_size > 0:
        bids.append({'price': round(bid_price, 2), 'size': bid_size, 'source': 'market'})

    ask_price = float(quote.get('ask_price') or 0)
    ask_size = float(quote.get('ask_size') or 0)
    if ask_price > 0 and ask_size > 0:
        asks.append({'price': round(ask_price, 2), 'size': ask_size, 'source': 'market'})

    return bids, asks


def _local_orders(asset: Asset) -> tuple[list, list]:
    """Resting user orders, aggregated per price level."""
    def side(code):
        return [
            {'price': float(row['price']), 'size': float(row['total_size']), 'source': 'local'}
            for row in Order.objects.filter(asset=asset, side=code, status='PENDING')
            .values('price')
            .annotate(total_size=Sum('size'))
        ]
    return side('BUY'), side('SELL')


def _cumulative(levels: list) -> list:
    running = 0.0
    out = []
    for level in levels:
        running += level['size']
        out.append({
            'price': level['price'],
            'size': level['size'],
            'total': round(running, 2),
            'source': level.get('source', 'market'),
        })
    return out


def build_order_book(ticker: str, levels: int = 10) -> dict:
    """
    Merge resting local orders with real venue depth into a single ladder.

    Both sources are genuine: resting orders come from the matching engine and
    market levels straight from the quote feed. When the venue publishes no
    usable quote — which is normal outside market hours — that side is empty
    rather than filled in with invented levels.
    """
    ticker = ticker.upper()
    asset = Asset.objects.get(ticker=ticker)
    order_book, _ = OrderBook.objects.get_or_create(asset=asset)

    quote = alpaca_service.get_latest_quotes([ticker]).get(ticker, {})
    mid = reference_price(ticker, quote=quote, order_book=order_book)

    local_bids, local_asks = _local_orders(asset)
    market_bids, market_asks = _market_depth(quote)

    all_bids = sorted(local_bids + market_bids, key=lambda x: x['price'], reverse=True)
    all_asks = sorted(local_asks + market_asks, key=lambda x: x['price'])

    # Keep the stored last price current so the ladder header is not stuck on
    # whatever was seeded at setup time.
    if mid > 0 and float(order_book.last_price or 0) != round(mid, 2):
        order_book.last_price = Decimal(str(round(mid, 2)))
        order_book.save(update_fields=['last_price', 'updated_at'])

    return {
        'ticker': ticker,
        'bids': _cumulative(all_bids[:levels]),
        'asks': _cumulative(all_asks[:levels]),
        'last_price': round(mid, 2) if mid > 0 else float(order_book.last_price or 0),
        'market_data': quote,
    }
