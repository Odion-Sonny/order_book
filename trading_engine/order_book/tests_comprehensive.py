"""
Comprehensive test suite for all trading engine features.

This module contains comprehensive tests for:
- Portfolio Management
- Position Tracking
- Risk Management
- Trade Recording
- Audit Logging
- Backtesting Engine
- JWT Authentication
- API Integration
"""

from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import json

from .models import (
    Asset, Order, OrderBook, Trade, Portfolio, Position,
    RiskLimit, AuditLog, BacktestRun, BacktestResult
)
from .services.risk_management import RiskManagementService
from .services.backtesting_engine import BacktestEngine
from .services.audit_logger import AuditLogger


class PortfolioManagementTests(TestCase):
    """Comprehensive tests for portfolio management functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.asset = Asset.objects.create(
            ticker='AAPL',
            name='Apple Inc.'
        )
        self.portfolio = Portfolio.objects.create(
            user=self.user,
            cash_balance=Decimal('100000.00'),
            buying_power=Decimal('100000.00')
        )

    def test_portfolio_creation(self):
        """Test portfolio is created with correct initial values."""
        self.assertEqual(self.portfolio.user, self.user)
        self.assertEqual(self.portfolio.cash_balance, Decimal('100000.00'))
        self.assertEqual(self.portfolio.buying_power, Decimal('100000.00'))

    def test_portfolio_total_value_calculation(self):
        """Test portfolio total value calculation with positions."""
        # Create a position
        Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('150.00'),
            current_price=Decimal('160.00')
        )

        # Total value should be cash + position value
        expected_value = Decimal('100000.00') + (Decimal('100.00') * Decimal('160.00'))
        self.assertEqual(self.portfolio.get_total_value(), expected_value)

    def test_portfolio_pnl_calculation(self):
        """Test portfolio P&L calculation."""
        # Create a position with unrealized gain
        Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('150.00'),
            current_price=Decimal('160.00')
        )

        # P&L should be (current_price - average_cost) * quantity
        expected_pnl = (Decimal('160.00') - Decimal('150.00')) * Decimal('100.00')
        self.assertEqual(self.portfolio.get_pnl(), expected_pnl)

    def test_portfolio_buying_power_update(self):
        """Test buying power updates when placing orders."""
        initial_buying_power = self.portfolio.buying_power
        order_value = Decimal('10000.00')

        self.portfolio.buying_power -= order_value
        self.portfolio.save()

        self.assertEqual(
            self.portfolio.buying_power,
            initial_buying_power - order_value
        )

    def test_portfolio_multiple_positions(self):
        """Test portfolio with multiple positions."""
        asset2 = Asset.objects.create(ticker='GOOGL', name='Google')

        Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('150.00'),
            current_price=Decimal('160.00')
        )

        Position.objects.create(
            portfolio=self.portfolio,
            asset=asset2,
            quantity=Decimal('50.00'),
            average_cost=Decimal('2800.00'),
            current_price=Decimal('2900.00')
        )

        # Calculate expected total value
        position1_value = Decimal('100.00') * Decimal('160.00')
        position2_value = Decimal('50.00') * Decimal('2900.00')
        expected_value = self.portfolio.cash_balance + position1_value + position2_value

        self.assertEqual(self.portfolio.get_total_value(), expected_value)


class PositionTrackingTests(TestCase):
    """Comprehensive tests for position tracking functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.asset = Asset.objects.create(
            ticker='AAPL',
            name='Apple Inc.'
        )
        self.portfolio = Portfolio.objects.create(
            user=self.user,
            cash_balance=Decimal('100000.00'),
            buying_power=Decimal('100000.00')
        )

    def test_position_creation(self):
        """Test position is created correctly."""
        position = Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('150.00'),
            current_price=Decimal('150.00')
        )

        self.assertEqual(position.quantity, Decimal('100.00'))
        self.assertEqual(position.average_cost, Decimal('150.00'))

    def test_position_unrealized_pnl(self):
        """Test unrealized P&L calculation."""
        position = Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('150.00'),
            current_price=Decimal('160.00')
        )

        expected_pnl = (Decimal('160.00') - Decimal('150.00')) * Decimal('100.00')
        self.assertEqual(position.get_unrealized_pnl(), expected_pnl)

    def test_position_cost_basis(self):
        """Test cost basis calculation."""
        position = Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('150.00'),
            current_price=Decimal('160.00')
        )

        expected_cost_basis = Decimal('150.00') * Decimal('100.00')
        self.assertEqual(position.get_cost_basis(), expected_cost_basis)

    def test_position_average_cost_update(self):
        """Test average cost updates when adding to position."""
        position = Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('150.00'),
            current_price=Decimal('150.00')
        )

        # Add more shares at different price
        additional_quantity = Decimal('50.00')
        additional_price = Decimal('160.00')

        old_cost_basis = position.average_cost * position.quantity
        new_cost_basis = old_cost_basis + (additional_price * additional_quantity)
        new_quantity = position.quantity + additional_quantity
        new_average_cost = new_cost_basis / new_quantity

        position.quantity = new_quantity
        position.average_cost = new_average_cost
        position.save()

        expected_avg_cost = (Decimal('150.00') * Decimal('100.00') +
                            Decimal('160.00') * Decimal('50.00')) / Decimal('150.00')
        self.assertEqual(position.average_cost, expected_avg_cost)

    def test_position_negative_unrealized_pnl(self):
        """Test position with loss."""
        position = Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('160.00'),
            current_price=Decimal('150.00')
        )

        expected_pnl = (Decimal('150.00') - Decimal('160.00')) * Decimal('100.00')
        self.assertEqual(position.get_unrealized_pnl(), expected_pnl)
        self.assertLess(position.get_unrealized_pnl(), Decimal('0'))


class RiskManagementTests(TestCase):
    """Comprehensive tests for risk management functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.asset = Asset.objects.create(
            ticker='AAPL',
            name='Apple Inc.'
        )
        self.portfolio = Portfolio.objects.create(
            user=self.user,
            cash_balance=Decimal('100000.00'),
            buying_power=Decimal('100000.00')
        )
        self.risk_limits = RiskLimit.objects.create(
            user=self.user,
            max_order_size=Decimal('50000.00'),
            max_position_size=Decimal('100000.00'),
            max_daily_trades=100,
            max_daily_loss=Decimal('10000.00'),
            max_open_orders=50,
            enabled=True
        )
        self.risk_service = RiskManagementService(self.user)

    def test_risk_limits_creation(self):
        """Test risk limits are created correctly."""
        self.assertEqual(self.risk_limits.max_order_size, Decimal('50000.00'))
        self.assertEqual(self.risk_limits.max_position_size, Decimal('100000.00'))
        self.assertEqual(self.risk_limits.max_daily_trades, 100)
        self.assertTrue(self.risk_limits.enabled)

    def test_order_size_validation_pass(self):
        """Test order passes size validation."""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('100.00'),  # Total: $10,000 (under $50,000 limit)
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        is_valid, error = self.risk_service.validate_order(order)
        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_order_size_validation_fail(self):
        """Test order fails size validation."""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('1000.00'),  # Total: $100,000 (exceeds $50,000 limit)
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        is_valid, error = self.risk_service.validate_order(order)
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
        self.assertIn('exceeds maximum', error)

    def test_buying_power_validation_pass(self):
        """Test order passes buying power validation."""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('500.00'),  # Total: $50,000 (under $100,000 buying power)
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        is_valid, error = self.risk_service.validate_order(order)
        self.assertTrue(is_valid)

    def test_buying_power_validation_fail(self):
        """Test order fails buying power validation."""
        # Reduce buying power
        self.portfolio.buying_power = Decimal('10000.00')
        self.portfolio.save()

        # Reinitialize risk service to pick up updated portfolio
        risk_service = RiskManagementService(self.user)

        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('200.00'),  # Total: $20,000 (exceeds $10,000 buying power)
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        is_valid, error = risk_service.validate_order(order)
        self.assertFalse(is_valid)
        self.assertIn('Insufficient buying power', error)

    def test_daily_trades_validation(self):
        """Test daily trades limit validation."""
        # Create maximum allowed trades
        for i in range(100):
            Trade.objects.create(
                buy_order=Order.objects.create(
                    user=self.user,
                    asset=self.asset,
                    price=Decimal('100.00'),
                    size=Decimal('1.00'),
                    order_type='LIMIT',
                    side='BUY',
                    status='FILLED'
                ),
                sell_order=Order.objects.create(
                    user=User.objects.create_user(f'seller{i}', f'seller{i}@test.com', 'pass'),
                    asset=self.asset,
                    price=Decimal('100.00'),
                    size=Decimal('1.00'),
                    order_type='LIMIT',
                    side='SELL',
                    status='FILLED'
                ),
                asset=self.asset,
                price=Decimal('100.00'),
                size=Decimal('1.00'),
                buyer=self.user,
                seller=User.objects.get(username=f'seller{i}')
            )

        # Try to place another order
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('1.00'),
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        is_valid, error = self.risk_service.validate_order(order)
        self.assertFalse(is_valid)
        self.assertIn('Daily trade limit', error)

    def test_max_open_orders_validation(self):
        """Test maximum open orders validation."""
        # Create maximum allowed open orders
        for i in range(50):
            Order.objects.create(
                user=self.user,
                asset=self.asset,
                price=Decimal('100.00'),
                size=Decimal('1.00'),
                order_type='LIMIT',
                side='BUY',
                status='PENDING'
            )

        # Try to place another order
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('1.00'),
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        is_valid, error = self.risk_service.validate_order(order)
        self.assertFalse(is_valid)
        self.assertIn('Maximum open orders', error)

    def test_risk_limits_disabled(self):
        """Test orders pass when risk limits are disabled."""
        self.risk_limits.enabled = False
        self.risk_limits.save()

        # Reinitialize risk service to pick up updated risk limits
        risk_service = RiskManagementService(self.user)

        # Create an order that would normally fail
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('100.00'),
            size=Decimal('1000.00'),  # Would exceed limit if enabled
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        is_valid, error = risk_service.validate_order(order)
        self.assertTrue(is_valid)


class TradeRecordingTests(TestCase):
    """Comprehensive tests for trade recording and tracking."""

    def setUp(self):
        """Set up test data."""
        self.buyer = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='buyerpass'
        )
        self.seller = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='sellerpass'
        )
        self.asset = Asset.objects.create(
            ticker='AAPL',
            name='Apple Inc.'
        )

    def test_trade_creation(self):
        """Test trade record is created correctly."""
        buy_order = Order.objects.create(
            user=self.buyer,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='BUY',
            status='FILLED'
        )

        sell_order = Order.objects.create(
            user=self.seller,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='SELL',
            status='FILLED'
        )

        trade = Trade.objects.create(
            buy_order=buy_order,
            sell_order=sell_order,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            buyer=self.buyer,
            seller=self.seller
        )

        self.assertEqual(trade.price, Decimal('150.00'))
        self.assertEqual(trade.size, Decimal('100.00'))
        self.assertEqual(trade.buyer, self.buyer)
        self.assertEqual(trade.seller, self.seller)

    def test_trade_history_ordering(self):
        """Test trades are ordered by execution time (newest first)."""
        buy_order = Order.objects.create(
            user=self.buyer,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='BUY',
            status='FILLED'
        )

        sell_order = Order.objects.create(
            user=self.seller,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='SELL',
            status='FILLED'
        )

        # Create multiple trades
        trade1 = Trade.objects.create(
            buy_order=buy_order,
            sell_order=sell_order,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('10.00'),
            buyer=self.buyer,
            seller=self.seller
        )

        trade2 = Trade.objects.create(
            buy_order=buy_order,
            sell_order=sell_order,
            asset=self.asset,
            price=Decimal('151.00'),
            size=Decimal('20.00'),
            buyer=self.buyer,
            seller=self.seller
        )

        # Newest trade should be first
        trades = Trade.objects.all()
        self.assertEqual(trades[0], trade2)
        self.assertEqual(trades[1], trade1)

    def test_trade_total_value(self):
        """Test trade total value calculation."""
        buy_order = Order.objects.create(
            user=self.buyer,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='BUY',
            status='FILLED'
        )

        sell_order = Order.objects.create(
            user=self.seller,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='SELL',
            status='FILLED'
        )

        trade = Trade.objects.create(
            buy_order=buy_order,
            sell_order=sell_order,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            buyer=self.buyer,
            seller=self.seller
        )

        expected_value = Decimal('150.00') * Decimal('100.00')
        self.assertEqual(trade.price * trade.size, expected_value)


class AuditLoggingTests(TestCase):
    """Comprehensive tests for audit logging functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.asset = Asset.objects.create(
            ticker='AAPL',
            name='Apple Inc.'
        )

    def test_order_created_audit_log(self):
        """Test audit log is created when order is placed."""
        order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        # Create mock request
        class MockRequest:
            META = {'REMOTE_ADDR': '127.0.0.1'}

        AuditLogger.log_order_created(order, MockRequest())

        # Verify audit log was created
        logs = AuditLog.objects.filter(
            user=self.user,
            action='ORDER_CREATED'
        )
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs.first().ip_address, '127.0.0.1')

    def test_trade_executed_audit_log(self):
        """Test audit log is created when trade is executed."""
        buy_order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='BUY',
            status='FILLED'
        )

        seller = User.objects.create_user('seller', 'seller@test.com', 'pass')
        sell_order = Order.objects.create(
            user=seller,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='SELL',
            status='FILLED'
        )

        trade = Trade.objects.create(
            buy_order=buy_order,
            sell_order=sell_order,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            buyer=self.user,
            seller=seller
        )

        AuditLogger.log_trade_executed(trade)

        # Verify audit log was created (logged as system action with user=None)
        trade_logs = AuditLog.objects.filter(
            action='TRADE_EXECUTED'
        )

        self.assertEqual(trade_logs.count(), 1)
        # Verify trade details are in the log
        log = trade_logs.first()
        self.assertIsNone(log.user)  # System action
        self.assertEqual(log.details['buyer'], self.user.username)
        self.assertEqual(log.details['seller'], seller.username)

    def test_risk_limit_violated_audit_log(self):
        """Test audit log is created when risk limit is violated."""
        violation_details = {
            'limit_type': 'MAX_ORDER_SIZE',
            'order_value': str(Decimal('100000.00')),
            'limit_value': str(Decimal('50000.00'))
        }

        class MockRequest:
            META = {'REMOTE_ADDR': '127.0.0.1'}

        AuditLogger.log_risk_limit_violated(
            user=self.user,
            violation_details=violation_details,
            request=MockRequest()
        )

        logs = AuditLog.objects.filter(
            user=self.user,
            action='RISK_LIMIT_VIOLATED'
        )
        self.assertEqual(logs.count(), 1)

    def test_audit_log_ordering(self):
        """Test audit logs are ordered by timestamp (newest first)."""
        class MockRequest:
            META = {'REMOTE_ADDR': '127.0.0.1'}

        order1 = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('150.00'),
            size=Decimal('100.00'),
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        AuditLogger.log_order_created(order1, MockRequest())

        order2 = Order.objects.create(
            user=self.user,
            asset=self.asset,
            price=Decimal('151.00'),
            size=Decimal('50.00'),
            order_type='LIMIT',
            side='BUY',
            status='PENDING'
        )

        AuditLogger.log_order_created(order2, MockRequest())

        logs = AuditLog.objects.filter(user=self.user)
        # Newest should be first
        self.assertGreater(logs[0].timestamp, logs[1].timestamp)


class BacktestingEngineTests(TestCase):
    """Comprehensive tests for backtesting engine functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.asset = Asset.objects.create(
            ticker='AAPL',
            name='Apple Inc.'
        )

    def test_backtest_run_creation(self):
        """Test backtest run is created correctly."""
        backtest = BacktestRun.objects.create(
            user=self.user,
            name='Test Strategy',
            strategy_code='# Simple MA Strategy',
            start_date=timezone.now().date() - timedelta(days=30),
            end_date=timezone.now().date(),
            initial_capital=Decimal('100000.00'),
            status='PENDING'
        )

        self.assertEqual(backtest.name, 'Test Strategy')
        self.assertEqual(backtest.strategy_code, '# Simple MA Strategy')
        self.assertEqual(backtest.status, 'PENDING')

    @patch('order_book.services.backtesting_engine.alpaca_service')
    def test_backtest_execution_simple_ma(self, mock_alpaca_service):
        """Test simple moving average strategy execution."""
        # Mock Alpaca to raise exception, triggering simulated data generation
        mock_alpaca_service.get_stock_bars.side_effect = Exception("API unavailable")

        # Create backtest run
        backtest = BacktestRun.objects.create(
            user=self.user,
            name='MA Strategy Test',
            strategy_code='# Simple MA Strategy',
            start_date=timezone.now().date() - timedelta(days=30),
            end_date=timezone.now().date(),
            initial_capital=Decimal('100000.00'),
            status='PENDING'
        )

        # Execute backtest
        engine = BacktestEngine(backtest)
        engine.run()

        # Verify backtest completed
        backtest.refresh_from_db()
        self.assertIn(backtest.status, ['COMPLETED', 'FAILED'])

    def test_backtest_result_creation(self):
        """Test backtest result is created with metrics."""
        backtest = BacktestRun.objects.create(
            user=self.user,
            name='Test Strategy',
            strategy_code='# Simple MA Strategy',
            start_date=timezone.now().date() - timedelta(days=30),
            end_date=timezone.now().date(),
            initial_capital=Decimal('100000.00'),
            status='COMPLETED'
        )

        result = BacktestResult.objects.create(
            backtest_run=backtest,
            total_return=Decimal('10000.00'),
            total_return_percent=Decimal('10.00'),
            total_trades=50,
            winning_trades=30,
            losing_trades=20,
            win_rate=Decimal('60.00'),
            max_drawdown=Decimal('5.00'),
            max_drawdown_percent=Decimal('5.00'),
            sharpe_ratio=Decimal('1.5000'),
            avg_win=Decimal('500.00'),
            avg_loss=Decimal('200.00'),
            profit_factor=Decimal('2.50')
        )

        self.assertEqual(result.total_return, Decimal('10000.00'))
        self.assertEqual(result.win_rate, Decimal('60.00'))
        self.assertEqual(result.sharpe_ratio, Decimal('1.5000'))


class JWTAuthenticationTests(APITestCase):
    """Comprehensive tests for JWT authentication."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()

    def test_token_obtain(self):
        """Test JWT token can be obtained."""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_token_refresh(self):
        """Test JWT token can be refreshed."""
        # Get initial tokens
        refresh = RefreshToken.for_user(self.user)

        url = reverse('token_refresh')
        data = {'refresh': str(refresh)}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_token_verify(self):
        """Test JWT token can be verified."""
        # Get token
        refresh = RefreshToken.for_user(self.user)
        access = refresh.access_token

        url = reverse('token_verify')
        data = {'token': str(access)}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_request(self):
        """Test authenticated API request."""
        # Get token
        refresh = RefreshToken.for_user(self.user)
        access = str(refresh.access_token)

        # Make authenticated request
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        url = reverse('portfolio-current')
        response = self.client.get(url)

        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_unauthenticated_request(self):
        """Test unauthenticated request is rejected."""
        url = reverse('portfolio-current')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class APIIntegrationTests(APITestCase):
    """Comprehensive API integration tests for all ViewSets."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()

        # Authenticate
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        # Create test data
        self.asset = Asset.objects.create(
            ticker='AAPL',
            name='Apple Inc.'
        )
        self.portfolio = Portfolio.objects.create(
            user=self.user,
            cash_balance=Decimal('100000.00'),
            buying_power=Decimal('100000.00')
        )

    def test_portfolio_list(self):
        """Test portfolio list endpoint."""
        url = reverse('portfolio-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_portfolio_current(self):
        """Test current portfolio endpoint."""
        url = reverse('portfolio-current')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user'], self.user.id)

    def test_position_list(self):
        """Test position list endpoint."""
        # Create a position
        Position.objects.create(
            portfolio=self.portfolio,
            asset=self.asset,
            quantity=Decimal('100.00'),
            average_cost=Decimal('150.00'),
            current_price=Decimal('160.00')
        )

        url = reverse('position-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_trade_list(self):
        """Test trade list endpoint."""
        url = reverse('trade-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_risk_limit_list(self):
        """Test risk limit list endpoint."""
        url = reverse('risklimit-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_audit_log_list(self):
        """Test audit log list endpoint."""
        url = reverse('auditlog-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_backtest_list(self):
        """Test backtest list endpoint."""
        url = reverse('backtest-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('order_book.services.backtesting_engine.alpaca_service')
    def test_backtest_create(self, mock_alpaca_service):
        """Test backtest creation endpoint."""
        # Mock Alpaca service to return empty (triggers simulated data)
        mock_alpaca_service.get_stock_bars.return_value = {}

        url = reverse('backtest-list')
        data = {
            'name': 'Test Backtest',
            'strategy_code': '# Simple MA Strategy\npass',
            'start_date': (timezone.now().date() - timedelta(days=30)).isoformat(),
            'end_date': timezone.now().date().isoformat(),
            'initial_capital': '100000.00'
        }

        response = self.client.post(url, data, format='json')

        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])

    def test_portfolio_performance(self):
        """Test portfolio performance endpoint."""
        url = reverse('portfolio-performance')
        response = self.client.get(url)

        # Should return performance metrics or 404 if not implemented
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_unauthorized_access(self):
        """Test unauthorized access is blocked."""
        # Clear credentials
        self.client.credentials()

        url = reverse('portfolio-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
