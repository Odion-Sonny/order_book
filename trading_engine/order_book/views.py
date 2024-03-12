from rest_framework import viewsets, status
from rest_framework.response import Response
from .serializers import OrderSerializer
import json
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from typing import List, Dict, Union
from pydantic import NewType
from itertools import chain
from order import OrderInputSchema, IcebergOrder, LimitOrder

_order_ids = []
_OrderTypes = NewType('orders_types', Union[IcebergOrder, LimitOrder])
_OrdersList = NewType('orders_list', List[_OrderTypes])
_buy_orders = _OrdersList([])
_sell_orders = _OrdersList([])


class OrderViewSet(viewsets.ViewSet):
    """
    A simple ViewSet for handling order operations.
    """

    def list(self, request):
        """
        Returns a JSON representation of the order book.
        """
        return Response({
            'buyOrders': [o.overview() for o in _buy_orders],
            'sellOrders': [o.overview() for o in _sell_orders]
        })
    

    serializer_class = OrderSerializer

    def create(self, request):
        """
        Adds a new order to the order book.

        Args:
            raw_order (str): The raw order string.

        Returns:
            _OrderTypes: The added order.

        Raises:
            Exception: If the order ID is duplicate.
        """
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            order = serializer.save()
            if order.order_id in _order_ids:
                return Response({"message": "duplicate order ID"}, status=status.HTTP_400_BAD_REQUEST)
            _order_ids.append(order.order_id)
            self._insort_order(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['post'])
    def execute_transactions(self, request, pk=None):
        """
        Executes transactions for a given order.

        Args:
            pk: The primary key of the order.

        Returns:
            List[Dict]: A list of executed transactions.
        """
        order_id = pk
        order = self._get_order_by_id(order_id)
        if not order:
            return Response({"message": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        executed_transaction = self._exhaust_order(order)
        transactions = list(chain(executed_transaction))
        return Response(transactions)

    def _insort_order(self, new_order):
        """
        Inserts a new order into the order book.

        Args:
            new_order: The new order to be inserted.
        """
        if new_order.direction == 'buy':
            _buy_orders.append(new_order)
            _buy_orders.sort(key=lambda i: (i.price, i.timestamp), reverse=True)
        elif new_order.direction == 'sell':
            _sell_orders.append(new_order)
            _sell_orders.sort(key=lambda i: (i.price, i.timestamp), reverse=False)

    def _exhaust_order(self, order, transactions=[]):
        """
        Exhausts an order by executing transactions.

        Args:
            order: The order to be exhausted.
            transactions: The list of transactions (default=[]).

        Returns:
            List: A list of executed transactions.
        """
        opposite_orders = _sell_orders if order.direction == 'buy' else _buy_orders
        for opposite_order in opposite_orders:
            buy_order, sell_order = self._categorize_orders(order, opposite_order)
            if buy_order >= sell_order:
                transactions.append(self._execute_transaction(buy_order, sell_order))
                if order.quantity > 0:
                    transactions = self._exhaust_order(order, transactions)
        return transactions

    def _categorize_orders(self, order1, order2):
        """
        Categorizes two orders based on their direction.

        Args:
            order1: The first order.
            order2: The second order.

        Returns:
            Tuple: A tuple containing the categorized orders.
        """
        if order1.direction == 'buy':
            buy_order = order1
            sell_order = order2
        else:
            buy_order = order2
            sell_order = order1
        return buy_order, sell_order

    def _execute_transaction(self, buy_order, sell_order):
        """
        Executes a transaction between a buy order and a sell order.

        Args:
            buy_order: The buy order.
            sell_order: The sell order.

        Returns:
            Dict: The executed transaction details.
        """
        if buy_order.quantity <= sell_order.quantity:
            quantity_exchanged = buy_order.quantity
        else:
            quantity_exchanged = buy_order.quantity - sell_order.quantity

        buy_order.quantity -= quantity_exchanged
        sell_order.quantity -= quantity_exchanged

        self._update_order_after_transaction(buy_order)
        self._update_order_after_transaction(sell_order)

        return {
            "buyOrderId": buy_order.order_id,
            "sellOrderId": sell_order.order_id,
            "price": buy_order.price,
            "quantity": quantity_exchanged
        }

    def _update_order_after_transaction(self, order):
        """
        Updates an order after a transaction.

        Args:
            order (_OrderTypes): The order to be updated.
        """
        if order.quantity == 0:
            if isinstance(order, IcebergOrder):
                if order.hidden_quantity > order.peak:
                    order.quantity = order.peak
                    order.hidden_quantity -= order.peak
                elif order.hidden_quantity == 0 and order.quantity == 0:
                    self._delete_order_with_zero_quantity(order)
                else:
                    order.quantity = order.hidden_quantity
                    order.hidden_quantity = 0
            else:
                self._delete_order_with_zero_quantity(order)

    def _delete_order_with_zero_quantity(self, order):
        """
        Deletes an order with zero quantity.

        Args:
            order: The order to be deleted.
        """
        try:
            if order.direction == 'buy':
                _buy_orders.remove(order)
            elif order.direction == 'sell':
                _sell_orders.remove(order)
        except ValueError:
            pass

    def _get_order_by_id(self, order_id):
        """
        Retrieve an order by its ID.

        Args:
            order_id: The ID of the order.

        Returns:
            _OrderTypes: The order if found, otherwise None.
        """
        for order in _buy_orders + _sell_orders:
            if order.order_id == order_id:
                return order
        return None
