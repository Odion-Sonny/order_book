import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCw,
  AlertCircle,
  Loader2,
  Calendar,
  Code2,
  TrendingUp,
  Activity,
  Award,
  BarChart2
} from 'lucide-react';
import apiService, { Backtest } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Backtesting: React.FC = () => {
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New backtest form
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [initialCapital, setInitialCapital] = useState('100000');
  const [strategyCode, setStrategyCode] = useState('# Simple MA Strategy\npass');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    fetchBacktests();
  }, []);

  const fetchBacktests = async () => {
    try {
      const data = await apiService.getBacktests();
      setBacktests(data.results || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load backtests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBacktest = async () => {
    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      await apiService.createBacktest({
        name,
        strategy_code: strategyCode,
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
      });

      setCreateSuccess('Backtest started successfully!');
      setName('');
      setStrategyCode('# Simple MA Strategy\npass');
      fetchBacktests();

      setTimeout(() => setCreateSuccess(''), 3000);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create backtest');
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Queued</Badge>;
      case 'RUNNING':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse">Running</Badge>;
      case 'COMPLETED':
        return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Completed</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Backtesting</h1>
        <p className="text-muted-foreground">Test your trading strategies against historical data</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Create Form */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>New Simulation</CardTitle>
              <CardDescription>Configure parameters for your strategy backtest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {createError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md flex gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-md">
                  {createSuccess}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Simulation Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Mean Reversion Q1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start-date"
                      type="date"
                      className="pl-9"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="end-date"
                      type="date"
                      className="pl-9"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capital">Initial Capital ($)</Label>
                <Input
                  id="capital"
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" /> Strategy Logic (Python)
                </Label>
                <Textarea
                  id="code"
                  className="font-mono text-xs min-h-[200px] bg-slate-950 text-slate-50 border-slate-800"
                  placeholder="# Enter your strategy code here..."
                  value={strategyCode}
                  onChange={(e) => setStrategyCode(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleCreateBacktest}
                disabled={createLoading || !name || !startDate || !endDate}
              >
                {createLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running Simulation...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Run Backtest
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* History List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">History</h2>
            <Button variant="ghost" size="sm" onClick={fetchBacktests} className="h-8">
              <RotateCw className="mr-2 h-3 w-3" /> Refresh
            </Button>
          </div>

          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
            {backtests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No backtests run yet.</p>
                  <p className="text-sm">Create a simulation to see results.</p>
                </CardContent>
              </Card>
            ) : (
              backtests.map((backtest) => (
                <Card key={backtest.id} className="overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-4 space-y-0 pb-4">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {backtest.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {new Date(backtest.start_date).toLocaleDateString()} — {new Date(backtest.end_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(backtest.status)}
                  </CardHeader>

                  {backtest.results && (
                    <CardContent className="bg-slate-50/50 dark:bg-slate-900/50 pt-4 pb-4 border-t">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Return
                          </div>
                          <div className={cn(
                            "text-sm font-bold",
                            parseFloat(backtest.results.total_return) >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {parseFloat(backtest.results.total_return) >= 0 ? "+" : ""}{backtest.results.total_return_percent}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Activity className="h-3 w-3" /> Sharpe
                          </div>
                          <div className="text-sm font-bold">
                            {parseFloat(backtest.results.sharpe_ratio).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Award className="h-3 w-3" /> Win Rate
                          </div>
                          <div className="text-sm font-bold">
                            {backtest.results.win_rate}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <BarChart2 className="h-3 w-3" /> Trades
                          </div>
                          <div className="text-sm font-bold">
                            {backtest.results.total_trades}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Backtesting;
