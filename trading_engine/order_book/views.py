from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from .models import Asset, Order, OrderBook
from .serializers import AssetSerializer, OrderSerializer, OrderBookSerializer
from .services.matching_engine import MatchingEngine
from .services.alpaca_service import alpaca_service
from django.db.models import Min, Max, Sum
import random
from decimal import Decimal
from django.utils import timezone

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    
    @action(detail=False, methods=['get'])
    def market_data(self, request):
        """Get real-time market data for all assets from Alpaca"""
        assets = Asset.objects.all()
        symbols = [asset.ticker for asset in assets]
        
        # Get comprehensive market snapshots from Alpaca
        snapshots = alpaca_service.get_market_snapshot(symbols)
        
        # Get historical data for charts  
        bars = alpaca_service.get_stock_bars(symbols, timeframe='1Day', limit=30)
        
        result = []
        for asset in assets:
            ticker = asset.ticker
            snapshot = snapshots.get(ticker, {})
            
            # Extract real quote data
            quote_data = {}
            if 'latest_quote' in snapshot:
                quote_data = {
                    'bid_price': snapshot['latest_quote']['bid_price'],
                    'ask_price': snapshot['latest_quote']['ask_price'],
                    'bid_size': snapshot['latest_quote']['bid_size'],
                    'ask_size': snapshot['latest_quote']['ask_size'],
                    'timestamp': snapshot['latest_quote']['timestamp']
                }
            
            # Calculate real price change if daily data available
            price_change = 0
            price_change_percent = 0
            current_price = 0
            
            if 'daily_bar' in snapshot and 'prev_daily_bar' in snapshot:
                current_price = snapshot['daily_bar']['close']
                prev_close = snapshot['prev_daily_bar']['close']
                if prev_close > 0:
                    price_change = current_price - prev_close
                    price_change_percent = (price_change / prev_close) * 100
            elif 'last_trade' in snapshot:
                current_price = snapshot['last_trade']['price']
            
            asset_data = {
                'id': asset.id,
                'name': asset.name,
                'ticker': ticker,
                'description': asset.description,
                'quote': quote_data,
                'chart_data': bars.get(ticker, []),
                'market_snapshot': snapshot,
                'price_change': price_change,
                'price_change_percent': price_change_percent,
                'current_price': current_price
            }
            result.append(asset_data)
        
        return Response(result)

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def perform_create(self, serializer):
        # Get asset by ticker
        asset_ticker = self.request.data.get('asset')
        try:
            asset = Asset.objects.get(ticker=asset_ticker)
            order = serializer.save(asset=asset)
            order_book = OrderBook.objects.get(asset=order.asset)
            matching_engine = MatchingEngine(order_book)
            matched, filled_amount = matching_engine.process_order(order)
            
            if matched:
                return Response({
                    'status': 'filled',
                    'filled_amount': filled_amount
                })
            return Response({
                'status': 'pending',
                'filled_amount': filled_amount
            })
        except Asset.DoesNotExist:
            return Response({
                'error': f'Asset {asset_ticker} not found'
            }, status=400)

class OrderBookViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OrderBook.objects.all()
    serializer_class = OrderBookSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        for order_book in queryset:
            # Calculate best bid and ask
            bids = Order.objects.filter(
                asset=order_book.asset,
                side='BUY',
                status='PENDING'
            ).aggregate(best_bid=Max('price'))
            
            asks = Order.objects.filter(
                asset=order_book.asset,
                side='SELL',
                status='PENDING'
            ).aggregate(best_ask=Min('price'))
            
            order_book.best_bid = bids['best_bid']
            order_book.best_ask = asks['best_ask']
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_ticker(self, request):
        """Get order book by ticker symbol"""
        ticker = request.query_params.get('ticker')
        if not ticker:
            return Response({'error': 'ticker parameter is required'}, status=400)
        
        try:
            asset = Asset.objects.get(ticker=ticker.upper())
            order_book = OrderBook.objects.get(asset=asset)
            
            # Manually call the depth logic without requiring pk
            depth_levels = int(request.query_params.get('levels', 10))
            
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
            
            # If no orders exist, generate realistic market depth from Alpaca quotes
            if not bids and not asks:
                quotes = alpaca_service.get_latest_quotes([ticker])
                
                if ticker in quotes and quotes[ticker]['ask_price'] > 0:
                    bid_price = quotes[ticker]['bid_price']
                    ask_price = quotes[ticker]['ask_price']
                    spread = ask_price - bid_price
                    mid_price = (bid_price + ask_price) / 2
                    
                    # Generate realistic order book depth around market price
                    bid_list = []
                    ask_list = []
                    
                    # Create 10 levels of bids below market price
                    for i in range(10):
                        level_price = bid_price - (spread * 0.1 * i)
                        # Generate realistic size based on distance from market
                        base_size = random.randint(50, 500)
                        size_multiplier = 1 + (i * 0.3)  # Larger sizes further from market
                        level_size = int(base_size * size_multiplier)
                        running_total = sum(bid['size'] for bid in bid_list) + level_size
                        
                        bid_list.append({
                            'price': round(level_price, 2),
                            'size': level_size,
                            'total': round(running_total * level_price, 2)
                        })
                    
                    # Create 10 levels of asks above market price  
                    for i in range(10):
                        level_price = ask_price + (spread * 0.1 * i)
                        base_size = random.randint(50, 500)
                        size_multiplier = 1 + (i * 0.3)
                        level_size = int(base_size * size_multiplier)
                        running_total = sum(ask['size'] for ask in ask_list) + level_size
                        
                        ask_list.insert(0, {  # Insert at beginning to maintain price order
                            'price': round(level_price, 2),
                            'size': level_size,
                            'total': round(running_total * level_price, 2)
                        })
                    
                    return Response({
                        'bids': bid_list,
                        'asks': ask_list,
                        'last_price': mid_price,
                        'ticker': ticker,
                        'market_data': {
                            'bid_price': quotes[ticker]['bid_price'],
                            'ask_price': quotes[ticker]['ask_price'],
                            'bid_size': quotes[ticker]['bid_size'],
                            'ask_size': quotes[ticker]['ask_size']
                        }
                    })
                else:
                    return Response({
                        'bids': [],
                        'asks': [],
                        'last_price': 0,
                        'ticker': ticker,
                        'message': 'No real market data available'
                    })
            
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
            
            return Response({
                'bids': bid_list,
                'asks': ask_list,
                'last_price': float(order_book.last_price) if order_book.last_price else 0,
                'ticker': order_book.asset.ticker
            })
            
        except Asset.DoesNotExist:
            return Response({'error': f'Asset with ticker {ticker} not found'}, status=404)
        except OrderBook.DoesNotExist:
            return Response({'error': f'Order book for {ticker} not found'}, status=404)

    @action(detail=True, methods=['get'])
    def depth(self, request, pk=None):
        order_book = self.get_object()
        depth_levels = int(request.query_params.get('levels', 10))
        
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
        
        # If no orders exist, generate realistic market depth from Alpaca quotes
        if not bids and not asks:
            ticker = order_book.asset.ticker
            quotes = alpaca_service.get_latest_quotes([ticker])
            
            if ticker in quotes and quotes[ticker]['ask_price'] > 0:
                bid_price = quotes[ticker]['bid_price']
                ask_price = quotes[ticker]['ask_price']
                spread = ask_price - bid_price
                mid_price = (bid_price + ask_price) / 2
                
                # Generate realistic order book depth around market price
                bid_list = []
                ask_list = []
                
                # Create levels of bids below market price
                for i in range(depth_levels):
                    level_price = bid_price - (spread * 0.1 * i)
                    base_size = random.randint(50, 500)
                    size_multiplier = 1 + (i * 0.3)
                    level_size = int(base_size * size_multiplier)
                    running_total = sum(bid['size'] for bid in bid_list) + level_size
                    
                    bid_list.append({
                        'price': round(level_price, 2),
                        'size': level_size,
                        'total': round(running_total * level_price, 2)
                    })
                
                # Create levels of asks above market price  
                for i in range(depth_levels):
                    level_price = ask_price + (spread * 0.1 * i)
                    base_size = random.randint(50, 500)
                    size_multiplier = 1 + (i * 0.3)
                    level_size = int(base_size * size_multiplier)
                    running_total = sum(ask['size'] for ask in ask_list) + level_size
                    
                    ask_list.insert(0, {
                        'price': round(level_price, 2),
                        'size': level_size,
                        'total': round(running_total * level_price, 2)
                    })
                
                return Response({
                    'bids': bid_list,
                    'asks': ask_list,
                    'last_price': mid_price,
                    'ticker': ticker,
                    'market_data': quotes.get(ticker, {})
                })
            else:
                return Response({
                    'bids': [],
                    'asks': [],
                    'last_price': float(order_book.last_price) if order_book.last_price else 0,
                    'ticker': ticker,
                    'market_data': quotes.get(ticker, {})
                })
        
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
        
        return Response({
            'bids': bid_list,
            'asks': ask_list,
            'last_price': float(order_book.last_price) if order_book.last_price else 0,
            'ticker': order_book.asset.ticker
        })

@api_view(['GET'])
def trades_list(request):
    """Get real trade executions from Alpaca API"""
    try:
        assets = Asset.objects.all()
        symbols = [asset.ticker for asset in assets]
        
        # Try to get real trade data from Alpaca
        alpaca_trades = []
        account_orders = []
        
        if symbols:
            # Get market trade data
            try:
                alpaca_trades = alpaca_service.get_recent_trades(symbols, limit=30)
            except Exception as e:
                print(f"Error getting Alpaca market trades: {e}")
            
            # Get account order executions
            try:
                account_orders = alpaca_service.get_account_orders(limit=20)
            except Exception as e:
                print(f"Error getting Alpaca account orders: {e}")
        
        # Combine all trades
        all_trades = alpaca_trades + account_orders
        
        # Only return real Alpaca data - no simulated fallback
        if not all_trades:
            print("No real Alpaca trades available - returning empty list")
            return Response([])
        
        # Sort by timestamp descending (newest first)
        all_trades.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Return most recent 50 trades
        return Response(all_trades[:50])
        
    except Exception as e:
        return Response({'error': f'Failed to fetch trades: {str(e)}'}, status=500)
