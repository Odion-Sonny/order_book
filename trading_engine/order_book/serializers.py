from rest_framework import serializers
from .order import LimitOrder, IcebergOrder

class OrderSerializer(serializers.Serializer):
    order_id = serializers.CharField()
    direction = serializers.ChoiceField(choices=['buy', 'sell'])
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    order_type = serializers.ChoiceField(choices=['limit', 'iceberg'], default='limit')
    peak = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def create(self, validated_data):
        """
        Create and return a new Order instance, given the validated data.
        """
        order_type = validated_data.pop('order_type', 'limit')
        order_id = validated_data.pop('order_id')
        quantity = int(validated_data.pop('quantity'))
        price = int(validated_data.pop('price'))
        direction = validated_data.pop('direction')
        
        if order_type == 'iceberg':
            peak = int(validated_data.pop('peak', quantity))
            return IcebergOrder(id=order_id, quantity=quantity, price=price, direction=direction, peak=peak)
        else:
            return LimitOrder(id=order_id, quantity=quantity, price=price, direction=direction)

    def to_representation(self, instance):
        """
        Convert order instance to dictionary representation.
        """
        data = {
            'order_id': instance.order_id,
            'direction': instance.direction,
            'price': str(instance.price),
            'quantity': str(instance.quantity),
            'timestamp': instance.timestamp.isoformat(),
            'order_type': 'iceberg' if hasattr(instance, 'peak') else 'limit'
        }
        if hasattr(instance, 'peak'):
            data['peak'] = str(instance.peak)
            data['hidden_quantity'] = str(instance.hidden_quantity)
        return data
