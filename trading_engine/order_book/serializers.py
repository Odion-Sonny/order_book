from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Asset, Order, OrderBook, Trade, Portfolio, Position,
    RiskLimit, AuditLog, BacktestRun, BacktestResult
)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = ['id', 'name', 'ticker', 'description']


class OrderSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    asset_ticker = serializers.CharField(source='asset.ticker', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'asset', 'asset_ticker', 'price', 'size', 'order_type', 'side',
                 'status', 'created_at', 'updated_at', 'executed_at']
        read_only_fields = ['status', 'created_at', 'updated_at', 'executed_at', 'user']


class OrderBookSerializer(serializers.ModelSerializer):
    best_bid = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    best_ask = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = OrderBook
        fields = ['id', 'asset', 'last_price', 'volume', 'best_bid', 'best_ask']


class TradeSerializer(serializers.ModelSerializer):
    """Serializer for Trade model"""
    asset_ticker = serializers.CharField(source='asset.ticker', read_only=True)
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    seller_username = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Trade
        fields = ['id', 'buy_order', 'sell_order', 'asset', 'asset_ticker', 'price', 'size',
                 'buyer', 'buyer_username', 'seller', 'seller_username', 'executed_at']
        read_only_fields = ['executed_at']


class PositionSerializer(serializers.ModelSerializer):
    """Serializer for Position model"""
    asset_ticker = serializers.CharField(source='asset.ticker', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    current_value = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True, source='get_current_value')
    cost_basis = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True, source='get_cost_basis')
    unrealized_pnl = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True, source='get_unrealized_pnl')
    pnl_percent = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, source='get_pnl_percent')

    class Meta:
        model = Position
        fields = ['id', 'portfolio', 'asset', 'asset_ticker', 'asset_name', 'quantity',
                 'average_cost', 'current_price', 'current_value', 'cost_basis',
                 'unrealized_pnl', 'pnl_percent', 'updated_at']
        read_only_fields = ['updated_at']


class PortfolioSerializer(serializers.ModelSerializer):
    """Serializer for Portfolio model"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    positions = PositionSerializer(many=True, read_only=True)
    total_value = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True, source='get_total_value')
    total_pnl = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True, source='get_pnl')

    class Meta:
        model = Portfolio
        fields = ['id', 'user', 'user_username', 'cash_balance', 'buying_power',
                 'total_value', 'total_pnl', 'positions', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class RiskLimitSerializer(serializers.ModelSerializer):
    """Serializer for RiskLimit model"""
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = RiskLimit
        fields = ['id', 'user', 'user_username', 'max_position_size', 'max_order_size',
                 'max_daily_loss', 'max_daily_trades', 'max_open_orders', 'leverage_limit',
                 'enabled', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model"""
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_username', 'action', 'details', 'ip_address', 'timestamp']
        read_only_fields = ['timestamp']


class BacktestResultSerializer(serializers.ModelSerializer):
    """Serializer for BacktestResult model"""
    class Meta:
        model = BacktestResult
        fields = ['total_trades', 'winning_trades', 'losing_trades', 'total_return',
                 'total_return_percent', 'sharpe_ratio', 'max_drawdown', 'max_drawdown_percent',
                 'win_rate', 'avg_win', 'avg_loss', 'profit_factor', 'trades_data', 'equity_curve']


class BacktestRunSerializer(serializers.ModelSerializer):
    """Serializer for BacktestRun model"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    result = BacktestResultSerializer(read_only=True)

    class Meta:
        model = BacktestRun
        fields = ['id', 'user', 'user_username', 'name', 'strategy_code', 'start_date',
                 'end_date', 'initial_capital', 'status', 'created_at', 'completed_at',
                 'error_message', 'result']
        read_only_fields = ['user', 'status', 'created_at', 'completed_at', 'error_message'] 