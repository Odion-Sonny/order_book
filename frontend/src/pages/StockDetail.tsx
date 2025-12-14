import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
  BarChart2,
  AlertCircle
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import apiService, { Asset } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

interface Trade {
  id: string | number;
  asset?: string;
  asset_ticker?: string;
  price: string;
  size: string;
  side: string;
  timestamp: string;
  buyer_order_id?: string;
  seller_order_id?: string;
}

interface ChartBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const StockDetail: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [chartData, setChartData] = useState<ChartBar[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');

  useEffect(() => {
    if (ticker) {
      fetchStockData();
      fetchTrades();
      const tradesInterval = setInterval(fetchTrades, 3000);
      const marketInterval = setInterval(() => {
        fetchAssetInfo();
      }, 10000);

      return () => {
        clearInterval(tradesInterval);
        clearInterval(marketInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, timeframe]);

  const fetchAssetInfo = async () => {
    try {
      const marketData = await apiService.getMarketData();
      const foundAsset = marketData.find((a: Asset) => a.ticker === ticker);
      if (foundAsset) {
        setAsset(foundAsset);
      }
    } catch (err: any) {
      console.error('Failed to update asset info:', err);
    }
  };

  const fetchStockData = async () => {
    try {
      const marketData = await apiService.getMarketData();
      const foundAsset = marketData.find((a: Asset) => a.ticker === ticker);
      if (foundAsset) {
        setAsset(foundAsset);
      }
      const bars = await fetchChartData();
      setChartData(bars);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (): Promise<ChartBar[]> => {
    const timeframeConfig: Record<string, { barTimeframe: string; limit: number }> = {
      '1D': { barTimeframe: '1Hour', limit: 24 },
      '1W': { barTimeframe: '1Hour', limit: 168 },
      '1M': { barTimeframe: '1Day', limit: 30 },
      '3M': { barTimeframe: '1Day', limit: 90 },
      '1Y': { barTimeframe: '1Day', limit: 365 },
    };

    const config = timeframeConfig[timeframe];
    // In a real app, this URL should be dynamic from environment
    const url = `http://localhost:8000/api/assets/chart_data/?ticker=${ticker}&timeframe=${config.barTimeframe}&limit=${config.limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch chart data: ${response.status}`);
      const data = await response.json();
      return data.bars || [];
    } catch (err) {
      console.error('Error fetching chart data:', err);
      return [];
    }
  };

  const fetchTrades = async () => {
    try {
      const allTrades = await apiService.getTradeHistory();
      const stockTrades = allTrades.filter(
        (trade: Trade) => (trade.asset_ticker === ticker || trade.asset === ticker)
      );
      setTrades(stockTrades.slice(0, 30));
    } catch (err: any) {
      console.error('Failed to load trades:', err);
    }
  };

  const memoizedChartData = React.useMemo(() => {
    const candlestickData = chartData.map((bar) => ({
      x: new Date(bar.timestamp).getTime(),
      o: bar.open,
      h: bar.high,
      l: bar.low,
      c: bar.close,
    }));

    return {
      datasets: [
        {
          label: ticker,
          data: candlestickData,
          borderColors: {
            up: '#10b981', // emerald-500
            down: '#ef4444', // red-500
            unchanged: '#94a3b8', // slate-400
          },
          backgroundColors: {
            up: 'rgba(16, 185, 129, 0.8)',
            down: 'rgba(239, 68, 68, 0.8)',
            unchanged: 'rgba(148, 163, 184, 0.8)',
          },
        },
      ],
    };
  }, [chartData, ticker]);

  const memoizedTrades = React.useMemo(() => trades, [trades]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { right: 10 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)', // slate-950
        titleColor: '#f8fafc', // slate-50
        bodyColor: '#f8fafc',
        borderColor: '#334155', // slate-700
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString();
          },
          label: (context: any) => {
            const point = context.raw;
            return [
              `Open: $${point.o.toFixed(2)}`,
              `High: $${point.h.toFixed(2)}`,
              `Low: $${point.l.toFixed(2)}`,
              `Close: $${point.c.toFixed(2)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: timeframe === '1D' ? 'hour' : 'day',
          displayFormats: { hour: 'HH:mm', day: 'MMM dd' },
        },
        grid: {
          display: true,
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#64748b', // slate-500
          autoSkipPadding: 20,
        },
      },
      y: {
        position: 'right' as const,
        grid: {
          display: true,
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#64748b',
          callback: (value: any) => `$${value.toFixed(2)}`,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error || 'Stock not found'}
        </div>
        <Button variant="outline" onClick={() => navigate('/markets')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Markets
        </Button>
      </div>
    );
  }

  const currentPrice = parseFloat(String(asset.current_price || '0'));
  const bidPrice = parseFloat(String(asset.bid_price || '0'));
  const askPrice = parseFloat(String(asset.ask_price || '0'));
  const displayPrice = currentPrice || (bidPrice && askPrice ? (bidPrice + askPrice) / 2 : 0);
  const priceChange = parseFloat(String(asset.price_change || '0'));
  const priceChangePercent = parseFloat(String(asset.price_change_percent || '0'));
  const isPositive = priceChange >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/markets')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {ticker} <Badge variant="secondary" className="text-sm font-normal">{asset.name}</Badge>
            </h1>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-mono">${displayPrice.toFixed(2)}</div>
          <div className={cn("flex items-center justify-end gap-1 font-medium", isPositive ? "text-emerald-500" : "text-red-500")}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? "+" : ""}${priceChange.toFixed(2)} ({isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-50/50 dark:bg-slate-900/50">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="text-muted-foreground text-sm font-medium">Bid</div>
            <div className="text-xl font-bold text-emerald-600">${bidPrice > 0 ? bidPrice.toFixed(2) : '--'}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50/50 dark:bg-slate-900/50">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="text-muted-foreground text-sm font-medium">Ask</div>
            <div className="text-xl font-bold text-red-600">${askPrice > 0 ? askPrice.toFixed(2) : '--'}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50/50 dark:bg-slate-900/50">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="text-muted-foreground text-sm font-medium">Spread</div>
            <div className="text-xl font-bold text-slate-700 dark:text-slate-300">
              ${askPrice > 0 && bidPrice > 0 ? (askPrice - bidPrice).toFixed(2) : '--'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart Section */}
        <Card className="lg:col-span-2 flex flex-col min-h-[500px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Price Chart
            </CardTitle>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {(['1D', '1W', '1M', '3M', '1Y'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    timeframe === tf
                      ? "bg-white dark:bg-slate-950 shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4">
            {chartData.length > 0 ? (
              // @ts-ignore - Chart.js financial plugin types
              <Chart type="candlestick" data={memoizedChartData} options={chartOptions} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Activity className="h-8 w-8 opacity-20" />
                <p>No chart data available for this timeframe</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trades Section */}
        <Card className="flex flex-col h-[500px]">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4" /> Recent Trades
            </CardTitle>
            <CardDescription className="text-xs">Live market activity</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[80px]">Time</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memoizedTrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-32 text-muted-foreground">
                      No recent trades
                    </TableCell>
                  </TableRow>
                ) : (
                  memoizedTrades.map((trade) => (
                    <TableRow key={trade.id} className="text-xs">
                      <TableCell className="font-mono text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </TableCell>
                      <TableCell className={cn("text-right font-bold", trade.side === 'BUY' ? "text-emerald-600" : "text-red-600")}>
                        ${parseFloat(trade.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(trade.size).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockDetail;
