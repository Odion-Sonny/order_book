import os
import asyncio
from decimal import Decimal
from typing import Dict, List, Any
try:
    from alpaca.trading.client import TradingClient
    from alpaca.data.historical import StockHistoricalDataClient
    from alpaca.data.live import StockDataStream
    from alpaca.data.requests import StockLatestQuoteRequest, StockBarsRequest, StockTradesRequest, StockSnapshotRequest
    from alpaca.data.timeframe import TimeFrame, TimeFrameUnit
    from alpaca.data.enums import DataFeed
    from alpaca.common.enums import Sort
    from alpaca.trading.requests import GetOrdersRequest
    from alpaca.trading.enums import OrderStatus, QueryOrderStatus
    HAS_ALPACA_SDK = True
except ImportError:
    HAS_ALPACA_SDK = False
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
        # Free Alpaca accounts only have IEX. Requesting SIP without a market-data
        # subscription fails the whole request, so IEX is the safe default.
        self.data_feed = os.getenv('ALPACA_DATA_FEED', 'iex').lower()

        # Without credentials the SDK raises on construction, which would break the
        # import of every module that touches this service. Stay unconfigured
        # instead; the methods below already fall back to mock data.
        self.trading_client = None
        self.data_client = None

        if HAS_ALPACA_SDK and self.api_key and self.secret_key:
            try:
                self.trading_client = TradingClient(
                    api_key=self.api_key,
                    secret_key=self.secret_key,
                    paper=True  # Set to True for paper trading
                )

                self.data_client = StockHistoricalDataClient(
                    api_key=self.api_key,
                    secret_key=self.secret_key
                )
            except Exception as e:
                logger.error(f"Alpaca client init failed, using mock data: {e}")
        elif HAS_ALPACA_SDK:
            logger.warning(
                "ALPACA_API_KEY / ALPACA_API_SECRET not set - serving mock quotes "
                "and empty bars. Add them to trading_engine/.env for live data."
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
            mock_prices = {'AAPL': 185.50, 'GOOGL': 142.20, 'MSFT': 415.30, 'TSLA': 248.80, 'AMZN': 178.10}
            result = {}
            for s in symbols:
                base = mock_prices.get(s, 100.0)
                result[s] = {
                    'bid_price': round(base - 0.05, 2),
                    'ask_price': round(base + 0.05, 2),
                    'bid_size': 100,
                    'ask_size': 100,
                    'timestamp': timezone.now().isoformat()
                }
            return result
    
    # How much wall-clock time one bar of each timeframe covers, used to work out
    # how far back to start when the caller only gives a bar count.
    _TIMEFRAME_DAYS = {
        '1Min': 1 / 390,
        '5Min': 5 / 390,
        '15Min': 15 / 390,
        '1Hour': 1 / 7,
        '4Hour': 4 / 7,
        '1Day': 1,
        '1Week': 7,
        '1Month': 31,
    }

    def _timeframe(self, timeframe: str):
        """Map a UI timeframe string onto an Alpaca TimeFrame."""
        # The unit must be a TimeFrameUnit; passing the plain string 'Minute'
        # blows up later inside the SDK when it reads unit.value.
        return {
            '1Min': TimeFrame.Minute,
            '5Min': TimeFrame(5, TimeFrameUnit.Minute),
            '15Min': TimeFrame(15, TimeFrameUnit.Minute),
            '1Hour': TimeFrame.Hour,
            '4Hour': TimeFrame(4, TimeFrameUnit.Hour),
            '1Day': TimeFrame.Day,
            '1Week': TimeFrame.Week,
            '1Month': TimeFrame.Month,
        }.get(timeframe, TimeFrame.Day)

    def get_stock_bars(self, symbols: List[str], timeframe: str = '1Day', limit: int = 100,
                       start=None, end=None) -> Dict[str, List[Dict]]:
        """
        Get historical stock bars (OHLCV data).

        `start` / `end` accept dates, datetimes or ISO strings. When `start` is
        omitted it is derived from `limit` and the timeframe, so requesting 260
        weekly bars really does reach five years back.
        """
        if not self.data_client:
            raise RuntimeError(
                "Alpaca credentials are not configured - set ALPACA_API_KEY and "
                "ALPACA_API_SECRET in trading_engine/.env"
            )

        try:
            tf = self._timeframe(timeframe)

            if isinstance(start, str):
                start = datetime.fromisoformat(start)
            if isinstance(end, str):
                end = datetime.fromisoformat(end)

            result = {}
            errors = {}

            # Process each symbol individually to avoid API issues
            for symbol in symbols:
                try:
                    if start is None:
                        # Span the requested number of bars, with a 60% buffer for
                        # weekends and holidays.
                        per_bar = self._TIMEFRAME_DAYS.get(timeframe, 1)
                        days_to_fetch = max(int(limit * per_bar * 1.6), 2)
                        bar_start = datetime.now() - timedelta(days=days_to_fetch)
                    else:
                        bar_start = start

                    # Alpaca applies `limit` from the start of the window, so an
                    # ascending request returns the OLDEST bars and the chart ends
                    # in the past. Ask for the newest first, then flip to ascending.
                    newest_first = start is None

                    request = StockBarsRequest(
                        symbol_or_symbols=[symbol],  # Single symbol at a time
                        timeframe=tf,
                        start=bar_start,
                        end=end,
                        limit=limit,
                        feed=DataFeed.SIP if self.data_feed == 'sip' else DataFeed.IEX,
                        sort=Sort.DESC if newest_first else Sort.ASC,
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
                        if newest_first:
                            bar_list = list(reversed(bar_list))
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
                    # Swallowing this used to surface as a bare "no bars", hiding
                    # subscription and credential errors. Keep the reason.
                    logger.error(f"Error getting bars for {symbol} (feed={self.data_feed}): {e}")
                    errors[symbol] = str(e)
                    result[symbol] = []

            if errors and not any(result.values()):
                raise RuntimeError(
                    f"Alpaca returned no bars ({self.data_feed} feed): "
                    f"{next(iter(errors.values()))}"
                )

            return result
        except RuntimeError:
            raise  # already a diagnosed failure; let the caller report it
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
        if not HAS_ALPACA_SDK:
            logger.info("Alpaca SDK not initialized; starting simulated tick generator.")
            self._sim_handlers = handlers
            self._sim_symbols = symbols
            return

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
        if HAS_ALPACA_SDK and self.stream:
            await self.stream.run()
        elif hasattr(self, '_sim_handlers'):
            # Simulated live tick generator
            import random
            bar_handler = self._sim_handlers.get('bar')
            while True:
                await asyncio.sleep(2)
                if bar_handler:
                    for sym in getattr(self, '_sim_symbols', ['AAPL']):
                        base = 185.0 if sym == 'AAPL' else 250.0
                        price = round(base + random.uniform(-1.5, 1.5), 2)
                        class SimBar:
                            pass
                        b = SimBar()
                        b.symbol = sym
                        b.open = price - 0.2
                        b.high = price + 0.5
                        b.low = price - 0.5
                        b.close = price
                        b.volume = random.randint(100, 5000)
                        b.timestamp = timezone.now()
                        await bar_handler(b)
    
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