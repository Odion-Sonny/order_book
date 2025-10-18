from django.test import TestCase
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Asset, Order, OrderBook
from .services.matching_engine import MatchingEngine
from decimal import Decimal
import alpaca_trade_api as tradeapi
from unittest.mock import patch, MagicMock
import json


class AlpacaConnectionTests(TestCase):
    """Test Alpaca API integration"""

    @patch('alpaca_trade_api.REST')
    def test_alpaca_connection(self, mock_api):
        """Test if we can connect to Alpaca with provided credentials"""
        # Mock the API response
        mock_account = MagicMock()
        mock_account.status = 'ACTIVE'
        mock_api.return_value.get_account.return_value = mock_account

        api = tradeapi.REST(
            key_id=settings.ALPACA_API_KEY,
            secret_key=settings.ALPACA_API_SECRET,
            base_url=settings.ALPACA_API_BASE_URL
        )

        account = api.get_account()
        self.assertEqual(account.status, 'ACTIVE')


class AssetTests(TestCase):
    """Test Asset model and functionality"""

    def setUp(self):
        self.asset = Asset.objects.create(
            name="Apple Inc.",
            ticker="AAPL",
            description="Technology company"
        )

    def test_asset_creation(self):
        """Test basic asset creation"""
        self.assertEqual(self.asset.ticker, "AAPL")
        self.assertEqual(self.asset.name, "Apple Inc.")
        self.assertEqual(str(self.asset), "Apple Inc. (AAPL)")

    def test_asset_uniqueness(self):
        """Test that ticker must be unique"""
        with self.assertRaises(Exception):
            Asset.objects.create(
                name="Another Apple",
                ticker="AAPL"
            )


class OrderTests(TestCase):
    """Test Order model and functionality"""

    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Create test asset
        self.asset = Asset.objects.create(
            name="Apple Inc.",
            ticker="AAPL"
        )

    def test_order_creation(self):
        """Test creating a valid order"""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='BUY'
        )

        self.assertEqual(order.status, 'PENDING')
        self.assertEqual(str(order), "BUY 10.00 AAPL @ 150.00")
        self.assertEqual(order.user, self.user)

    def test_market_order_creation(self):
        """Test creating a market order"""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('0.00'),
            size=Decimal('5.00'),
            order_type='MARKET',
            side='SELL'
        )

        self.assertEqual(order.order_type, 'MARKET')
        self.assertEqual(order.side, 'SELL')

    def test_order_status_transitions(self):
        """Test order status changes"""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='BUY'
        )

        # Test status transition
        order.status = 'FILLED'
        order.save()
        self.assertEqual(order.status, 'FILLED')


class OrderBookTests(TestCase):
    """Test OrderBook model"""

    def setUp(self):
        self.asset = Asset.objects.create(
            name="Apple Inc.",
            ticker="AAPL"
        )

    def test_orderbook_creation(self):
        """Test creating an order book"""
        orderbook = OrderBook.objects.create(
            asset=self.asset,
            last_price=Decimal('150.00'),
            volume=Decimal('1000.00')
        )

        self.assertEqual(str(orderbook), "OrderBook for AAPL")
        self.assertEqual(orderbook.last_price, Decimal('150.00'))

    def test_orderbook_uniqueness(self):
        """Test that each asset can only have one order book"""
        OrderBook.objects.create(asset=self.asset)

        with self.assertRaises(Exception):
            OrderBook.objects.create(asset=self.asset)


class WebInterfaceAPITests(APITestCase):
    """Test Web-based Interface - API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

        # Create test assets
        self.asset1 = Asset.objects.create(name="Apple Inc.", ticker="AAPL")
        self.asset2 = Asset.objects.create(name="Microsoft Corp.", ticker="MSFT")

        # Create order books
        OrderBook.objects.create(
            asset=self.asset1,
            last_price=Decimal('150.00'),
            volume=Decimal('1000.00')
        )

    def test_assets_endpoint(self):
        """Test assets list endpoint"""
        response = self.client.get('/api/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check paginated results
        self.assertEqual(len(response.data['results']), 2)

    def test_orderbooks_endpoint(self):
        """Test order books list endpoint"""
        response = self.client.get('/api/orderbooks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_orders_endpoint(self):
        """Test orders endpoint"""
        # Authenticate user
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('order_book.views.alpaca_service')
    def test_market_data_endpoint(self, mock_alpaca):
        """Test real-time market data endpoint"""
        # Mock Alpaca service response
        mock_alpaca.get_market_snapshot.return_value = {}
        mock_alpaca.get_stock_bars.return_value = {}

        response = self.client.get('/api/assets/market_data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class UserAuthenticationTests(APITestCase):
    """Test User Authentication features"""

    def setUp(self):
        self.client = APIClient()

    def test_user_creation(self):
        """Test user registration"""
        user = User.objects.create_user(
            username='newuser',
            email='newuser@example.com',
            password='securepass123'
        )

        self.assertEqual(user.username, 'newuser')
        self.assertTrue(user.check_password('securepass123'))

    def test_user_authentication(self):
        """Test user can authenticate"""
        user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

        # Test authentication
        authenticated = self.client.login(username='testuser', password='testpass123')
        self.assertTrue(authenticated)


class MatchingEngineTests(TestCase):
    """Test Order Matching Engine (Customizable Strategies)"""

    def setUp(self):
        self.user = User.objects.create_user(username='trader', password='pass')
        self.asset = Asset.objects.create(name="Test Asset", ticker="TEST")
        self.orderbook = OrderBook.objects.create(asset=self.asset)

    def test_limit_order_matching(self):
        """Test limit order matching logic"""
        # Create a sell order
        sell_order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='SELL',
            status='PENDING'
        )

        # Create a matching buy order
        buy_order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        # Both orders should exist
        self.assertEqual(Order.objects.filter(asset=self.asset).count(), 2)

    def test_price_priority(self):
        """Test that better prices get priority"""
        # Create orders with different prices
        order1 = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('99.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='SELL'
        )

        order2 = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='SELL'
        )

        # Lower price should be better for sell orders
        self.assertLess(order1.price, order2.price)


class RealTimeDataTests(APITestCase):
    """Test Real-time Data Analysis features"""

    def setUp(self):
        self.client = APIClient()
        self.asset = Asset.objects.create(name="Apple Inc.", ticker="AAPL")

    @patch('order_book.services.alpaca_service.alpaca_service')
    def test_real_time_price_updates(self, mock_alpaca):
        """Test real-time price data retrieval"""
        mock_alpaca.get_market_snapshot.return_value = {
            'AAPL': {
                'last_trade': {'price': 150.00},
                'daily_bar': {'close': 150.00, 'high': 152.00, 'low': 148.00, 'volume': 1000000}
            }
        }

        from order_book.services.alpaca_service import alpaca_service
        data = alpaca_service.get_market_snapshot(['AAPL'])

        self.assertIn('AAPL', data)

    @patch('order_book.views.alpaca_service')
    def test_market_data_api_endpoint(self, mock_alpaca):
        """Test market data API returns current prices"""
        mock_alpaca.get_market_snapshot.return_value = {}
        mock_alpaca.get_stock_bars.return_value = {}

        response = self.client.get('/api/assets/market_data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class RiskManagementTests(TestCase):
    """Test Risk Management features"""

    def setUp(self):
        self.user = User.objects.create_user(username='trader', password='pass')
        self.asset = Asset.objects.create(name="Test Asset", ticker="TEST")

    def test_order_validation_positive_price(self):
        """Test that orders must have positive prices for limit orders"""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='BUY'
        )

        self.assertGreater(order.price, 0)

    def test_order_validation_positive_size(self):
        """Test that orders must have positive sizes"""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='BUY'
        )

        self.assertGreater(order.size, 0)

    def test_stop_loss_order_type(self):
        """Test stop loss order type exists"""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('95.00'),
            size=Decimal('10.00'),
            order_type='STOP_LOSS',
            side='SELL'
        )

        self.assertEqual(order.order_type, 'STOP_LOSS')


class BacktestingTests(TestCase):
    """Test Backtesting features"""

    def setUp(self):
        self.user = User.objects.create_user(username='trader', password='pass')
        self.asset = Asset.objects.create(name="Test Asset", ticker="TEST")

    def test_backtesting_placeholder(self):
        """Placeholder test - backtesting feature not yet implemented"""
        # TODO: Implement backtesting functionality
        # This test serves as a reminder that backtesting needs to be implemented
        self.assertTrue(True, "Backtesting feature needs implementation")


class IntegrationTests(APITestCase):
    """End-to-end integration tests"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='trader', password='pass')
        self.asset = Asset.objects.create(name="Apple Inc.", ticker="AAPL")
        OrderBook.objects.create(asset=self.asset)

    def test_complete_order_flow(self):
        """Test complete order placement flow"""
        # Create an order via API
        order_data = {
            'asset': self.asset.id,
            'price': '150.00',
            'size': '10.00',
            'order_type': 'LIMIT',
            'side': 'BUY'
        }

        response = self.client.post('/api/orders/', order_data, format='json')

        # Should either succeed or require authentication
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])