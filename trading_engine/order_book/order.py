from datetime import datetime

from marshmallow import fields, Schema, validates, ValidationError, post_load


class OrderDetailsSchema(Schema):
    """
    Schema for validating and deserializing order details.
    """

    id = fields.Integer(required=True)
    quantity = fields.Integer(required=True)
    price = fields.Integer(required=True)
    direction = fields.Str(required=True)
    peak = fields.Integer()

    @validates('direction')
    def check_order_type(self, value):
        """
        Validator function to check if the order direction is valid.
        """
        if value.lower() not in ['buy', 'sell']:
            raise ValidationError("unsupported order direction")


class OrderInputSchema(Schema):
    """
    Schema for validating and deserializing order input.
    """

    type = fields.Str(required=True)
    order = fields.Nested(OrderDetailsSchema, required=True)

    @validates('type')
    def check_order_type(self, value):
        """
        Validator function to check if the order type is valid.
        """
        if value.lower() not in ['limit', 'iceberg']:
            raise ValidationError("unsupported order type")

    @post_load
    def make_order(self, data, **kwargs):
        """
        Post-load function to create the appropriate order object based on the order type.
        """
        if (t := data['type'].lower()) == 'limit':
            return LimitOrder(**data['order'])
        elif t == 'iceberg':
            return IcebergOrder(**data['order'])


class Order:
    """
    Base class for orders.
    """

    def __lt__(self, other):
        """
        Compare function for less than operator.
        """
        return self.price < other.price

    def __le__(self, other):
        """
        Compare function for less than or equal to operator.
        """
        return self.price <= other.price

    def __eq__(self, other):
        """
        Compare function for equal to operator.
        """
        return self.price == other.price

    def __ne__(self, other):
        """
        Compare function for not equal to operator.
        """
        return self.price != other.price

    def __ge__(self, other):
        """
        Compare function for greater than or equal to operator.
        """
        return self.price >= other.price

    def __gt__(self, other):
        """
        Compare function for greater than operator.
        """
        return self.price > other.price

    def overview(self):
        """
        Get an overview of the order.
        """
        return dict(
            id=self.order_id, quantity=self.quantity, price=self.price
        )

    def debug(self):
        """
        Get a debug representation of the order.
        """
        return str(self.__dict__)


class LimitOrder(Order):
    """
    Class representing a limit order.
    """

    order_id = None
    quantity = None
    price = None
    direction = None
    timestamp = None

    def __init__(self, id, quantity, price, direction):
        self.order_id = id
        self.quantity = quantity
        self.price = price
        self.direction = direction.lower()
        self.timestamp = datetime.now()


class IcebergOrder(Order):
    """
    Class representing an iceberg order.
    """

    order_id = None
    quantity = None
    price = None
    direction = None
    peak = None
    hidden_quantity = None
    timestamp = None

    def __init__(self, id, quantity, price, direction, peak):
        self.order_id = id
        self.quantity = peak
        self.price = price
        self.direction = direction.lower()
        self.peak = peak
        self.hidden_quantity = quantity - peak
        self.timestamp = datetime.now()
