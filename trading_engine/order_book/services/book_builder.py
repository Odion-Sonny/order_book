"""
Order book construction shared by the REST endpoint and the WebSocket consumer.

Both used to build the ladder themselves, and they disagreed: the REST view merged
local orders with synthetic Alpaca depth, while the consumer showed synthetic depth
only when there were no local orders at all. Both also required a positive ask,
so any symbol quoting one-sided (common on IEX outside regular hours) rendered an
empty book.
"""

import logging
from decimal import Decimal

from django.db.models import Sum

from ..models import Asset, Order, OrderBook
from .alpaca_service import alpaca_service

logger = logging.getLogger(__name__)

# Synthetic ladder shape when the venue does not publish usable depth.
SYNTHETIC_LEVELS = 10
# Half-spread used when the feed gives us only one side, in basis points.
FALLBACK_HALF_SPREAD_BPS = 5
# Each synthetic level steps this far from the mid, in basis points.
LEVEL_STEP_BPS = 4
BASE_LEVEL_SIZE = 100


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


def _synthetic_depth(mid: float, quote: dict) -> tuple[list, list]:
    """Generate a plausible ladder around `mid` when real depth is unavailable."""
    if mid <= 0:
        return [], []

    bid = float(quote.get('bid_price') or 0)
    ask = float(quote.get('ask_price') or 0)

    # Use the real spread when the feed gives us both sides; otherwise assume a
    # tight one rather than refusing to draw a book at all.
    if bid > 0 and ask > bid:
        half_spread = (ask - bid) / 2
    else:
        half_spread = mid * FALLBACK_HALF_SPREAD_BPS / 10_000

    bid_size = float(quote.get('bid_size') or 0) or BASE_LEVEL_SIZE
    ask_size = float(quote.get('ask_size') or 0) or BASE_LEVEL_SIZE
    step = mid * LEVEL_STEP_BPS / 10_000

    bids, asks = [], []
    for i in range(SYNTHETIC_LEVELS):
        bids.append({
            'price': round(mid - half_spread - step * i, 2),
            'size': round(bid_size * (1 + i * 0.2)),
            'source': 'market',
        })
        asks.append({
            'price': round(mid + half_spread + step * i, 2),
            'size': round(ask_size * (1 + i * 0.2)),
            'source': 'market',
        })
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
    Merge resting local orders with venue depth into a single ladder.

    Always returns both sides when a price is known, so a one-sided or missing
    quote no longer produces an empty book.
    """
    ticker = ticker.upper()
    asset = Asset.objects.get(ticker=ticker)
    order_book, _ = OrderBook.objects.get_or_create(asset=asset)

    quote = alpaca_service.get_latest_quotes([ticker]).get(ticker, {})
    mid = reference_price(ticker, quote=quote, order_book=order_book)

    local_bids, local_asks = _local_orders(asset)
    market_bids, market_asks = _synthetic_depth(mid, quote)

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
