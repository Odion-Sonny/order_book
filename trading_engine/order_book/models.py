from django.db import models
# Create your models here.


class Asset(models.Model):
    """
    Represents an asset, such as a stock or commodity, that will be represented in the order book.
    """

    name = models.CharField(max_length=100)
    ticker = models.CharField(max_length=10)

    def __str__(self):
        return self.name
    
class Order(models.Model):
    DIRECTION_CHOICES = (
        ('buy', 'Buy'),
        ('sell', 'Sell')
    )

    id = models.AutoField(primary_key=True)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, default=None)
    quantity = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    direction = models.CharField(max_length=4, choices=DIRECTION_CHOICES, default = None)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-price', 'timestamp']

    def __str__(self):
        return f"Order {self.id}"

    def overview(self):
        """
        Get an overview of the order.
        """
        return {
            'id': self.id,
            'asset': self.asset.name,
            'quantity': self.quantity,
            'price': str(self.price),
            'direction': self.direction
        }
