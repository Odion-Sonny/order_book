from django.db import models

# Create your models here.

# Asset basically mean each stock  or commodity that will be represented in the orderbook.
class Asset(models.Model):
    name = models.CharField(max_length=100)
    ticker = models.CharField(max_length=10)
    # other fields like description, etc.

# The Order class defines the properties of a order and how it will be executed  by the matching engine.
class Order(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    quantity = models.DecimalField(max_digits=15, decimal_places=2)
    # other fields like user, timestamp, order type, etc.

# This is the core of the trading engine and it symbolizes where all orders are executed.
class OrderBook(models.Model):
    asset = models.OneToOneField(Asset, on_delete=models.CASCADE)
    # other fields like exchange, status, etc.