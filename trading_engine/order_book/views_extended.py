"""
Extended API Views for Portfolio, Risk Management, Backtesting, and Audit
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count, Q
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    Portfolio, Position, Trade, RiskLimit, AuditLog,
    BacktestRun, BacktestResult, Asset
)
from .serializers import (
    PortfolioSerializer, PositionSerializer, TradeSerializer,
    RiskLimitSerializer, AuditLogSerializer, BacktestRunSerializer,
    BacktestResultSerializer
)
from .services.backtesting_engine import BacktestEngine
from .services.risk_management import RiskManagementService
from .services.audit_logger import AuditLogger


class PortfolioViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing user portfolios
    """
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own portfolio
        return Portfolio.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's portfolio"""
        portfolio, created = Portfolio.objects.get_or_create(
            user=request.user,
            defaults={
                'cash_balance': Decimal('100000.00'),
                'buying_power': Decimal('100000.00')
            }
        )
        serializer = self.get_serializer(portfolio)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def performance(self, request):
        """Get portfolio performance metrics"""
        portfolio = get_object_or_404(Portfolio, user=request.user)

        # Calculate metrics
        total_value = portfolio.get_total_value()
        total_pnl = portfolio.get_pnl()

        # Get trade statistics
        trades_count = Trade.objects.filter(
            Q(buyer=request.user) | Q(seller=request.user)
        ).count()

        # Get recent trades
        recent_trades = Trade.objects.filter(
            Q(buyer=request.user) | Q(seller=request.user)
        ).order_by('-executed_at')[:10]

        return Response({
            'total_value': total_value,
            'cash_balance': portfolio.cash_balance,
            'buying_power': portfolio.buying_power,
            'unrealized_pnl': total_pnl,
            'total_trades': trades_count,
            'positions_count': portfolio.positions.count(),
            'recent_trades': TradeSerializer(recent_trades, many=True).data
        })


class PositionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing user positions (read-only)
    """
    serializer_class = PositionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Get positions for current user's portfolio
        try:
            portfolio = Portfolio.objects.get(user=self.request.user)
            return Position.objects.filter(portfolio=portfolio)
        except Portfolio.DoesNotExist:
            return Position.objects.none()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get positions summary"""
        positions = self.get_queryset()

        total_value = sum(pos.get_current_value() for pos in positions)
        total_pnl = sum(pos.get_unrealized_pnl() for pos in positions)

        return Response({
            'total_positions': positions.count(),
            'total_value': total_value,
            'total_unrealized_pnl': total_pnl,
            'positions': PositionSerializer(positions, many=True).data
        })


class TradeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing trade history (read-only)
    """
    serializer_class = TradeSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get_queryset(self):
        # Get trades where user was buyer or seller
        return Trade.objects.filter(
            Q(buyer=self.request.user) | Q(seller=self.request.user)
        ).select_related('asset', 'buyer', 'seller')

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get trade statistics"""
        trades = self.get_queryset()

        # Calculate statistics
        total_trades = trades.count()

        if total_trades == 0:
            return Response({
                'total_trades': 0,
                'total_volume': 0,
                'avg_trade_size': 0,
                'largest_trade': 0,
            })

        total_volume = sum(float(trade.price * trade.size) for trade in trades)
        avg_trade_size = total_volume / total_trades if total_trades > 0 else 0

        largest_trade = max(float(trade.price * trade.size) for trade in trades) if trades else 0

        # Recent trades by day
        today = timezone.now().date()
        trades_today = trades.filter(executed_at__date=today).count()

        return Response({
            'total_trades': total_trades,
            'total_volume': total_volume,
            'avg_trade_size': avg_trade_size,
            'largest_trade': largest_trade,
            'trades_today': trades_today,
        })


class RiskLimitViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing risk limits
    """
    serializer_class = RiskLimitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own risk limits
        return RiskLimit.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's risk limits"""
        risk_limit, created = RiskLimit.objects.get_or_create(
            user=request.user,
            defaults={
                'max_position_size': Decimal('10000.00'),
                'max_order_size': Decimal('5000.00'),
                'max_daily_loss': Decimal('5000.00'),
                'max_daily_trades': 100,
                'max_open_orders': 50,
                'leverage_limit': Decimal('1.00'),
                'enabled': True
            }
        )
        serializer = self.get_serializer(risk_limit)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Enable/disable risk limits"""
        risk_limit = self.get_object()
        risk_limit.enabled = not risk_limit.enabled
        risk_limit.save()

        AuditLogger.log(
            user=request.user,
            action='PORTFOLIO_UPDATED',
            details={
                'action': 'risk_limits_toggled',
                'enabled': risk_limit.enabled
            },
            ip_address=AuditLogger._get_client_ip(request)
        )

        return Response({
            'enabled': risk_limit.enabled,
            'message': f"Risk limits {'enabled' if risk_limit.enabled else 'disabled'}"
        })


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing audit logs (read-only)
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own audit logs
        return AuditLog.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent audit log entries"""
        limit = int(request.query_params.get('limit', 50))
        logs = self.get_queryset()[:limit]
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_action(self, request):
        """Get audit logs filtered by action type"""
        action_type = request.query_params.get('action')
        if not action_type:
            return Response({'error': 'action parameter required'}, status=400)

        logs = self.get_queryset().filter(action=action_type)
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)


class BacktestViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing and running backtests
    """
    serializer_class = BacktestRunSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own backtests
        return BacktestRun.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Create a new backtest"""
        backtest = serializer.save(user=self.request.user, status='PENDING')

        # Log backtest creation
        AuditLogger.log(
            user=self.request.user,
            action='PORTFOLIO_UPDATED',
            details={
                'action': 'backtest_created',
                'backtest_id': backtest.id,
                'name': backtest.name
            },
            ip_address=AuditLogger._get_client_ip(self.request)
        )

    @action(detail=True, methods=['post'])
    def run(self, request, pk=None):
        """Execute a backtest"""
        backtest = self.get_object()

        if backtest.status == 'RUNNING':
            return Response(
                {'error': 'Backtest is already running'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if backtest.status == 'COMPLETED':
            return Response(
                {'error': 'Backtest has already been completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Run backtest in foreground (for demo; use Celery in production)
            engine = BacktestEngine(backtest)
            engine.run()

            # Return results
            backtest.refresh_from_db()
            serializer = self.get_serializer(backtest)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get backtest results"""
        backtest = self.get_object()

        if backtest.status != 'COMPLETED':
            return Response(
                {'error': 'Backtest not completed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = backtest.result
            serializer = BacktestResultSerializer(result)
            return Response(serializer.data)
        except BacktestResult.DoesNotExist:
            return Response(
                {'error': 'Results not available'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of all backtests"""
        backtests = self.get_queryset()

        completed = backtests.filter(status='COMPLETED').count()
        running = backtests.filter(status='RUNNING').count()
        failed = backtests.filter(status='FAILED').count()
        pending = backtests.filter(status='PENDING').count()

        return Response({
            'total': backtests.count(),
            'completed': completed,
            'running': running,
            'failed': failed,
            'pending': pending,
        })
