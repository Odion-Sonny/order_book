import json
import asyncio
import os
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import OrderBook, Order, Asset
from .serializers import OrderBookSerializer
from .services.alpaca_service import alpaca_service

# How often the order book and market data consumers repush state.
ORDERBOOK_REFRESH_SECONDS = float(os.getenv('ORDERBOOK_REFRESH_SECONDS', '1'))
MARKET_REFRESH_SECONDS = float(os.getenv('MARKET_REFRESH_SECONDS', '5'))

# aioredis is only used by the legacy pub/sub consumer below and no longer imports
# on Python 3.11+. Keep it optional so the rest of the socket routes still load.
try:
    import aioredis
except Exception:  # pragma: no cover - depends on interpreter version
    aioredis = None


class OrderBookConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.redis = None
        self.pubsub = None
        self.background_task = None
        
    async def connect(self):
        self.asset_ticker = self.scope['url_route']['kwargs']['asset_ticker']
        self.room_group_name = f'orderbook_{self.asset_ticker}'

        if aioredis is None:
            # Use ws/orderbook/<ticker>/ instead; that route needs no Redis.
            await self.close(code=4503)
            return

        # Connect to Redis
        self.redis = await aioredis.create_redis_pool('redis://localhost')
        self.pubsub = self.redis.pubsub()
        
        # Subscribe to relevant channels
        await self.pubsub.subscribe(f'trades:{self.asset_ticker}')
        await self.pubsub.subscribe(f'orderbook:{self.asset_ticker}')
        
        # Start background task for processing messages
        self.background_task = asyncio.create_task(self.process_messages())
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        
        # Send initial order book state
        await self.send_order_book_snapshot()

    async def disconnect(self, close_code):
        # Clean up background task and Redis connection
        if self.background_task:
            self.background_task.cancel()
            try:
                await self.background_task
            except asyncio.CancelledError:
                pass
                
        if self.redis:
            self.redis.close()
            await self.redis.wait_closed()
            
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def process_messages(self):
        try:
            while True:
                message = await self.pubsub.get_message(timeout=1)
                if message and message['type'] == 'message':
                    data = json.loads(message['data'])
                    await self.send(text_data=json.dumps(data))
        except asyncio.CancelledError:
            pass

    @database_sync_to_async
    def get_order_book_snapshot(self):
        order_book = OrderBook.objects.get(asset__ticker=self.asset_ticker)
        return OrderBookSerializer(order_book).data

    async def send_order_book_snapshot(self):
        snapshot = await self.get_order_book_snapshot()
        await self.send(text_data=json.dumps({
            'type': 'snapshot',
            'data': snapshot
        }))


class MarketDataConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.update_task = None
        
    async def connect(self):
        await self.accept()
        
        # Start periodic updates every 5 seconds
        self.update_task = asyncio.create_task(self.send_periodic_updates())
        
    async def disconnect(self, close_code):
        # Cancel the update task
        if self.update_task:
            self.update_task.cancel()
            try:
                await self.update_task
            except asyncio.CancelledError:
                pass

    async def send_periodic_updates(self):
        """Send market data updates every 5 seconds"""
        try:
            while True:
                # Get market data
                market_data = await self.get_market_data()
                
                # Send to frontend
                await self.send(text_data=json.dumps({
                    'type': 'market_update',
                    'data': market_data
                }))
                
                # Wait 5 seconds
                await asyncio.sleep(5)
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Error in periodic updates: {e}")

    @database_sync_to_async
    def get_market_data(self):
        """Get current market data for all assets"""
        try:
            assets = Asset.objects.all()
            symbols = [asset.ticker for asset in assets]
            
            # Get live quotes from Alpaca
            quotes = alpaca_service.get_latest_quotes(symbols)
            
            # Get historical data for charts (reduced for real-time performance)
            bars = alpaca_service.get_stock_bars(symbols, timeframe='1Day', limit=7)
            
            result = []
            for asset in assets:
                ticker = asset.ticker
                asset_data = {
                    'id': asset.id,
                    'name': asset.name,
                    'ticker': ticker,
                    'description': asset.description,
                    'quote': quotes.get(ticker, {}),
                    'chart_data': bars.get(ticker, [])
                }
                result.append(asset_data)
            
            return result
        except Exception as e:
            print(f"Error getting market data: {e}")
            return []


class OrderBookRealtimeConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.update_task = None
        self.ticker = None
        
    async def connect(self):
        self.ticker = self.scope['url_route']['kwargs'].get('ticker')
        if not self.ticker:
            await self.close()
            return
            
        await self.accept()
        
        # Send initial data
        await self.send_order_book_data()
        
        # Start periodic updates every 5 seconds
        self.update_task = asyncio.create_task(self.send_periodic_updates())
        
    async def disconnect(self, close_code):
        if self.update_task:
            self.update_task.cancel()
            try:
                await self.update_task
            except asyncio.CancelledError:
                pass

    async def send_periodic_updates(self):
        """Push order book updates on a tight cadence so the ladder feels live."""
        try:
            while True:
                await asyncio.sleep(ORDERBOOK_REFRESH_SECONDS)
                await self.send_order_book_data()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Error in order book updates: {e}")

    async def send_order_book_data(self):
        """Get and send current order book data"""
        try:
            order_book_data = await self.get_order_book_data()
            await self.send(text_data=json.dumps({
                'type': 'orderbook_update',
                'data': order_book_data
            }))
        except Exception as e:
            print(f"Error sending order book data: {e}")

    @database_sync_to_async
    def get_order_book_data(self):
        """Current order book for the ticker, built by the shared builder."""
        from .services.book_builder import build_order_book, ensure_asset

        try:
            if not Asset.objects.filter(ticker=self.ticker.upper()).exists():
                ensure_asset(self.ticker)
            return build_order_book(self.ticker, levels=10)
        except Exception as e:
            print(f"Error getting order book data for {self.ticker}: {e}")
            return {
                'bids': [],
                'asks': [],
                'last_price': 0,
                'ticker': self.ticker,
                'error': str(e),
            }

class LiveStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(
            'live_stream',
            self.channel_name
        )
        await self.accept()
        
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            'live_stream',
            self.channel_name
        )

    async def stream_message(self, event):
        """
        Called when a message is sent to the 'live_stream' group.
        """
        message = event['message']
        await self.send(text_data=json.dumps(message))