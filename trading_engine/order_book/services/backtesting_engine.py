"""
Backtesting Engine
Executes trading strategies against historical data
"""

import pandas as pd
import numpy as np
from decimal import Decimal
from django.utils import timezone
from datetime import datetime, timedelta
from ..models import BacktestRun, BacktestResult
from .alpaca_service import alpaca_service


class BacktestEngine:
    """
    Engine for running backtests on trading strategies
    """

    def __init__(self, backtest_run):
        self.backtest_run = backtest_run
        self.initial_capital = float(backtest_run.initial_capital)
        self.cash = self.initial_capital
        self.positions = {}  # {ticker: quantity}
        self.trades = []
        self.equity_curve = []
        self.daily_returns = []

    def run(self):
        """Execute the backtest"""
        try:
            # Update status to RUNNING
            self.backtest_run.status = 'RUNNING'
            self.backtest_run.save()

            # Get historical data
            historical_data = self._fetch_historical_data()

            if historical_data.empty:
                raise Exception("No historical data available for the specified date range")

            # Execute strategy
            self._execute_strategy(historical_data)

            # Calculate metrics
            metrics = self._calculate_metrics()

            # Save results
            self._save_results(metrics)

            # Mark as completed
            self.backtest_run.status = 'COMPLETED'
            self.backtest_run.completed_at = timezone.now()
            self.backtest_run.save()

        except Exception as e:
            self.backtest_run.status = 'FAILED'
            self.backtest_run.error_message = str(e)
            self.backtest_run.completed_at = timezone.now()
            self.backtest_run.save()
            raise

    def _fetch_historical_data(self):
        """Fetch historical price data from Alpaca"""
        # For demo purposes, we'll use a simple data structure
        # In production, this would fetch from Alpaca API
        try:
            # Example: Get bars for major tech stocks
            symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN']

            all_data = []
            for symbol in symbols:
                bars = alpaca_service.get_stock_bars(
                    [symbol],
                    timeframe='1Day',
                    start=self.backtest_run.start_date.isoformat(),
                    end=self.backtest_run.end_date.isoformat(),
                    limit=1000
                )

                if symbol in bars and bars[symbol]:
                    df = pd.DataFrame(bars[symbol])
                    df['symbol'] = symbol
                    all_data.append(df)

            if all_data:
                return pd.concat(all_data, ignore_index=True)
            return pd.DataFrame()

        except Exception as e:
            print(f"Error fetching historical data: {e}")
            # Return simulated data for demonstration
            return self._generate_simulated_data()

    def _generate_simulated_data(self):
        """Generate simulated historical data for testing"""
        dates = pd.date_range(
            start=self.backtest_run.start_date,
            end=self.backtest_run.end_date,
            freq='D'
        )

        symbols = ['AAPL', 'MSFT', 'GOOGL']
        data = []

        for symbol in symbols:
            base_price = 100
            for date in dates:
                # Simulate price movement
                price_change = np.random.normal(0, 2)
                base_price += price_change

                data.append({
                    'timestamp': date,
                    'symbol': symbol,
                    'open': base_price,
                    'high': base_price + abs(np.random.normal(0, 1)),
                    'low': base_price - abs(np.random.normal(0, 1)),
                    'close': base_price,
                    'volume': np.random.randint(1000000, 10000000)
                })

        return pd.DataFrame(data)

    def _execute_strategy(self, data):
        """Execute the trading strategy defined in strategy_code"""
        # For safety, we'll implement a simple strategy here
        # In production, you might want to use exec() with strict sandboxing

        # Simple Moving Average Crossover Strategy
        self._simple_ma_strategy(data)

    def _simple_ma_strategy(self, data):
        """
        Simple moving average crossover strategy:
        - Buy when short MA crosses above long MA
        - Sell when short MA crosses below long MA
        """
        for symbol in data['symbol'].unique():
            symbol_data = data[data['symbol'] == symbol].sort_values('timestamp')

            if len(symbol_data) < 50:
                continue

            # Calculate moving averages
            symbol_data['MA_10'] = symbol_data['close'].rolling(window=10).mean()
            symbol_data['MA_30'] = symbol_data['close'].rolling(window=30).mean()

            position = 0

            for idx, row in symbol_data.iterrows():
                if pd.isna(row['MA_10']) or pd.isna(row['MA_30']):
                    continue

                current_price = row['close']

                # Buy signal: MA_10 crosses above MA_30
                if row['MA_10'] > row['MA_30'] and position == 0:
                    quantity = int(self.cash * 0.3 / current_price)  # Use 30% of cash
                    if quantity > 0:
                        cost = quantity * current_price
                        if cost <= self.cash:
                            self.cash -= cost
                            position = quantity
                            self.positions[symbol] = position

                            self.trades.append({
                                'timestamp': row['timestamp'],
                                'symbol': symbol,
                                'side': 'BUY',
                                'price': current_price,
                                'quantity': quantity,
                                'value': cost
                            })

                # Sell signal: MA_10 crosses below MA_30
                elif row['MA_10'] < row['MA_30'] and position > 0:
                    revenue = position * current_price
                    self.cash += revenue

                    self.trades.append({
                        'timestamp': row['timestamp'],
                        'symbol': symbol,
                        'side': 'SELL',
                        'price': current_price,
                        'quantity': position,
                        'value': revenue
                    })

                    position = 0
                    if symbol in self.positions:
                        del self.positions[symbol]

                # Calculate daily equity
                positions_value = sum(
                    self.positions.get(s, 0) * symbol_data[symbol_data['timestamp'] == row['timestamp']]['close'].values[0]
                    for s in self.positions
                )
                total_equity = self.cash + positions_value

                self.equity_curve.append({
                    'date': row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else str(row['timestamp']),
                    'equity': total_equity
                })

    def _calculate_metrics(self):
        """Calculate performance metrics"""
        if not self.trades:
            return {
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'total_return': 0,
                'total_return_percent': 0,
                'sharpe_ratio': 0,
                'max_drawdown': 0,
                'max_drawdown_percent': 0,
                'win_rate': 0,
                'avg_win': 0,
                'avg_loss': 0,
                'profit_factor': 0,
            }

        # Calculate returns
        final_equity = self.equity_curve[-1]['equity'] if self.equity_curve else self.initial_capital
        total_return = final_equity - self.initial_capital
        total_return_percent = (total_return / self.initial_capital) * 100

        # Analyze trades
        buy_trades = {t['timestamp']: t for t in self.trades if t['side'] == 'BUY'}
        sell_trades = [t for t in self.trades if t['side'] == 'SELL']

        wins = []
        losses = []

        for sell_trade in sell_trades:
            # Find corresponding buy trade
            buy_price = 0
            for buy_time, buy_trade in buy_trades.items():
                if buy_trade['symbol'] == sell_trade['symbol'] and buy_time < sell_trade['timestamp']:
                    buy_price = buy_trade['price']
                    break

            if buy_price > 0:
                pnl = (sell_trade['price'] - buy_price) * sell_trade['quantity']
                if pnl > 0:
                    wins.append(pnl)
                else:
                    losses.append(abs(pnl))

        # Calculate metrics
        total_trades = len(wins) + len(losses)
        winning_trades = len(wins)
        losing_trades = len(losses)
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
        avg_win = sum(wins) / len(wins) if wins else 0
        avg_loss = sum(losses) / len(losses) if losses else 0
        profit_factor = sum(wins) / sum(losses) if losses and sum(losses) > 0 else 0

        # Calculate Sharpe ratio
        if len(self.equity_curve) > 1:
            equity_series = pd.DataFrame(self.equity_curve)['equity']
            returns = equity_series.pct_change().dropna()
            sharpe_ratio = (returns.mean() / returns.std() * np.sqrt(252)) if returns.std() > 0 else 0
        else:
            sharpe_ratio = 0

        # Calculate max drawdown
        if self.equity_curve:
            equity_series = pd.DataFrame(self.equity_curve)['equity']
            cumulative_max = equity_series.expanding().max()
            drawdowns = (equity_series - cumulative_max) / cumulative_max * 100
            max_drawdown_percent = drawdowns.min()
            max_drawdown = (equity_series - cumulative_max).min()
        else:
            max_drawdown = 0
            max_drawdown_percent = 0

        return {
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'total_return': float(total_return),
            'total_return_percent': float(total_return_percent),
            'sharpe_ratio': float(sharpe_ratio),
            'max_drawdown': float(max_drawdown),
            'max_drawdown_percent': float(max_drawdown_percent),
            'win_rate': float(win_rate),
            'avg_win': float(avg_win),
            'avg_loss': float(avg_loss),
            'profit_factor': float(profit_factor),
        }

    def _save_results(self, metrics):
        """Save backtest results to database"""
        BacktestResult.objects.create(
            backtest_run=self.backtest_run,
            total_trades=metrics['total_trades'],
            winning_trades=metrics['winning_trades'],
            losing_trades=metrics['losing_trades'],
            total_return=Decimal(str(metrics['total_return'])),
            total_return_percent=Decimal(str(metrics['total_return_percent'])),
            sharpe_ratio=Decimal(str(metrics['sharpe_ratio'])),
            max_drawdown=Decimal(str(metrics['max_drawdown'])),
            max_drawdown_percent=Decimal(str(metrics['max_drawdown_percent'])),
            win_rate=Decimal(str(metrics['win_rate'])),
            avg_win=Decimal(str(metrics['avg_win'])),
            avg_loss=Decimal(str(metrics['avg_loss'])),
            profit_factor=Decimal(str(metrics['profit_factor'])),
            trades_data=self.trades,
            equity_curve=self.equity_curve
        )
