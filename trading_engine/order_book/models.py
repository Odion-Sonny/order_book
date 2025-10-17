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
