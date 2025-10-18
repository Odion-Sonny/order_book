from django.shortcuts import render
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from .models import Asset, Order, OrderBook
from .serializers import AssetSerializer, OrderSerializer, OrderBookSerializer
from .services.matching_engine import MatchingEngine
from .services.alpaca_service import alpaca_service
from .services.risk_management import RiskManagementService
from .services.audit_logger import AuditLogger
from django.db.models import Min, Max, Sum
import random
from decimal import Decimal
from django.utils import timezone

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        """Validate ticker exists in Alpaca before creating asset"""
        ticker = serializer.validated_data.get('ticker', '').upper()

        # Check if ticker exists in Alpaca
        try:
            # Try to get latest quote for this ticker
            quotes = alpaca_service.get_latest_quotes([ticker])

            if not quotes or ticker not in quotes:
                raise serializers.ValidationError({
                    'ticker': f'Stock ticker "{ticker}" not found in Alpaca market data. Please verify the symbol is correct.'
                })

            # Check if the quote data is valid
            quote_data = quotes[ticker]
            if quote_data.get('ask_price', 0) <= 0 and quote_data.get('bid_price', 0) <= 0:
                raise serializers.ValidationError({
                    'ticker': f'Stock ticker "{ticker}" exists but has no valid market data. It may be delisted or not tradable.'
                })

        except Exception as e:
            # If it's already a ValidationError, re-raise it
            if isinstance(e, serializers.ValidationError):
                raise
            # For other exceptions, raise a validation error
            raise serializers.ValidationError({
                'ticker': f'Unable to validate ticker "{ticker}". Please try again or verify the symbol is correct.'
            })

        # If validation passes, create the asset
        asset = serializer.save()

        # Also create an OrderBook for this asset
        OrderBook.objects.get_or_create(
            asset=asset,
            defaults={'last_price': Decimal('0.00')}
        )

    def perform_destroy(self, instance):
        """Handle asset deletion with proper cleanup"""
        try:
            # Check if there are any pending orders for this asset
            pending_orders_count = Order.objects.filter(
                asset=instance,
                status='PENDING'
            ).count()

            if pending_orders_count > 0:
                raise serializers.ValidationError({
                    'detail': f'Cannot delete {instance.ticker}. There are {pending_orders_count} pending order(s) for this asset. Please cancel them first.'
                })

            # Check if there are any open positions for this asset
            from .models import Position
            open_positions_count = Position.objects.filter(
                asset=instance,
                quantity__gt=0
            ).count()

            if open_positions_count > 0:
                raise serializers.ValidationError({
                    'detail': f'Cannot delete {instance.ticker}. There are {open_positions_count} open position(s) for this asset. Please close them first.'
                })

            # If no pending orders or open positions, safe to delete
            # Django will cascade delete related OrderBook, filled Orders, and Trades
            instance.delete()

        except Exception as e:
            if isinstance(e, serializers.ValidationError):
                raise
            raise serializers.ValidationError({
                'detail': f'Failed to delete {instance.ticker}: {str(e)}'
            })

    @action(detail=False, methods=['get'])
    def chart_data(self, request):
        """Get historical chart data for a specific ticker"""
        ticker = request.query_params.get('ticker')
        timeframe = request.query_params.get('timeframe', '1Day')
        limit = int(request.query_params.get('limit', 30))

        if not ticker:
            return Response({'error': 'ticker parameter is required'}, status=400)

        try:
            # Get historical bars from Alpaca
            bars = alpaca_service.get_stock_bars([ticker], timeframe=timeframe, limit=limit)

            if ticker in bars:
                return Response({'bars': bars[ticker]})
            else:
                return Response({'bars': []})

        except Exception as e:
            return Response({'error': f'Failed to fetch chart data: {str(e)}'}, status=500)

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
            bid_price = 0
            ask_price = 0
            bid_size = 0
            ask_size = 0

            if 'latest_quote' in snapshot:
                bid_price = snapshot['latest_quote']['bid_price']
                ask_price = snapshot['latest_quote']['ask_price']
                bid_size = snapshot['latest_quote']['bid_size']
                ask_size = snapshot['latest_quote']['ask_size']
                quote_data = {
                    'bid_price': bid_price,
                    'ask_price': ask_price,
                    'bid_size': bid_size,
                    'ask_size': ask_size,
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
                'current_price': current_price,
                # Flatten bid/ask for easy frontend access
                'bid_price': bid_price,
                'ask_price': ask_price,
                'bid_size': bid_size,
                'ask_size': ask_size
            }
            result.append(asset_data)
        
        return Response(result)

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own orders
        return Order.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Get asset by ticker or ID
        asset_data = self.request.data.get('asset')
        try:
            if isinstance(asset_data, str):
                asset = Asset.objects.get(ticker=asset_data)
            else:
                asset = Asset.objects.get(id=asset_data)

            # Create order with user
            order = serializer.save(asset=asset, user=self.request.user)

            # Initialize risk management
            risk_service = RiskManagementService(self.request.user)

            # Validate order against risk limits
            is_valid, error_message = risk_service.validate_order(order)

            if not is_valid:
                # Log risk limit violation
                AuditLogger.log_risk_limit_violated(
                    user=self.request.user,
                    violation_details={
                        'reason': error_message,
                        'order_id': order.id,
                        'asset': order.asset.ticker,
                        'price': str(order.price),
                        'size': str(order.size)
                    },
                    request=self.request
                )

                # Reject order
                order.status = 'REJECTED'
                order.save()

                AuditLogger.log_order_rejected(
                    user=self.request.user,
                    order_details={
                        'asset': order.asset.ticker,
                        'price': str(order.price),
                        'size': str(order.size),
                        'order_type': order.order_type,
                        'side': order.side
                    },
                    reason=error_message,
                    request=self.request
                )

                raise serializers.ValidationError({'detail': error_message})

            # Log order creation
            AuditLogger.log_order_created(order, self.request)

            # Update buying power (reserve funds for buy orders)
            risk_service.update_buying_power(order, is_filled=False)

            # Process order through matching engine
            order_book = OrderBook.objects.get(asset=order.asset)
            matching_engine = MatchingEngine(order_book)
            matched, filled_amount = matching_engine.process_order(order)

            if matched:
                # Update buying power again after fill
                risk_service.update_buying_power(order, is_filled=True)

                # Log order fill
                AuditLogger.log_order_filled(order, self.request)

        except Asset.DoesNotExist:
            raise serializers.ValidationError({'detail': f'Asset not found'})
        except OrderBook.DoesNotExist:
            raise serializers.ValidationError({'detail': f'Order book not found for {asset.ticker}'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending order"""
        try:
            order = self.get_object()

            # Verify order belongs to user
            if order.user != request.user:
                return Response(
                    {'detail': 'You do not have permission to cancel this order.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if order can be cancelled
            if order.status != 'PENDING':
                return Response(
                    {'detail': f'Cannot cancel order with status: {order.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Cancel the order
            order.status = 'CANCELLED'
            order.save()

            # Log cancellation
            AuditLogger.log_order_cancelled(order, request)

            # Restore buying power if it was a buy order
            if order.side == 'BUY':
                risk_service = RiskManagementService(request.user)
                risk_service.restore_buying_power(order)

            # Serialize and return
            serializer = self.get_serializer(order)
            return Response(serializer.data)

        except Order.DoesNotExist:
            return Response(
                {'detail': 'Order not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': f'Failed to cancel order: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
    """Get real trade executions from Alpaca API with simulated fallback"""
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
        
        # If no real Alpaca data, generate simulated trades with proper ordering
        if not all_trades and assets:
            sample_trades = []
            base_time = timezone.now()
            for i in range(15):
                asset = random.choice(assets)
                # Get current market price
                quotes = alpaca_service.get_latest_quotes([asset.ticker])
                base_price = 100  # Default fallback
                
                if asset.ticker in quotes and quotes[asset.ticker]['ask_price'] > 0:
                    base_price = (quotes[asset.ticker]['bid_price'] + quotes[asset.ticker]['ask_price']) / 2
                
                # Generate realistic price variation
                price_variation = random.uniform(-0.02, 0.02)  # ±2%
                trade_price = base_price * (1 + price_variation)
                
                # Generate sequential timestamps (newest first)
                # Each trade is 15-45 seconds older than the previous one
                seconds_back = sum([random.randint(15, 45) for _ in range(i + 1)])
                trade_time = base_time - timezone.timedelta(seconds=seconds_back)
                
                # Generate additional trade properties for enhanced UI
                side = random.choice(['BUY', 'SELL'])
                size = random.randint(10, 500)
                volume = trade_price * size
                
                sample_trades.append({
                    'id': f"trade_{i+1}_{int(trade_time.timestamp())}",
                    'asset': asset.ticker,
                    'price': f"{trade_price:.2f}",
                    'size': str(size),
                    'timestamp': trade_time.isoformat(),
                    'buyer_order_id': f"buy_{random.randint(1000, 9999)}",
                    'seller_order_id': f"sell_{random.randint(1000, 9999)}",
                    'side': side,
                    'trade_type': 'MARKET',
                    'volume': f"{volume:.2f}"
                })
            
            all_trades = sample_trades
        
        # Sort by timestamp descending (newest first)
        all_trades.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Return most recent 50 trades
        return Response(all_trades[:50])
        
    except Exception as e:
        return Response({'error': f'Failed to fetch trades: {str(e)}'}, status=500)
