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

      {/* HUD Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Liquidity</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              <span className="text-emerald-500 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +2.5%
              </span>
              <span className="opacity-50 ml-1">vs last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cash Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight">${parseFloat(portfolio?.cash_balance || '0').toFixed(2)}</div>
            <div className="h-1 w-full bg-secondary mt-3 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[65%] rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Buying Power</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight">${parseFloat(portfolio?.buying_power || '0').toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for trade</p>
          </CardContent>
        </Card>

        <Card className={cn("border-border/50 bg-card/50 backdrop-blur-sm", totalPnL >= 0 ? "border-emerald-500/20" : "border-red-500/20")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net P&L</CardTitle>
            {totalPnL >= 0 ?
              <TrendingUp className="h-4 w-4 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> :
              <TrendingDown className="h-4 w-4 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            }
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold font-mono tracking-tight flex items-baseline gap-2", totalPnL >= 0 ? "text-emerald-400" : "text-red-400")}>
              <span>{totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnL).toFixed(2)}</span>
            </div>
            <p className={cn("text-xs font-mono mt-1", totalPnL >= 0 ? "text-emerald-500" : "text-red-500")}>
              {totalPnL >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}% All Time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg">Current Positions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[100px] text-xs uppercase tracking-wider font-semibold text-muted-foreground">Symbol</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Qty</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Avg</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Price</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Value</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">P&L ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32 text-muted-foreground text-sm">
                    No active positions. <br /> <span className="opacity-50 text-xs">Execute a trade to see it here.</span>
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((position) => {
                  const pnl = parseFloat(position.unrealized_pnl || '0');
                  const totalVal = parseFloat(position.total_value || '0');
                  return (
                    <TableRow key={position.id} className="border-border/50 hover:bg-white/5 transition-colors">
                      <TableCell className="font-bold text-foreground font-mono">{position.asset_ticker}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{parseFloat(position.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">${parseFloat(position.average_cost).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${parseFloat(position.current_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium font-mono text-foreground">${totalVal.toFixed(2)}</TableCell>
                      <TableCell className={cn("text-right font-bold font-mono", pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
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
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Recent Trades</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[100px] text-xs uppercase tracking-wider font-semibold text-muted-foreground">Symbol</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Side</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Price</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Size</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-sm">
                    No trades yet
                  </TableCell>
                </TableRow>
              ) : (
                recentTrades.map((trade) => (
                  <TableRow key={trade.id} className="border-border/50 hover:bg-white/5 transition-colors">
                    <TableCell className="font-bold text-foreground font-mono">{trade.asset_ticker}</TableCell>
                    <TableCell>
                      <Badge variant={trade.side === 'BUY' ? 'outline' : 'destructive'}
                        className={cn("text-[10px] px-2 py-0 h-5 font-mono",
                          trade.side === 'BUY' ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10" : "bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500/20")}>
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">${parseFloat(trade.price).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{parseFloat(trade.size).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs font-mono">
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
