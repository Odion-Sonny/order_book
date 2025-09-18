from decimal import Decimal
from typing import List, Optional, Tuple, Dict
from django.db import transaction
from django.core.cache import cache
from ..models import Order, OrderBook, Asset
from django.utils import timezone
import redis
from collections import defaultdict
from sortedcontainers import SortedDict
import json
from datetime import datetime

class OrderBookCache:
    def __init__(self, asset_ticker: str):
        self.asset_ticker = asset_ticker
        self.bids = SortedDict()  # Price -> List[Order]
        self.asks = SortedDict()  # Price -> List[Order]
        self.order_map = {}  # Order ID -> Order
        self._redis = redis.Redis(host='localhost', port=6379, db=0)
        
    def add_order(self, order: Order):
        price_map = self.bids if order.side == 'BUY' else self.asks
        if order.price not in price_map:
            price_map[order.price] = []
        price_map[order.price].append(order)
        self.order_map[order.id] = order
        
        # Update Redis cache
        cache_key = f"orderbook:{self.asset_ticker}:{order.side}"
        self._redis.zadd(cache_key, {str(order.id): float(order.price)})
        
    def remove_order(self, order: Order):
        price_map = self.bids if order.side == 'BUY' else self.asks
        if order.price in price_map:
            price_map[order.price].remove(order)
            if not price_map[order.price]:
                del price_map[order.price]
        del self.order_map[order.id]
        
        # Update Redis cache
        cache_key = f"orderbook:{self.asset_ticker}:{order.side}"
        self._redis.zrem(cache_key, str(order.id))

    def get_best_bid(self) -> Optional[Decimal]:
        return self.bids.peekitem(-1)[0] if self.bids else None

    def get_best_ask(self) -> Optional[Decimal]:
        return self.asks.peekitem(0)[0] if self.asks else None

class MatchingEngine:
    def __init__(self, order_book: OrderBook):
        self.order_book = order_book
        self.cache = OrderBookCache(order_book.asset.ticker)
        self._load_orders()
        
    def _load_orders(self):
        """Load pending orders into cache"""
        pending_orders = Order.objects.filter(
            asset=self.order_book.asset,
            status='PENDING'
        ).select_related('asset')
        
        for order in pending_orders:
            self.cache.add_order(order)

    @transaction.atomic
    def process_order(self, order: Order) -> Tuple[bool, Decimal]:
        if order.order_type == 'MARKET':
            return self._process_market_order(order)
        return self._process_limit_order(order)

    def _process_market_order(self, order: Order) -> Tuple[bool, Decimal]:
        opposite_side = 'SELL' if order.side == 'BUY' else 'BUY'
        price_map = self.cache.asks if order.side == 'BUY' else self.cache.bids
        
        if not price_map:
            order.status = 'REJECTED'
            order.save()
            return False, Decimal('0')

        return self._match_orders(order, price_map)

    def _process_limit_order(self, order: Order) -> Tuple[bool, Decimal]:
        opposite_price_map = self.cache.asks if order.side == 'BUY' else self.cache.bids
        
        # Try to match immediately if possible
        matched, filled_amount = self._match_orders(order, opposite_price_map)
        
        # If not fully filled, add to order book
        if not matched:
            self.cache.add_order(order)
            order.status = 'PENDING'
            order.save()
            
        return matched, filled_amount

    def _match_orders(self, order: Order, price_map: SortedDict) -> Tuple[bool, Decimal]:
        remaining_size = order.size
        filled_amount = Decimal('0')
        
        while remaining_size > 0 and price_map:
            best_price, orders_at_price = price_map.peekitem(0 if order.side == 'BUY' else -1)
            
            if not self._is_price_matched(order, best_price):
                break
                
            for opposite_order in orders_at_price[:]:
                match_size = min(remaining_size, opposite_order.size)
                execution_price = opposite_order.price
                
                self._execute_trade(order, opposite_order, match_size, execution_price)
                filled_amount += match_size * execution_price
                remaining_size -= match_size
                
                if remaining_size == 0:
                    return True, filled_amount
                
        return False, filled_amount

    def _is_price_matched(self, order: Order, opposite_price: Decimal) -> bool:
        if order.order_type == 'MARKET':
            return True
            
        if order.side == 'BUY':
            return order.price >= opposite_price
        return order.price <= opposite_price

    @transaction.atomic
    def _execute_trade(self, order: Order, opposite_order: Order, size: Decimal, price: Decimal) -> None:
        execution_time = timezone.now()
        
        # Update orders
        if size == opposite_order.size:
            opposite_order.status = 'FILLED'
            self.cache.remove_order(opposite_order)
        else:
            opposite_order.size -= size
            
        opposite_order.save()
        
        if size == order.size:
            order.status = 'FILLED'
        else:
            order.size -= size
        order.save()
        
        # Update order book and cache
        self.order_book.last_price = price
        self.order_book.volume += size
        self.order_book.save()
        
        # Publish trade event
        self._publish_trade_event(order, opposite_order, size, price, execution_time)

    def _publish_trade_event(self, order: Order, opposite_order: Order, size: Decimal, 
                           price: Decimal, execution_time: datetime) -> None:
        trade_event = {
            'asset': self.order_book.asset.ticker,
            'price': str(price),
            'size': str(size),
            'timestamp': execution_time.isoformat(),
            'buyer_order_id': str(order.id if order.side == 'BUY' else opposite_order.id),
            'seller_order_id': str(order.id if order.side == 'SELL' else opposite_order.id),
        }
        
        self._redis.publish('trades', json.dumps(trade_event)) 