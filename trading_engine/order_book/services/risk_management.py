"""
Risk Management Service
Handles risk validation and enforcement for trading operations
"""

from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count
from ..models import Order, Trade, Position, RiskLimit, Portfolio


class RiskManagementService:
    """
    Service class for managing trading risks
    """

    def __init__(self, user):
        self.user = user
        self.risk_limits = self._get_or_create_risk_limits()
        self.portfolio = self._get_or_create_portfolio()

    def _get_or_create_risk_limits(self):
        """Get or create risk limits for user"""
        risk_limits, created = RiskLimit.objects.get_or_create(
            user=self.user,
            defaults={
                'max_position_size': Decimal('10000.00'),
                'max_order_size': Decimal('5000.00'),
                'max_daily_loss': Decimal('5000.00'),
                'max_daily_trades': 100,
                'max_open_orders': 50,
                'leverage_limit': Decimal('1.00'),
                'enabled': True
            }
        )
        return risk_limits

    def _get_or_create_portfolio(self):
        """Get or create portfolio for user"""
        portfolio, created = Portfolio.objects.get_or_create(
            user=self.user,
            defaults={
                'cash_balance': Decimal('100000.00'),
                'buying_power': Decimal('100000.00')
            }
        )
        return portfolio

    def validate_order(self, order):
        """
        Validate order against all risk limits
        Returns (is_valid: bool, error_message: str)
        """
        if not self.risk_limits.enabled:
            return True, None

        # Validate order size
        order_value = order.price * order.size
        if order_value > self.risk_limits.max_order_size:
            return False, f"Order size ${order_value} exceeds maximum allowed ${self.risk_limits.max_order_size}"

        # Validate position size
        if not self._validate_position_size(order):
            return False, f"Position would exceed maximum position size of ${self.risk_limits.max_position_size}"

        # Validate daily trade limit
        if not self._validate_daily_trade_limit():
            return False, f"Daily trade limit of {self.risk_limits.max_daily_trades} reached"

        # Validate open orders limit
        if not self._validate_open_orders_limit():
            return False, f"Maximum open orders limit of {self.risk_limits.max_open_orders} reached"

        # Validate daily loss limit
        if not self._validate_daily_loss_limit():
            return False, f"Daily loss limit of ${self.risk_limits.max_daily_loss} reached"

        # Validate buying power
        if order.side == 'BUY':
            if not self._validate_buying_power(order):
                return False, f"Insufficient buying power. Available: ${self.portfolio.buying_power}"

        return True, None

    def _validate_position_size(self, order):
        """Check if order would exceed maximum position size"""
        try:
            position = Position.objects.get(
                portfolio=self.portfolio,
                asset=order.asset
            )
            current_quantity = position.quantity
        except Position.DoesNotExist:
            current_quantity = Decimal('0')

        # Calculate new quantity based on order side
        if order.side == 'BUY':
            new_quantity = current_quantity + order.size
        else:  # SELL
            new_quantity = abs(current_quantity - order.size)

        position_value = new_quantity * order.price
        return position_value <= self.risk_limits.max_position_size

    def _validate_daily_trade_limit(self):
        """Check if daily trade limit is exceeded"""
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

        trades_today = Trade.objects.filter(
            buyer=self.user,
            executed_at__gte=today_start
        ).count() + Trade.objects.filter(
            seller=self.user,
            executed_at__gte=today_start
        ).count()

        return trades_today < self.risk_limits.max_daily_trades

    def _validate_open_orders_limit(self):
        """Check if open orders limit is exceeded"""
        open_orders = Order.objects.filter(
            user=self.user,
            status='PENDING'
        ).count()

        return open_orders < self.risk_limits.max_open_orders

    def _validate_daily_loss_limit(self):
        """Check if daily loss limit is exceeded"""
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

        # Calculate P&L from today's trades
        buy_trades = Trade.objects.filter(
            buyer=self.user,
            executed_at__gte=today_start
        )

        sell_trades = Trade.objects.filter(
            seller=self.user,
            executed_at__gte=today_start
        )

        total_buy_cost = sum(trade.price * trade.size for trade in buy_trades)
        total_sell_revenue = sum(trade.price * trade.size for trade in sell_trades)

        daily_pnl = total_sell_revenue - total_buy_cost

        # If losing money, check if loss exceeds limit
        if daily_pnl < 0:
            return abs(daily_pnl) < self.risk_limits.max_daily_loss

        return True

    def _validate_buying_power(self, order):
        """Check if user has sufficient buying power"""
        order_cost = order.price * order.size
        return self.portfolio.buying_power >= order_cost

    def update_buying_power(self, order, is_filled=False):
        """Update buying power when order is placed or filled"""
        order_value = order.price * order.size

        if order.side == 'BUY':
            if not is_filled:
                # Reserve buying power when order is placed
                self.portfolio.buying_power -= order_value
            else:
                # Deduct from cash when filled
                self.portfolio.cash_balance -= order_value
        else:  # SELL
            if is_filled:
                # Add to cash when filled
                self.portfolio.cash_balance += order_value
                self.portfolio.buying_power += order_value

        self.portfolio.save()

    def restore_buying_power(self, order):
        """Restore buying power when a buy order is cancelled"""
        if order.side == 'BUY' and order.status == 'CANCELLED':
            order_value = order.price * order.size
            # Restore the reserved buying power
            self.portfolio.buying_power += order_value
            self.portfolio.save()

    def update_position(self, trade):
        """Update position after trade execution"""
        # Update buyer's position
        self._update_user_position(
            user=trade.buyer,
            asset=trade.asset,
            quantity_change=trade.size,
            price=trade.price,
            is_buy=True
        )

        # Update seller's position
        self._update_user_position(
            user=trade.seller,
            asset=trade.asset,
            quantity_change=trade.size,
            price=trade.price,
            is_buy=False
        )

    def _update_user_position(self, user, asset, quantity_change, price, is_buy):
        """Update a user's position in an asset"""
        try:
            portfolio = Portfolio.objects.get(user=user)
        except Portfolio.DoesNotExist:
            return

        position, created = Position.objects.get_or_create(
            portfolio=portfolio,
            asset=asset,
            defaults={
                'quantity': Decimal('0'),
                'average_cost': Decimal('0'),
                'current_price': price
            }
        )

        if is_buy:
            # Calculate new average cost
            total_cost = (position.quantity * position.average_cost) + (quantity_change * price)
            new_quantity = position.quantity + quantity_change
            if new_quantity > 0:
                position.average_cost = total_cost / new_quantity
            position.quantity = new_quantity
        else:
            # Reduce quantity on sell
            position.quantity -= quantity_change

        position.current_price = price
        position.save()

        # Close position if quantity is zero or negative
        if position.quantity <= 0:
            position.delete()
