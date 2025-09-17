from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/market-data/$', consumers.MarketDataConsumer.as_asgi()),
    re_path(r'ws/orderbook/(?P<ticker>\w+)/$', consumers.OrderBookRealtimeConsumer.as_asgi()),
    re_path(r'ws/orderbook-legacy/(?P<asset_ticker>\w+)/$', consumers.OrderBookConsumer.as_asgi()),
]