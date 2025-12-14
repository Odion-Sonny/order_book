import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Activity,
  Layers,
  History,
  AlertCircle
} from 'lucide-react';
import apiService, { Portfolio as PortfolioType, Position, Trade } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Portfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [portfolioData, positionsData, tradesData] = await Promise.all([
        apiService.getCurrentPortfolio(),
        apiService.getPositions(),
        apiService.getTrades(),
      ]);

      setPortfolio(portfolioData);
      setPositions(positionsData.results || []);
      setRecentTrades((tradesData.results || []).slice(0, 10));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  const totalValue = parseFloat(portfolio?.total_value || '0');
  const totalPnL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pnl || '0'), 0);
  const pnlPercent = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">Overview of your asset performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(portfolio?.cash_balance || '0').toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buying Power</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(portfolio?.buying_power || '0').toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {totalPnL >= 0 ?
              <TrendingUp className="h-4 w-4 text-emerald-500" /> :
              <TrendingDown className="h-4 w-4 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totalPnL >= 0 ? "text-emerald-500" : "text-red-500")}>
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </div>
            <p className={cn("text-xs", totalPnL >= 0 ? "text-emerald-500" : "text-red-500")}>
              {totalPnL >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Current Positions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No positions yet. Start trading to see your positions here.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((position) => {
                  const pnl = parseFloat(position.unrealized_pnl || '0');
                  const totalVal = parseFloat(position.total_value || '0');
                  return (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">{position.asset_ticker}</TableCell>
                      <TableCell className="text-right">{parseFloat(position.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">${parseFloat(position.average_cost).toFixed(2)}</TableCell>
                      <TableCell className="text-right">${parseFloat(position.current_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${totalVal.toFixed(2)}</TableCell>
                      <TableCell className={cn("text-right font-bold", pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recent Trades</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No trades yet
                  </TableCell>
                </TableRow>
              ) : (
                recentTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.asset_ticker}</TableCell>
                    <TableCell>
                      <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'}>
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell>${parseFloat(trade.price).toFixed(2)}</TableCell>
                    <TableCell>{parseFloat(trade.size).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(trade.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Portfolio;
