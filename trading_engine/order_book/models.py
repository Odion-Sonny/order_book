from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser

# Create your models here.

class Trader(AbstractUser):
    """
    Represents a trader that will be using the trading engine.
    Inherits from the AbstractUser class.
    """

    pass


class Asset(models.Model):
    """
    Represents an asset, such as a stock or commodity, that will be represented in the order book.
    """

    name = models.CharField(max_length=100)
    ticker = models.CharField(max_length=10)
    # other fields like description may be needed.


class Order(models.Model):
    """
    Represents an order and defines its properties and how it will be executed by the matching engine.
    """

    ORDER_TYPES = [
        ('LIMIT', 'Limit'),
        ('MARKET', 'Market'),
        ('STOP_LOSS', 'Stop Loss'),
    ]
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    size = models.DecimalField(max_digits=15, decimal_places=2)
    order_type = models.CharField(max_length=20, choices=ORDER_TYPES)
    timestamp = models.DateTimeField(default=timezone.now)
    # other fields like user will be needed to know whose order is being executed.


class OrderBook(models.Model):
    """
    Represents the core of the trading engine where all orders are executed.
    """

    asset = models.OneToOneField(Asset, on_delete=models.CASCADE)
    # other fields like exchange, status may be needed.


class Trade(models.Model):
    """
    Represents a trade that has occurred in the trading engine.
    """

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    size = models.DecimalField(max_digits=15, decimal_places=2)
    timestamp = models.DateTimeField(default=timezone.now)
    # other fields like buyer, seller, order_id may be needed.