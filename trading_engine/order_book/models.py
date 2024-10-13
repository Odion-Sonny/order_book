from django.db import models
from django.contrib.auth.models import User

# Create your models here.

# Asset basically mean each stock  or commodity that will be represented in the orderbook.
class Asset(models.Model):
    name = models.CharField(max_length=100)
    ticker = models.CharField(max_length=10)
    # other fields like description may be needed.

# The Order class defines the properties of a order and how it will be executed  by the matching engine.
class Order(models.Model):
    ORDER_TYPES = [
        ('LIMIT', 'Limit'),
        ('MARKET', 'Market'),
        ('STOP_LOSS', 'Stop Loss'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    size = models.DecimalField(max_digits=15, decimal_places=2)
    order_type = models.CharField(max_length=20, choices=ORDER_TYPES)
    # other fields like user & timestamp will be needed to know whose order to execute first

# This is the core of the trading engine and it symbolizes where all orders are executed.
class OrderBook(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    asset = models.OneToOneField(Asset, on_delete=models.CASCADE)
    # other fields like exchange, status may be needed.