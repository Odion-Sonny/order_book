import asyncio
from typing import Dict, Any
import pandas as pd
from django.utils import timezone
from asgiref.sync import sync_to_async
from .models import LiveBot, Portfolio, Position, Trade

class LiveBotEngine:
    """
    Engine for executing live trading strategies on real-time WebSocket ticks.
    """
    def __init__(self, bot_id: int):
        self.bot_id = bot_id
        self.bot = None
        self.code_globals = None
        
        # In-memory storage for real-time bars
        self.market_data = pd.DataFrame(columns=['symbol', 'open', 'high', 'low', 'close', 'volume', 'timestamp'])
        
    async def initialize(self):
        self.bot = await sync_to_async(LiveBot.objects.get)(id=self.bot_id)
        
        from RestrictedPython import compile_restricted
        from RestrictedPython.Guards import safe_builtins
        
        self.code_globals = {
            '__builtins__': safe_builtins,
            'pd': pd,
            'len': len,
            'int': int,
            'float': float,
        }
        
        try:
            byte_code = compile_restricted(self.bot.strategy_code, '<inline>', 'exec')
            exec(byte_code, self.code_globals)
        except Exception as e:
            self.bot.status = 'FAILED'
            self.bot.error_message = str(e)
            await sync_to_async(self.bot.save)()
            raise

    async def on_tick(self, tick_data: Dict[str, Any]):
        """
        Called when a new tick/bar arrives from the WebSocket stream.
        """
        if self.bot.status != 'RUNNING':
            return
            
        if 'on_data' not in self.code_globals:
            return

        # Append to our in-memory dataframe
        new_row = pd.DataFrame([tick_data])
        self.market_data = pd.concat([self.market_data, new_row], ignore_index=True)
        
        # Provide portfolio context (mocked for now, needs DB fetch)
        cash = 100000.00
        positions = {}
        
        def buy(symbol, qty):
            print(f"[Bot {self.bot_id}] BUY {qty} {symbol}")
            # Real implementation would create an Order via Alpaca/DB

        def sell(symbol, qty):
            print(f"[Bot {self.bot_id}] SELL {qty} {symbol}")
            # Real implementation would create an Order via Alpaca/DB

        try:
            self.code_globals['on_data'](self.market_data, cash, positions, buy, sell)
        except Exception as e:
            print(f"[Bot {self.bot_id}] Error executing on_data: {e}")
            self.bot.status = 'FAILED'
            self.bot.error_message = str(e)
            await sync_to_async(self.bot.save)()
