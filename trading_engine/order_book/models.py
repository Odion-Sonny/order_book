from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

# Create your models here.


class Asset(models.Model):
    """
    Represents an asset, such as a stock or commodity, that will be represented in the order book.
    """

    name = models.CharField(max_length=100)
    ticker = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.ticker})"

    class Meta:
        indexes = [
            models.Index(fields=['ticker']),
        ]


class Order(models.Model):
    """
    Represents an order and defines its properties and how it will be executed by the matching engine.
    """

    ORDER_TYPES = [
        ('LIMIT', 'Limit'),
        ('MARKET', 'Market'),
        ('STOP_LOSS', 'Stop Loss'),
    ]

    SIDE_CHOICES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('FILLED', 'Filled'),
        ('CANCELLED', 'Cancelled'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    size = models.DecimalField(max_digits=15, decimal_places=2)
    order_type = models.CharField(max_length=20, choices=ORDER_TYPES)
    side = models.CharField(max_length=4, choices=SIDE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    executed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.side} {self.size} {self.asset.ticker} @ {self.price}"

    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['asset', 'created_at']),
        ]


class OrderBook(models.Model):
    """
    Represents the core of the trading engine where all orders are executed.
    """

    asset = models.OneToOneField(Asset, on_delete=models.CASCADE)
    last_price = models.DecimalField(max_digits=15, decimal_places=2, null=True)
    volume = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"OrderBook for {self.asset.ticker}"

    class Meta:
        indexes = [
            models.Index(fields=['asset', 'updated_at']),
        ]


class Trade(models.Model):
    """
    Represents an executed trade between two orders.
    """
    buy_order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='buy_trades')
    sell_order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='sell_trades')
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    size = models.DecimalField(max_digits=15, decimal_places=2)
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='buy_trades')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sell_trades')
    executed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trade: {self.size} {self.asset.ticker} @ {self.price}"

    class Meta:
        indexes = [
            models.Index(fields=['asset', 'executed_at']),
            models.Index(fields=['buyer', 'executed_at']),
            models.Index(fields=['seller', 'executed_at']),
        ]
        ordering = ['-executed_at']


class Portfolio(models.Model):
    """
    Represents a user's portfolio with cash balance and buying power.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    cash_balance = models.DecimalField(max_digits=20, decimal_places=2, default=100000.00)
    buying_power = models.DecimalField(max_digits=20, decimal_places=2, default=100000.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Portfolio for {self.user.username}"

    def get_total_value(self):
        """Calculate total portfolio value including positions"""
        positions_value = sum(
            position.get_current_value()
            for position in self.positions.all()
        )
        return self.cash_balance + positions_value

    def get_pnl(self):
        """Calculate unrealized P&L"""
        positions_pnl = sum(
            position.get_unrealized_pnl()
            for position in self.positions.all()
        )
        return positions_pnl

    class Meta:
        indexes = [
            models.Index(fields=['user']),
        ]


class Position(models.Model):
    """
    Represents a user's open position in an asset.
    """
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='positions')
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    average_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.portfolio.user.username} - {self.quantity} {self.asset.ticker}"

    def get_current_value(self):
        """Calculate current value of position"""
        return self.quantity * self.current_price

    def get_cost_basis(self):
        """Calculate cost basis of position"""
        return self.quantity * self.average_cost

    def get_unrealized_pnl(self):
        """Calculate unrealized profit/loss"""
        return self.get_current_value() - self.get_cost_basis()

    def get_pnl_percent(self):
        """Calculate P&L percentage"""
        cost_basis = self.get_cost_basis()
        if cost_basis == 0:
            return 0
        return (self.get_unrealized_pnl() / cost_basis) * 100

    class Meta:
        indexes = [
            models.Index(fields=['portfolio', 'asset']),
        ]
        unique_together = ['portfolio', 'asset']


class RiskLimit(models.Model):
    """
    Defines risk management limits for a user.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    max_position_size = models.DecimalField(max_digits=15, decimal_places=2, default=10000.00,
                                           help_text="Maximum size for a single position")
    max_order_size = models.DecimalField(max_digits=15, decimal_places=2, default=5000.00,
                                        help_text="Maximum size for a single order")
    max_daily_loss = models.DecimalField(max_digits=15, decimal_places=2, default=5000.00,
                                        help_text="Maximum loss allowed per day")
    max_daily_trades = models.IntegerField(default=100,
                                          help_text="Maximum number of trades per day")
    max_open_orders = models.IntegerField(default=50,
                                         help_text="Maximum number of open orders")
    leverage_limit = models.DecimalField(max_digits=5, decimal_places=2, default=1.00,
                                        help_text="Maximum leverage multiplier")
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Risk Limits for {self.user.username}"

    class Meta:
        indexes = [
            models.Index(fields=['user']),
        ]


class AuditLog(models.Model):
    """
    Logs all significant actions for compliance and debugging.
    """
    ACTION_CHOICES = [
        ('ORDER_CREATED', 'Order Created'),
        ('ORDER_CANCELLED', 'Order Cancelled'),
        ('ORDER_FILLED', 'Order Filled'),
        ('ORDER_REJECTED', 'Order Rejected'),
        ('TRADE_EXECUTED', 'Trade Executed'),
        ('POSITION_OPENED', 'Position Opened'),
        ('POSITION_CLOSED', 'Position Closed'),
        ('PORTFOLIO_UPDATED', 'Portfolio Updated'),
        ('RISK_LIMIT_VIOLATED', 'Risk Limit Violated'),
        ('USER_LOGIN', 'User Login'),
        ('USER_LOGOUT', 'User Logout'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} by {self.user.username if self.user else 'System'} at {self.timestamp}"

    class Meta:
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
        ]
        ordering = ['-timestamp']


class BacktestRun(models.Model):
    """
    Represents a backtest execution.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    strategy_code = models.TextField(help_text="Python code for the trading strategy")
    start_date = models.DateField()
    end_date = models.DateField()
    initial_capital = models.DecimalField(max_digits=20, decimal_places=2, default=100000.00)
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ], default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"Backtest: {self.name} ({self.status})"

    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]
        ordering = ['-created_at']


class BacktestResult(models.Model):
    """
    Stores results and metrics from a backtest run.
    """
    backtest_run = models.OneToOneField(BacktestRun, on_delete=models.CASCADE, related_name='result')
    total_trades = models.IntegerField(default=0)
    winning_trades = models.IntegerField(default=0)
    losing_trades = models.IntegerField(default=0)
    total_return = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_return_percent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sharpe_ratio = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    max_drawdown = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_drawdown_percent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    win_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    avg_win = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    avg_loss = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    profit_factor = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    trades_data = models.JSONField(default=list, help_text="List of all trades executed")
    equity_curve = models.JSONField(default=list, help_text="Daily equity values")

    def __str__(self):
        return f"Results for {self.backtest_run.name}"
