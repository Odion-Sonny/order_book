"""
Audit Logging Service
Logs all significant actions for compliance and debugging
"""

from ..models import AuditLog


class AuditLogger:
    """
    Service for logging audit events
    """

    @staticmethod
    def log(user, action, details=None, ip_address=None):
        """
        Log an audit event

        Args:
            user: User object or None for system actions
            action: Action type (must be in AuditLog.ACTION_CHOICES)
            details: Dictionary with additional information
            ip_address: IP address of the request
        """
        if details is None:
            details = {}

        AuditLog.objects.create(
            user=user,
            action=action,
            details=details,
            ip_address=ip_address
        )

    @staticmethod
    def log_order_created(order, request=None):
        """Log order creation"""
        AuditLogger.log(
            user=order.user,
            action='ORDER_CREATED',
            details={
                'order_id': order.id,
                'asset': order.asset.ticker,
                'side': order.side,
                'order_type': order.order_type,
                'price': str(order.price),
                'size': str(order.size)
            },
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_order_filled(order, request=None):
        """Log order fill"""
        AuditLogger.log(
            user=order.user,
            action='ORDER_FILLED',
            details={
                'order_id': order.id,
                'asset': order.asset.ticker,
                'side': order.side,
                'price': str(order.price),
                'size': str(order.size),
                'executed_at': order.executed_at.isoformat() if order.executed_at else None
            },
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_order_cancelled(order, request=None):
        """Log order cancellation"""
        AuditLogger.log(
            user=order.user,
            action='ORDER_CANCELLED',
            details={
                'order_id': order.id,
                'asset': order.asset.ticker,
                'side': order.side,
                'price': str(order.price),
                'size': str(order.size)
            },
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_order_rejected(user, order_details, reason, request=None):
        """Log order rejection"""
        details = order_details.copy() if order_details else {}
        details['rejection_reason'] = reason

        AuditLogger.log(
            user=user,
            action='ORDER_REJECTED',
            details=details,
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_trade_executed(trade, request=None):
        """Log trade execution"""
        AuditLogger.log(
            user=None,  # System action
            action='TRADE_EXECUTED',
            details={
                'trade_id': trade.id,
                'asset': trade.asset.ticker,
                'price': str(trade.price),
                'size': str(trade.size),
                'buyer': trade.buyer.username,
                'seller': trade.seller.username,
                'buy_order_id': trade.buy_order.id,
                'sell_order_id': trade.sell_order.id
            },
            ip_address=None
        )

    @staticmethod
    def log_position_opened(position, request=None):
        """Log position opening"""
        AuditLogger.log(
            user=position.portfolio.user,
            action='POSITION_OPENED',
            details={
                'position_id': position.id,
                'asset': position.asset.ticker,
                'quantity': str(position.quantity),
                'average_cost': str(position.average_cost)
            },
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_position_closed(user, asset_ticker, final_quantity, final_pnl, request=None):
        """Log position closing"""
        AuditLogger.log(
            user=user,
            action='POSITION_CLOSED',
            details={
                'asset': asset_ticker,
                'final_quantity': str(final_quantity),
                'final_pnl': str(final_pnl)
            },
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_portfolio_updated(portfolio, change_details, request=None):
        """Log portfolio update"""
        AuditLogger.log(
            user=portfolio.user,
            action='PORTFOLIO_UPDATED',
            details={
                'portfolio_id': portfolio.id,
                'cash_balance': str(portfolio.cash_balance),
                'buying_power': str(portfolio.buying_power),
                'total_value': str(portfolio.get_total_value()),
                'changes': change_details
            },
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_risk_limit_violated(user, violation_details, request=None):
        """Log risk limit violation"""
        AuditLogger.log(
            user=user,
            action='RISK_LIMIT_VIOLATED',
            details=violation_details,
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_user_login(user, request=None):
        """Log user login"""
        AuditLogger.log(
            user=user,
            action='USER_LOGIN',
            details={
                'timestamp': user.last_login.isoformat() if user.last_login else None
            },
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def log_user_logout(user, request=None):
        """Log user logout"""
        AuditLogger.log(
            user=user,
            action='USER_LOGOUT',
            details={},
            ip_address=AuditLogger._get_client_ip(request) if request else None
        )

    @staticmethod
    def _get_client_ip(request):
        """Extract client IP address from request"""
        if not request:
            return None

        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
