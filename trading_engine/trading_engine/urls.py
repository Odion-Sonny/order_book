"""
URL configuration for trading_engine project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

from order_book.views import AssetViewSet, OrderViewSet, OrderBookViewSet, trades_list
from order_book.views_extended import (
    PortfolioViewSet,
    PositionViewSet,
    TradeViewSet,
    RiskLimitViewSet,
    AuditLogViewSet,
    BacktestViewSet,
)

# Swagger/OpenAPI Schema
schema_view = get_schema_view(
    openapi.Info(
        title="Trading Engine API",
        default_version='v1',
        description="""
        Complete Trading Engine API with Portfolio Management, Risk Controls, and Backtesting

        Features:
        - Real-time market data from Alpaca
        - Order management with limit, market, and stop-loss orders
        - Portfolio tracking with P&L calculations
        - Risk management and compliance
        - Backtesting engine for strategy validation
        - Comprehensive audit logging
        """,
        terms_of_service="https://www.example.com/terms/",
        contact=openapi.Contact(email="contact@tradingengine.local"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

# DRF Router
router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'orderbooks', OrderBookViewSet, basename='orderbook')
router.register(r'portfolios', PortfolioViewSet, basename='portfolio')
router.register(r'positions', PositionViewSet, basename='position')
router.register(r'trades', TradeViewSet, basename='trade')
router.register(r'risk-limits', RiskLimitViewSet, basename='risklimit')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'backtests', BacktestViewSet, basename='backtest')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/', include(router.urls)),
    path('api/trades-list/', trades_list, name='trades-list'),

    # JWT Authentication
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # API Documentation (Swagger/OpenAPI)
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('', schema_view.with_ui('swagger', cache_timeout=0), name='api-docs'),  # Root redirects to API docs
]
