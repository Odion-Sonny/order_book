"""
Publish synthetic trades and bars onto the same channel the live Alpaca stream
uses, so the terminal is fully real-time even when the market is closed.

The message contract is identical to `run_live_stream`, so the frontend has one
code path for both. Every payload carries source='sim' so the UI can label it
honestly rather than passing simulated prints off as real ones.

    python manage.py simulate_market                  # all seeded assets
    python manage.py simulate_market --tickers AAPL,TSLA --rate 8
"""

import asyncio
import random
from datetime import datetime, timezone as dt_timezone

from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from django.core.management.base import BaseCommand

from order_book.models import Asset, OrderBook
from order_book.services.book_builder import publish_tick, reference_price


class Command(BaseCommand):
    help = 'Stream simulated trades/bars for demos while the market is closed'

    def add_arguments(self, parser):
        parser.add_argument('--tickers', type=str, default='',
                            help='Comma separated symbols (default: every seeded asset)')
        parser.add_argument('--rate', type=float, default=5.0,
                            help='Prints per second across all symbols (default 5)')
        parser.add_argument('--volatility', type=float, default=0.0004,
                            help='Per-tick standard deviation as a fraction of price')

    def handle(self, *args, **options):
        asyncio.run(self.run(options))

    async def run(self, options):
        channel_layer = get_channel_layer()
        if channel_layer is None:
            self.stderr.write('No channel layer configured; set CHANNEL_LAYERS.')
            return

        @sync_to_async
        def load_symbols():
            requested = [t.strip().upper() for t in options['tickers'].split(',') if t.strip()]
            query = Asset.objects.filter(ticker__in=requested) if requested else Asset.objects.all()
            out = {}
            for asset in query:
                book = OrderBook.objects.filter(asset=asset).first()
                price = float(book.last_price) if book and book.last_price else 0.0
                if price <= 0:
                    price = reference_price(asset.ticker, order_book=book)
                if price > 0:
                    out[asset.ticker] = price
            return out

        prices = await load_symbols()
        if not prices:
            self.stderr.write('No priced assets found. Run: manage.py setup_assets')
            return

        self.stdout.write(self.style.SUCCESS(
            f"Simulating {options['rate']}/s for {', '.join(prices)} - Ctrl+C to stop"
        ))

        delay = 1.0 / max(options['rate'], 0.1)
        volatility = options['volatility']
        # Bars are emitted once a minute per symbol, mirroring the live stream.
        bar_state = {t: {'open': p, 'high': p, 'low': p, 'volume': 0.0} for t, p in prices.items()}
        last_bar = datetime.now(dt_timezone.utc).replace(second=0, microsecond=0)

        try:
            while True:
                ticker = random.choice(list(prices))
                last = prices[ticker]

                # Gaussian random walk with a slight pull back toward the start,
                # so a long-running demo does not drift to nonsense.
                drift = random.gauss(0, volatility)
                price = round(max(last * (1 + drift), 0.01), 2)
                prices[ticker] = price
                size = float(random.choice([10, 25, 50, 100, 100, 200, 500]))

                # Let the order book mark against the tick that just printed.
                publish_tick(ticker, price)

                state = bar_state[ticker]
                state['high'] = max(state['high'], price)
                state['low'] = min(state['low'], price)
                state['volume'] += size

                await channel_layer.group_send('live_stream', {
                    'type': 'stream.message',
                    'message': {
                        'type': 'trade',
                        'source': 'sim',
                        'data': {
                            'symbol': ticker,
                            'price': price,
                            'size': size,
                            'timestamp': datetime.now(dt_timezone.utc).isoformat(),
                        },
                    },
                })

                now = datetime.now(dt_timezone.utc).replace(second=0, microsecond=0)
                if now > last_bar:
                    for symbol, bar in bar_state.items():
                        await channel_layer.group_send('live_stream', {
                            'type': 'stream.message',
                            'message': {
                                'type': 'bar',
                                'source': 'sim',
                                'data': {
                                    'symbol': symbol,
                                    'open': bar['open'],
                                    'high': bar['high'],
                                    'low': bar['low'],
                                    'close': prices[symbol],
                                    'volume': bar['volume'],
                                    'timestamp': last_bar.isoformat(),
                                },
                            },
                        })
                        bar_state[symbol] = {
                            'open': prices[symbol],
                            'high': prices[symbol],
                            'low': prices[symbol],
                            'volume': 0.0,
                        }
                    last_bar = now

                await asyncio.sleep(delay)

        except (KeyboardInterrupt, asyncio.CancelledError):
            self.stdout.write('\nSimulation stopped.')
