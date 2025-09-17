import os
import asyncio
from decimal import Decimal
from typing import Dict, List, Any
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.live import StockDataStream
from alpaca.data.requests import StockLatestQuoteRequest, StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.data.enums import DataFeed
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
                    
                    # Handle the response - try different access patterns
                    if hasattr(bars, symbol):
                        bar_list = getattr(bars, symbol)
                        for bar in bar_list:
                            result[symbol].append({
                                'timestamp': bar.timestamp.isoformat(),
                                'open': float(bar.open),
                                'high': float(bar.high),
                                'low': float(bar.low),
                                'close': float(bar.close),
                                'volume': float(bar.volume)
                            })
                    elif hasattr(bars, 'data') and hasattr(bars.data, symbol):
                        bar_list = getattr(bars.data, symbol)
                        for bar in bar_list:
                            result[symbol].append({
                                'timestamp': bar.timestamp.isoformat(),
                                'open': float(bar.open),
                                'high': float(bar.high),
                                'low': float(bar.low),
                                'close': float(bar.close),
                                'volume': float(bar.volume)
                            })
                    elif symbol in bars:
                        bar_list = bars[symbol]
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
                        logger.warning(f"No bars found for {symbol}, available keys: {dir(bars)}")
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

# Global instance
alpaca_service = AlpacaService()