from rest_framework import serializers
from models import Order

class OrderSerializer(serializers.Serializer):
    order_id = serializers.CharField()
    direction = serializers.ChoiceField(choices=['buy', 'sell'])
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    timestamp = serializers.DateTimeField()

    def create(self, validated_data):
        """
        Create and return a new Order instance, given the validated data.
        """
        return Order(**validated_data)

    def update(self, instance, validated_data):
        """
        Update and return an existing Order instance, given the validated data.
        """
        instance.order_id = validated_data.get('order_id', instance.order_id)
        instance.direction = validated_data.get('direction', instance.direction)
        instance.price = validated_data.get('price', instance.price)
        instance.quantity = validated_data.get('quantity', instance.quantity)
        instance.timestamp = validated_data.get('timestamp', instance.timestamp)
        return instance
