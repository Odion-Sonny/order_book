import os
import asyncio
from decimal import Decimal
from typing import Dict, List, Any
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.live import StockDataStream
from alpaca.data.requests import StockLatestQuoteRequest, StockBarsRequest, StockTradesRequest, StockSnapshotRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import DataFeed
from alpaca.trading.requests import GetOrdersRequest
from alpaca.trading.enums import OrderStatus, QueryOrderStatus
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class AlpacaService:
    def __init__(self):
        self.api_key = os.getenv('ALPACA_API_KEY')
        self.secret_key = os.getenv('ALPACA_API_SECRET')
        self.base_url = os.getenv('ALPACA_API_BASE_URL', 'https://paper-api.alpaca.markets')
        
        self.trading_client = TradingClient(
            api_key=self.api_key,
            secret_key=self.secret_key,
            paper=True  # Set to True for paper trading
        )
        
        self.data_client = StockHistoricalDataClient(
            api_key=self.api_key,
            secret_key=self.secret_key
        )
        
        self.stream = None
        
    def get_latest_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """Get latest quotes for given symbols"""
        try:
            request = StockLatestQuoteRequest(symbol_or_symbols=symbols)
            quotes = self.data_client.get_stock_latest_quote(request)
            
            result = {}
            for symbol, quote in quotes.items():
                result[symbol] = {
                    'bid_price': float(quote.bid_price) if quote.bid_price else 0,
                    'ask_price': float(quote.ask_price) if quote.ask_price else 0,
                    'bid_size': float(quote.bid_size) if quote.bid_size else 0,
                    'ask_size': float(quote.ask_size) if quote.ask_size else 0,
                    'timestamp': quote.timestamp.isoformat() if quote.timestamp else None
                }
            return result
        except Exception as e:
            logger.error(f"Error getting latest quotes: {e}")
            return {}
    
    def get_stock_bars(self, symbols: List[str], timeframe: str = '1Day', limit: int = 100) -> Dict[str, List[Dict]]:
        """Get historical stock bars (OHLCV data)"""
        try:
            timeframe_map = {
                '1Min': TimeFrame.Minute,
                '5Min': TimeFrame(5, 'Minute'),
                '15Min': TimeFrame(15, 'Minute'),
                '1Hour': TimeFrame.Hour,
                '1Day': TimeFrame.Day
            }
            
            tf = timeframe_map.get(timeframe, TimeFrame.Day)
            result = {}
            
            # Process each symbol individually to avoid API issues
            for symbol in symbols:
                try:
                    request = StockBarsRequest(
                        symbol_or_symbols=[symbol],  # Single symbol at a time
                        timeframe=tf,
                        start=datetime.now() - timedelta(days=90),  # Reduced timeframe
                        limit=limit
                    )
                    
                    bars = self.data_client.get_stock_bars(request)
                    result[symbol] = []

                    # Handle the response - Alpaca SDK returns a BarSet object with .data dict
                    bar_list = None

                    # Try accessing via .data dictionary (most common for newer SDK)
                    if hasattr(bars, 'data') and isinstance(bars.data, dict) and symbol in bars.data:
                        bar_list = bars.data[symbol]
                    # Try direct dictionary access
                    elif isinstance(bars, dict) and symbol in bars:
                        bar_list = bars[symbol]
                    # Try attribute access
                    elif hasattr(bars, symbol):
                        bar_list = getattr(bars, symbol)
                    # Try .data attribute access
                    elif hasattr(bars, 'data') and hasattr(bars.data, symbol):
                        bar_list = getattr(bars.data, symbol)

                    if bar_list:
                        for bar in bar_list:
                            result[symbol].append({
                                'timestamp': bar.timestamp.isoformat(),
                                'open': float(bar.open),
                                'high': float(bar.high),
                                'low': float(bar.low),
                                'close': float(bar.close),
                                'volume': float(bar.volume)
                            })
                    else:
                        logger.warning(f"No bars found for {symbol}. Bars type: {type(bars)}, has data: {hasattr(bars, 'data')}")
                        if hasattr(bars, 'data'):
                            logger.warning(f"Data type: {type(bars.data)}, Data keys: {bars.data.keys() if isinstance(bars.data, dict) else 'not a dict'}")
                        result[symbol] = []
                        
                except Exception as e:
                    logger.error(f"Error getting bars for {symbol}: {e}")
                    result[symbol] = []
                    
            return result
        except Exception as e:
            logger.error(f"Error getting stock bars: {e}")
            return {symbol: [] for symbol in symbols}
    
    def get_account_info(self):
        """Get account information"""
        try:
            account = self.trading_client.get_account()
            return {
                'account_number': account.account_number,
                'status': account.status,
                'currency': account.currency,
                'buying_power': float(account.buying_power),
                'cash': float(account.cash),
                'portfolio_value': float(account.portfolio_value),
                'last_equity': float(account.last_equity)
            }
        except Exception as e:
            logger.error(f"Error getting account info: {e}")
            return {}
    
    async def setup_live_stream(self, symbols: List[str], handlers: Dict[str, Any]):
        """Setup live data stream for given symbols"""
        if not self.stream:
            self.stream = StockDataStream(
                api_key=self.api_key,
                secret_key=self.secret_key,
                feed=DataFeed.IEX  # Use IEX for free tier
            )
        
        # Subscribe to trades
        if 'trade' in handlers:
            self.stream.subscribe_trades(handlers['trade'], *symbols)
        
        # Subscribe to quotes
        if 'quote' in handlers:
            self.stream.subscribe_quotes(handlers['quote'], *symbols)
            
        # Subscribe to bars
        if 'bar' in handlers:
            self.stream.subscribe_bars(handlers['bar'], *symbols)
    
    async def start_stream(self):
        """Start the live data stream"""
        if self.stream:
            await self.stream.run()
    
    def stop_stream(self):
        """Stop the live data stream"""
        if self.stream:
            self.stream.stop()
    
    def get_recent_trades(self, symbols: List[str], limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent trade executions from Alpaca market data"""
        try:
            all_trades = []
            
            for symbol in symbols:
                try:
                    # Get recent trades for each symbol
                    request = StockTradesRequest(
                        symbol_or_symbols=[symbol],
                        start=datetime.now() - timedelta(hours=1),  # Last hour
                        limit=min(limit // len(symbols), 20)  # Distribute limit across symbols
                    )
                    
                    trades = self.data_client.get_stock_trades(request)
                    
                    # Process trades response
                    if hasattr(trades, symbol):
                        trade_list = getattr(trades, symbol)
                    elif hasattr(trades, 'data') and hasattr(trades.data, symbol):
                        trade_list = getattr(trades.data, symbol)
                    elif hasattr(trades, 'df') and not trades.df.empty:
                        # Handle DataFrame response
                        df_trades = trades.df
                        if symbol in df_trades.index.get_level_values('symbol'):
                            symbol_trades = df_trades.loc[symbol]
                            trade_list = []
                            for idx, row in symbol_trades.iterrows():
                                trade_obj = type('Trade', (), {
                                    'timestamp': idx,
                                    'price': row['price'],
                                    'size': row['size'],
                                    'conditions': getattr(row, 'conditions', []),
                                    'id': f"{symbol}_{int(idx.timestamp())}"
                                })()
                                trade_list.append(trade_obj)
                        else:
                            continue
                    else:
                        logger.warning(f"No trades found for {symbol}")
                        continue
                    
                    # Convert to standard format
                    for trade in trade_list[:10]:  # Limit per symbol
                        trade_data = {
                            'id': f"{symbol}_{int(trade.timestamp.timestamp())}_{hash(trade.price)}",
                            'asset': symbol,
                            'price': f"{float(trade.price):.2f}",
                            'size': str(int(trade.size)),
                            'timestamp': trade.timestamp.isoformat(),
                            'side': 'BUY' if hasattr(trade, 'conditions') and any('B' in str(c) for c in trade.conditions) else 'SELL',
                            'trade_type': 'MARKET',
                            'volume': f"{float(trade.price) * float(trade.size):.2f}",
                            'buyer_order_id': f"ALPACA_BUY_{hash(str(trade.timestamp))}",
                            'seller_order_id': f"ALPACA_SELL_{hash(str(trade.timestamp))}"
                        }
                        all_trades.append(trade_data)
                        
                except Exception as e:
                    logger.error(f"Error getting trades for {symbol}: {e}")
                    continue
            
            # Sort by timestamp descending
            all_trades.sort(key=lambda x: x['timestamp'], reverse=True)
            return all_trades[:limit]
            
        except Exception as e:
            logger.error(f"Error getting recent trades: {e}")
            return []
    
    def get_account_orders(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent executed orders from Alpaca account"""
        try:
            # Get recent filled orders
            request = GetOrdersRequest(
                status=QueryOrderStatus.CLOSED,
                limit=limit,
                direction='desc'  # Most recent first
            )
            
            orders = self.trading_client.get_orders(request)
            
            formatted_orders = []
            for order in orders:
                if order.status == OrderStatus.FILLED:
                    formatted_orders.append({
                        'id': str(order.id),
                        'asset': order.symbol,
                        'price': f"{float(order.filled_avg_price or order.limit_price or 0):.2f}",
                        'size': str(int(order.filled_qty or 0)),
                        'timestamp': order.filled_at.isoformat() if order.filled_at else order.created_at.isoformat(),
                        'side': order.side.value,
                        'trade_type': order.order_type.value,
                        'volume': f"{float(order.filled_avg_price or 0) * float(order.filled_qty or 0):.2f}",
                        'buyer_order_id': str(order.id) if order.side.value == 'BUY' else f"COUNTERPARTY_{hash(str(order.id))}",
                        'seller_order_id': str(order.id) if order.side.value == 'SELL' else f"COUNTERPARTY_{hash(str(order.id))}"
                    })
            
            return formatted_orders
            
        except Exception as e:
            logger.error(f"Error getting account orders: {e}")
            return []
    
    def get_market_snapshot(self, symbols: List[str]) -> Dict[str, Any]:
        """Get real-time market snapshot including last trade, quote, and daily stats"""
        try:
            request = StockSnapshotRequest(symbol_or_symbols=symbols)
            snapshots = self.data_client.get_stock_snapshot(request)
            
            result = {}
            for symbol, snapshot in snapshots.items():
                result[symbol] = {
                    'symbol': symbol,
                    'last_trade': {
                        'price': float(snapshot.latest_trade.price) if snapshot.latest_trade else 0,
                        'size': int(snapshot.latest_trade.size) if snapshot.latest_trade else 0,
                        'timestamp': snapshot.latest_trade.timestamp.isoformat() if snapshot.latest_trade and snapshot.latest_trade.timestamp else None
                    },
                    'latest_quote': {
                        'bid_price': float(snapshot.latest_quote.bid_price) if snapshot.latest_quote else 0,
                        'ask_price': float(snapshot.latest_quote.ask_price) if snapshot.latest_quote else 0,
                        'bid_size': int(snapshot.latest_quote.bid_size) if snapshot.latest_quote else 0,
                        'ask_size': int(snapshot.latest_quote.ask_size) if snapshot.latest_quote else 0,
                        'timestamp': snapshot.latest_quote.timestamp.isoformat() if snapshot.latest_quote and snapshot.latest_quote.timestamp else None
                    },
                    'daily_bar': {
                        'open': float(snapshot.daily_bar.open) if snapshot.daily_bar else 0,
                        'high': float(snapshot.daily_bar.high) if snapshot.daily_bar else 0,
                        'low': float(snapshot.daily_bar.low) if snapshot.daily_bar else 0,
                        'close': float(snapshot.daily_bar.close) if snapshot.daily_bar else 0,
                        'volume': int(snapshot.daily_bar.volume) if snapshot.daily_bar else 0,
                        'timestamp': snapshot.daily_bar.timestamp.isoformat() if snapshot.daily_bar and snapshot.daily_bar.timestamp else None
                    },
                    'prev_daily_bar': {
                        'close': float(snapshot.previous_daily_bar.close) if snapshot.previous_daily_bar else 0,
                        'timestamp': snapshot.previous_daily_bar.timestamp.isoformat() if snapshot.previous_daily_bar and snapshot.previous_daily_bar.timestamp else None
                    }
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting market snapshot: {e}")
            return {}

# Global instance
alpaca_service = AlpacaService()