from django.contrib import admin
from .models import (
    Asset, Order, OrderBook, Trade, Portfolio, Position,
    RiskLimit, AuditLog, BacktestRun, BacktestResult
)


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('ticker', 'name', 'created_at')
    search_fields = ('ticker', 'name')
    ordering = ('ticker',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('user', 'asset', 'side', 'size', 'price', 'status', 'created_at')
    list_filter = ('status', 'order_type', 'side')
    search_fields = ('user__username', 'asset__ticker')
    ordering = ('-created_at',)


@admin.register(OrderBook)
class OrderBookAdmin(admin.ModelAdmin):
    list_display = ('asset', 'last_price', 'volume', 'updated_at')
    search_fields = ('asset__ticker',)
    ordering = ('asset__ticker',)


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ('asset', 'price', 'size', 'buyer', 'seller', 'executed_at')
    list_filter = ('asset', 'executed_at')
    search_fields = ('buyer__username', 'seller__username', 'asset__ticker')
    ordering = ('-executed_at',)
    readonly_fields = ('executed_at',)


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ('user', 'cash_balance', 'buying_power', 'updated_at')
    search_fields = ('user__username',)
    ordering = ('user__username',)


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ('portfolio', 'asset', 'quantity', 'average_cost', 'current_price', 'updated_at')
    list_filter = ('asset',)
    search_fields = ('portfolio__user__username', 'asset__ticker')
    ordering = ('-updated_at',)


@admin.register(RiskLimit)
class RiskLimitAdmin(admin.ModelAdmin):
    list_display = ('user', 'max_order_size', 'max_daily_trades', 'enabled', 'updated_at')
    list_filter = ('enabled',)
    search_fields = ('user__username',)
    ordering = ('user__username',)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'ip_address', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__username', 'action')
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp',)


@admin.register(BacktestRun)
class BacktestRunAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'status', 'start_date', 'end_date', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'user__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'completed_at')


@admin.register(BacktestResult)
class BacktestResultAdmin(admin.ModelAdmin):
    list_display = ('backtest_run', 'total_trades', 'total_return_percent', 'sharpe_ratio', 'win_rate')
    search_fields = ('backtest_run__name',)
    ordering = ('-backtest_run__created_at',)
