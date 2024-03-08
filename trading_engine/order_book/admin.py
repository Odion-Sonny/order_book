from django.contrib import admin
from .models import (Trader, Asset, Order, OrderBook, Trade)


# Register your models here.
admin.site.register(
    [
        Trader,
        Asset,
        Order,
        OrderBook,
        Trade
    ]
)

