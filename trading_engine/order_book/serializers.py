from rest_framework import serializers
from .models import Asset, Order, OrderBook

class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = ['id', 'name', 'ticker', 'description']

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'asset', 'price', 'size', 'order_type', 'side', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']

class OrderBookSerializer(serializers.ModelSerializer):
    best_bid = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    best_ask = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderBook
        fields = ['id', 'asset', 'last_price', 'volume', 'best_bid', 'best_ask'] 