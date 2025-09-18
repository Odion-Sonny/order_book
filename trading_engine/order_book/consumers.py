import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import OrderBook, Order, Asset
from .serializers import OrderBookSerializer
from .services.alpaca_service import alpaca_service
import aioredis

class OrderBookConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.redis = None
        self.pubsub = None
        self.background_task = None
        
    async def connect(self):
        self.asset_ticker = self.scope['url_route']['kwargs']['asset_ticker']
        self.room_group_name = f'orderbook_{self.asset_ticker}'
        
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
        """Send order book updates every 5 seconds"""
        try:
            while True:
                await asyncio.sleep(5)
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
        """Get current order book data for the ticker"""
        try:
            from django.db.models import Sum
            
            asset = Asset.objects.get(ticker=self.ticker.upper())
            order_book = OrderBook.objects.get(asset=asset)
            
            depth_levels = 10
            
            # Get pending orders for this asset
            bids = Order.objects.filter(
                asset=order_book.asset,
                side='BUY',
                status='PENDING'
            ).values('price').annotate(
                total_size=Sum('size')
            ).order_by('-price')[:depth_levels]
            
            asks = Order.objects.filter(
                asset=order_book.asset,
                side='SELL',
                status='PENDING'
            ).values('price').annotate(
                total_size=Sum('size')
            ).order_by('price')[:depth_levels]
            
            # If no orders exist, create sample order book data from market prices
            if not bids and not asks:
                quotes = alpaca_service.get_latest_quotes([self.ticker])
                
                if self.ticker in quotes and quotes[self.ticker]['ask_price'] > 0:
                    mid_price = (quotes[self.ticker]['bid_price'] + quotes[self.ticker]['ask_price']) / 2
                    
                    # Generate sample order book levels
                    sample_bids = []
                    sample_asks = []
                    
                    for i in range(depth_levels):
                        bid_price = mid_price - (i + 1) * 0.01 * mid_price
                        ask_price = mid_price + (i + 1) * 0.01 * mid_price
                        
                        sample_bids.append({
                            'price': round(bid_price, 2),
                            'size': 100 - i * 10,
                            'total': round((100 - i * 10) * bid_price, 2)
                        })
                        
                        sample_asks.append({
                            'price': round(ask_price, 2),
                            'size': 100 - i * 10,
                            'total': round((100 - i * 10) * ask_price, 2)
                        })
                    
                    return {
                        'bids': sample_bids,
                        'asks': sample_asks,
                        'last_price': mid_price,
                        'ticker': self.ticker
                    }
            
            # Calculate cumulative totals for real orders
            bid_list = []
            running_bid_total = 0
            for bid in bids:
                running_bid_total += float(bid['total_size'])
                bid_list.append({
                    'price': float(bid['price']),
                    'size': float(bid['total_size']),
                    'total': round(running_bid_total * float(bid['price']), 2)
                })
            
            ask_list = []
            running_ask_total = 0
            for ask in asks:
                running_ask_total += float(ask['total_size'])
                ask_list.append({
                    'price': float(ask['price']),
                    'size': float(ask['total_size']),
                    'total': round(running_ask_total * float(ask['price']), 2)
                })
            
            return {
                'bids': bid_list,
                'asks': ask_list,
                'last_price': float(order_book.last_price) if order_book.last_price else 0,
                'ticker': order_book.asset.ticker
            }
            
        except Exception as e:
            print(f"Error getting order book data for {self.ticker}: {e}")
            return {
                'bids': [],
                'asks': [],
                'last_price': 0,
                'ticker': self.ticker,
                'error': str(e)
            } 