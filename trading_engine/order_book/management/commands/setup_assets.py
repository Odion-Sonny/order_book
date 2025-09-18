from django.core.management.base import BaseCommand
from order_book.models import Asset, OrderBook
from order_book.services.alpaca_service import alpaca_service

class Command(BaseCommand):
    help = 'Setup initial assets and order books with Alpaca data'

    def handle(self, *args, **options):
        # Define the assets we want to trade
        assets_data = [
            {'name': 'Apple Inc.', 'ticker': 'AAPL', 'description': 'Technology company'},
            {'name': 'Alphabet Inc.', 'ticker': 'GOOGL', 'description': 'Technology company'},
            {'name': 'Microsoft Corporation', 'ticker': 'MSFT', 'description': 'Technology company'},
            {'name': 'Tesla Inc.', 'ticker': 'TSLA', 'description': 'Electric vehicle manufacturer'},
            {'name': 'Amazon.com Inc.', 'ticker': 'AMZN', 'description': 'E-commerce and cloud computing'},
        ]

        symbols = [asset['ticker'] for asset in assets_data]
        
        # Get latest quotes from Alpaca
        self.stdout.write('Fetching latest quotes from Alpaca...')
        quotes = alpaca_service.get_latest_quotes(symbols)
        
        for asset_data in assets_data:
            ticker = asset_data['ticker']
            
            # Create or update asset
            asset, created = Asset.objects.get_or_create(
                ticker=ticker,
                defaults={
                    'name': asset_data['name'],
                    'description': asset_data['description']
                }
            )
            
            if created:
                self.stdout.write(f'Created asset: {asset}')
            else:
                self.stdout.write(f'Asset already exists: {asset}')
            
            # Create or update order book
            order_book, created = OrderBook.objects.get_or_create(
                asset=asset,
                defaults={'last_price': None, 'volume': 0}
            )
            
            # Update with real market data if available
            if ticker in quotes and quotes[ticker]['ask_price'] > 0:
                # Use mid-price as last price
                mid_price = (quotes[ticker]['bid_price'] + quotes[ticker]['ask_price']) / 2
                order_book.last_price = mid_price
                order_book.save()
                self.stdout.write(f'Updated {ticker} last price to ${mid_price:.2f}')
            
            if created:
                self.stdout.write(f'Created order book for: {asset.ticker}')
        
        self.stdout.write(self.style.SUCCESS('Successfully setup assets and order books!'))