from django.core.management.base import BaseCommand
from django.utils import timezone
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

        # Seed sample Orders & Trades for user history demonstration
        from django.contrib.auth.models import User
        from order_book.models import Order, Trade, Portfolio
        from decimal import Decimal

        demo_user = User.objects.filter(username='demo').first()
        if demo_user:
            portfolio, _ = Portfolio.objects.get_or_create(user=demo_user, defaults={'cash_balance': Decimal('100000.00'), 'buying_power': Decimal('100000.00')})
            
            sample_orders_data = [
                {'ticker': 'AAPL', 'side': 'BUY', 'type': 'LIMIT', 'price': Decimal('184.50'), 'qty': Decimal('25'), 'status': 'FILLED'},
                {'ticker': 'GOOGL', 'side': 'BUY', 'type': 'LIMIT', 'price': Decimal('141.00'), 'qty': Decimal('15'), 'status': 'FILLED'},
                {'ticker': 'MSFT', 'side': 'BUY', 'type': 'MARKET', 'price': Decimal('412.00'), 'qty': Decimal('10'), 'status': 'FILLED'},
                {'ticker': 'TSLA', 'side': 'SELL', 'type': 'LIMIT', 'price': Decimal('252.00'), 'qty': Decimal('12'), 'status': 'PENDING'},
                {'ticker': 'AMZN', 'side': 'BUY', 'type': 'LIMIT', 'price': Decimal('176.50'), 'qty': Decimal('20'), 'status': 'FILLED'},
            ]

            for odata in sample_orders_data:
                asset_obj = Asset.objects.filter(ticker=odata['ticker']).first()
                if asset_obj:
                    order = Order.objects.create(
                        user=demo_user,
                        asset=asset_obj,
                        side=odata['side'],
                        order_type=odata['type'],
                        price=odata['price'],
                        size=odata['qty'],
                        status=odata['status'],
                        executed_at=timezone.now() if odata['status'] == 'FILLED' else None
                    )
                    
                    if odata['status'] == 'FILLED':
                        counter_order = Order.objects.create(
                            user=demo_user,
                            asset=asset_obj,
                            side='SELL' if odata['side'] == 'BUY' else 'BUY',
                            order_type='LIMIT',
                            price=odata['price'],
                            size=odata['qty'],
                            status='FILLED',
                            executed_at=timezone.now()
                        )
                        Trade.objects.create(
                            buy_order=order if odata['side'] == 'BUY' else counter_order,
                            sell_order=counter_order if odata['side'] == 'BUY' else order,
                            asset=asset_obj,
                            buyer=demo_user,
                            seller=demo_user,
                            price=odata['price'],
                            size=odata['qty']
                        )

        self.stdout.write(self.style.SUCCESS('Successfully setup assets, order books, and history trades!'))