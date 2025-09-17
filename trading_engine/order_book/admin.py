from django.contrib import admin
from .models import Asset, Order, OrderBook

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
