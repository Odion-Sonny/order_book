import sys
import os
from django.test import TestCase

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import necessary ALPACA libraries
from trading_engine import settings
from alpaca.trading.client import TradingClient

# Create your tests here.
class TestAPIAccount(TestCase):
    trading_client = TradingClient(settings.ALPACA_API_KEY, settings.ALPACA_SECRET_KEY, )

    # Fetch account information to verify if API keys are working
    try:
        account = trading_client.get_account()
        print("API is working. Account details:")
        print(f"ID: {account.id}")
        print(f"Buying Power: {account.buying_power}")
        print(f"Cash: {account.cash}")
        print(f"Status: {account.status}")
    except Exception as e:
        print(f"Failed to fetch account info. Error: {e}")