from django.test import TestCase
from ..trading_engine.settings import 

# Import necessary ALPACA libraries
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import GetCalendarRequest


# Create your tests here.
class TestAPIAccount(TestCase):
    trading_client = TradingClient(settings.ALPACA_API_KEY, settings.ALPACA_SECRET_KEY, )

    # Fetch account information to verify if API keys are working
    try:
        account = trading_client.get_account()
        print("API is working. Account details:")
        print(f"ID: {account.account_id}")
        print(f"Cash: {account.cash}")
        print(f"Status: {account.status}")
    except Exception as e:
        print(f"Failed to fetch account info. Error: {e}")