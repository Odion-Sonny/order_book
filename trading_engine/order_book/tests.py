from django.test import TestCase
from django.conf import settings
from .models import Asset, Order, OrderBook
from decimal import Decimal
import alpaca_trade_api as tradeapi
from unittest.mock import patch

class AlpacaConnectionTests(TestCase):
    def setUp(self):
        self.api_key = settings.ALPACA_API_KEY
        self.api_secret = settings.ALPACA_API_SECRET
        self.base_url = settings.ALPACA_API_BASE_URL
        
    def test_alpaca_connection(self):
        """Test if we can connect to Alpaca with provided credentials"""
        api = tradeapi.REST(
            key_id=self.api_key,
            secret_key=self.api_secret,
            base_url=self.base_url
        )
        try:
            account = api.get_account()
            self.assertTrue(account.status == 'ACTIVE')
        except Exception as e:
            self.fail(f"Failed to connect to Alpaca: {str(e)}")

class AssetTests(TestCase):
    @patch('alpaca_trade_api.REST')
    def setUp(self, mock_api):
        # Mock the Alpaca API response for asset data
        mock_api.return_value.get_asset.return_value = type(
            'Asset', (), {
                'symbol': 'AAPL',
                'name': 'Apple Inc.',
                'tradable': True
            }
        )
        
        self.asset = Asset.objects.create(
            name="Apple Inc.",
            ticker="AAPL"
        )

    def test_asset_creation(self):
        self.assertEqual(self.asset.ticker, "AAPL")
        self.assertEqual(str(self.asset), "Apple Inc. (AAPL)")

class OrderTests(TestCase):
    @patch('alpaca_trade_api.REST')
    def setUp(self, mock_api):
        # Mock the Alpaca API responses
        mock_api.return_value.get_asset.return_value = type(
            'Asset', (), {
                'symbol': 'AAPL',
                'name': 'Apple Inc.',
                'tradable': True
            }
        )
        
        self.asset = Asset.objects.create(
            name="Apple Inc.",
            ticker="AAPL"
        )
        
    @patch('alpaca_trade_api.REST')
    def test_order_creation(self, mock_api):
        # Mock the Alpaca API order response
        mock_api.return_value.submit_order.return_value = type(
            'Order', (), {
                'symbol': 'AAPL',
                'qty': '10',
                'side': 'buy',
                'type': 'limit',
                'limit_price': '150.00',
                'status': 'pending'
            }
        )
        
        order = Order.objects.create(
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('10.00'),
            order_type='LIMIT',
            side='BUY'
        )
        
        self.assertEqual(order.status, 'PENDING')
        self.assertEqual(str(order), "BUY 10.00 AAPL @ 150.00")

    @patch('alpaca_trade_api.REST')
    def test_market_data_access(self, mock_api):
        # Mock the Alpaca API market data response
        mock_api.return_value.get_latest_trade.return_value = type(
            'Trade', (), {
                'symbol': 'AAPL',
                'price': 150.00,
                'size': 100
            }
        )
        
        api = tradeapi.REST(
            key_id=settings.ALPACA_API_KEY,
            secret_key=settings.ALPACA_API_SECRET,
            base_url=settings.ALPACA_API_BASE_URL
        )
        
        latest_trade = api.get_latest_trade('AAPL')
        self.assertEqual(latest_trade.price, 150.00)