import asyncio
import json
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from order_book.services.alpaca_service import alpaca_service
from order_book.models import Asset

class Command(BaseCommand):
    help = 'Runs the Alpaca Live Stream and broadcasts to Channels'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting live stream...'))
        asyncio.run(self.run_stream())

    async def run_stream(self):
        channel_layer = get_channel_layer()
        
        # Wrapping in sync_to_async to access DB
        from asgiref.sync import sync_to_async
        @sync_to_async
        def get_assets():
            return [a.ticker for a in Asset.objects.all()]
            
        assets = await get_assets()
        if not assets:
            assets = ['AAPL', 'MSFT', 'TSLA', 'SPY']

        async def bar_handler(bar):
            # Broadcast to channel layer
            cl = get_channel_layer()
            if not cl:
                return
            data = {
                'symbol': bar.symbol,
                'open': bar.open,
                'high': bar.high,
                'low': bar.low,
                'close': bar.close,
                'volume': bar.volume,
                'timestamp': bar.timestamp.isoformat() if hasattr(bar.timestamp, 'isoformat') else str(bar.timestamp)
            }
            await cl.group_send(
                'live_stream',
                {
                    'type': 'stream.message',
                    'message': {'type': 'bar', 'source': 'live', 'data': data}
                }
            )

        async def trade_handler(trade):
            cl = get_channel_layer()
            if not cl:
                return
            # Mark the order book against the freshest print.
            from order_book.services.book_builder import publish_tick
            publish_tick(trade.symbol, float(trade.price))
            data = {
                'symbol': trade.symbol,
                'price': trade.price,
                'size': trade.size,
                'timestamp': trade.timestamp.isoformat() if hasattr(trade.timestamp, 'isoformat') else str(trade.timestamp)
            }
            await cl.group_send(
                'live_stream',
                {
                    'type': 'stream.message',
                    'message': {'type': 'trade', 'source': 'live', 'data': data}
                }
            )

        await alpaca_service.setup_live_stream(
            symbols=assets,
            handlers={
                'bar': bar_handler,
                'trade': trade_handler
            }
        )
        
        self.stdout.write(self.style.SUCCESS(f'Connected to stream for {assets}'))
        await alpaca_service.start_stream()
