from django.shortcuts import render
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from .models import Asset, Order, OrderBook, Trade
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
        # Optimized with select_related to reduce queries
        return Order.objects.filter(user=self.request.user).select_related('asset').order_by('-created_at')

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
            # 1. Fetch Local Orders
            local_bids = list(Order.objects.filter(
                asset=order_book.asset,
                side='BUY',
                status='PENDING'
            ).values('price').annotate(total_size=Sum('size')))
            
            local_asks = list(Order.objects.filter(
                asset=order_book.asset,
                side='SELL',
                status='PENDING'
            ).values('price').annotate(total_size=Sum('size')))

            # 2. Fetch Alpaca "Background" Liquidity
            alpaca_bids = []
            alpaca_asks = []
            market_data = {}
            
            try:
                quotes = alpaca_service.get_latest_quotes([ticker])
                if ticker in quotes and quotes[ticker]['ask_price'] > 0:
                    market_data = quotes[ticker]
                    bid_price = market_data['bid_price']
                    ask_price = market_data['ask_price']
                    spread = ask_price - bid_price
                    
                    # Generate 10 levels of background depth
                    for i in range(10):
                        # Bids
                        p_bid = bid_price - (spread * 0.1 * i)
                        alpaca_bids.append({
                            'price': float(round(p_bid, 2)),
                            'total_size': float(int(market_data['bid_size'] * (1 + i*0.2))) # Simulated depth
                        })
                        
                        # Asks
                        p_ask = ask_price + (spread * 0.1 * i)
                        alpaca_asks.append({
                            'price': float(round(p_ask, 2)),
                            'total_size': float(int(market_data['ask_size'] * (1 + i*0.2)))
                        })
            except Exception as e:
                print(f"Alpaca fetch failed: {e}")

            # 3. Merge and Sort
            # Combine
            all_bids = []
            for b in local_bids:
                all_bids.append({'price': float(b['price']), 'size': float(b['total_size']), 'source': 'local'})
            for b in alpaca_bids:
                all_bids.append({'price': b['price'], 'size': b['total_size'], 'source': 'market'})
                
            all_asks = []
            for a in local_asks:
                all_asks.append({'price': float(a['price']), 'size': float(a['total_size']), 'source': 'local'})
            for a in alpaca_asks:
                all_asks.append({'price': a['price'], 'size': a['total_size'], 'source': 'market'})

            # Sort
            # Bids: Descending Price
            all_bids.sort(key=lambda x: x['price'], reverse=True)
            # Asks: Ascending Price
            all_asks.sort(key=lambda x: x['price'])
            
            # Slice to requested depth
            final_bids = all_bids[:depth_levels]
            final_asks = all_asks[:depth_levels]

            # 4. Calculate Cumulative Totals
            response_bids = []
            running_total = 0
            for b in final_bids:
                running_total += b['size']
                response_bids.append({
                    'price': b['price'],
                    'size': b['size'],
                    'total': round(running_total, 2)
                })

            response_asks = []
            running_total = 0
            for a in final_asks:
                running_total += a['size']
                response_asks.append({
                    'price': a['price'],
                    'size': a['size'],
                    'total': round(running_total, 2)
                })

            return Response({
                'bids': response_bids,
                'asks': response_asks,
                'last_price': float(order_book.last_price) if order_book.last_price else (market_data.get('ask_price', 0) + market_data.get('bid_price', 0))/2,
                'ticker': ticker,
                'market_data': market_data
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
    """Get real trade executions from local Order Book with Alpaca fallback"""
    try:
        limit = min(int(request.GET.get('limit', 50)), 100)
        ticker = request.GET.get('ticker')
        
        # 1. Get Local Trades (Actual Order Book Matches)
        trades_query = Trade.objects.select_related('asset', 'buy_order', 'sell_order').order_by('-executed_at')
        
        if ticker:
            trades_query = trades_query.filter(asset__ticker=ticker)
            
        local_trades = trades_query[:limit]
        from .serializers import TradeSerializer
        local_trades_data = TradeSerializer(local_trades, many=True).data
        
        # If we have enough local trades, return them directly
        # This ensures the user sees their actual system working
        if len(local_trades_data) > 0:
            # Transform to common format if needed, but Frontend likely expects standard Trade fields
            # The Matchign Engine Trade model has: price, size, asset, executed_at
            # The previous simulated format had: price, size, asset, timestamp
            # We need to map 'executed_at' to 'timestamp' for consistency if frontend expects it
            # Let's clean up the response
            formatted_trades = []
            for t in local_trades_data:
                formatted_trades.append({
                    'id': str(t['id']),
                    'asset_ticker': t['asset_ticker'],
                    'price': t['price'],
                    'quantity': t['size'],
                    'volume': float(t['price']) * float(t['size']),
                    'timestamp': t['executed_at'],
                    'side': 'BUY' if t['buy_order'] else 'SELL',
                    'type': 'LIMIT'
                })
            return Response(formatted_trades)

        # 2. Fallback: Alpaca/Simulation (Only if no local trades exist)
        # This keeps the chart alive for demo purposes before any user interaction
        assets = Asset.objects.all()
        if ticker:
            assets = assets.filter(ticker=ticker)
            
        symbols = [asset.ticker for asset in assets]

        # Try to get real trade data from Alpaca
        alpaca_trades = []
        if symbols:
            try:
                alpaca_trades = alpaca_service.get_recent_trades(symbols, limit=min(limit, 20))
            except Exception as e:
                print(f"Error getting Alpaca market trades: {e}")

        if alpaca_trades:
             return Response(alpaca_trades)

        # 3. Final Fallback: Simulation
        # ... (Existing simulation logic)
        if assets:
            sample_trades = []
            base_time = timezone.now()
            for i in range(min(limit, 15)):
                asset = random.choice(assets)
                # Get current market price
                quotes = alpaca_service.get_latest_quotes([asset.ticker])
                base_price = 100  # Default fallback

                if asset.ticker in quotes and quotes[asset.ticker]['ask_price'] > 0:
                    base_price = (quotes[asset.ticker]['bid_price'] + quotes[asset.ticker]['ask_price']) / 2

                price_variation = random.uniform(-0.02, 0.02)
                trade_price = base_price * (1 + price_variation)
                seconds_back = sum([random.randint(15, 45) for _ in range(i + 1)])
                trade_time = base_time - timezone.timedelta(seconds=seconds_back)

                side = random.choice(['BUY', 'SELL'])
                size = random.randint(10, 500)
                volume = trade_price * size

                sample_trades.append({
                    'id': f"sim_{i+1}_{int(trade_time.timestamp())}",
                    'asset': asset.ticker,
                    'price': f"{trade_price:.2f}",
                    'size': str(size),
                    'timestamp': trade_time.isoformat(),
                    'side': side,
                    'volume': f"{volume:.2f}"
                })
            
            sample_trades.sort(key=lambda x: x['timestamp'], reverse=True)
            return Response(sample_trades)
            
        return Response([])

    except Exception as e:
        return Response({'error': f'Failed to fetch trades: {str(e)}'}, status=500)
