/**
 * Stock Detail Page
 * Shows detailed stock information with chart and real-time trades
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { ArrowBack, TrendingUp, TrendingDown } from '@mui/icons-material';
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

      // Refresh trades every second
      const tradesInterval = setInterval(fetchTrades, 1000);

      // Refresh chart every 30 seconds
      const chartInterval = setInterval(fetchStockData, 30000);

      return () => {
        clearInterval(tradesInterval);
        clearInterval(chartInterval);
      };
    }
  }, [ticker, timeframe]);

  const fetchStockData = async () => {
    try {
      // Fetch market data to get asset info
      const marketData = await apiService.getMarketData();
      const foundAsset = marketData.find((a: Asset) => a.ticker === ticker);

      if (foundAsset) {
        setAsset(foundAsset);
      }

      // Fetch historical chart data
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
    // Map timeframe to days
    const timeframeMap: Record<string, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '1Y': 365,
    };

    const days = timeframeMap[timeframe];

    // Calculate bar timeframe based on days
    let barTimeframe = '1Day';
    if (days <= 1) barTimeframe = '5Min';
    else if (days <= 7) barTimeframe = '1Hour';
    else if (days <= 30) barTimeframe = '1Day';
    else barTimeframe = '1Day';

    try {
      const response = await fetch(
        `http://localhost:8000/api/assets/chart_data/?ticker=${ticker}&timeframe=${barTimeframe}&limit=${days > 30 ? 365 : days * 10}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

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
      // Filter trades for this specific ticker
      const stockTrades = allTrades.filter(
        (trade: Trade) =>
          (trade.asset_ticker === ticker || trade.asset === ticker)
      );
      setTrades(stockTrades.slice(0, 50)); // Show last 50 trades
    } catch (err: any) {
      console.error('Failed to load trades:', err);
    }
  };

  const handleTimeframeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeframe: '1D' | '1W' | '1M' | '3M' | '1Y' | null,
  ) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
    }
  };

  // Prepare chart data for candlesticks
  const prepareChartData = () => {
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
            up: '#26a69a',
            down: '#ef5350',
            unchanged: '#999',
          },
          backgroundColors: {
            up: 'rgba(38, 166, 154, 0.8)',
            down: 'rgba(239, 83, 80, 0.8)',
            unchanged: 'rgba(153, 153, 153, 0.8)',
          },
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 10,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#333',
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
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#666',
          maxRotation: 0,
          autoSkipPadding: 20,
        },
      },
      y: {
        position: 'right' as const,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#666',
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
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !asset) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || 'Stock not found'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/markets')} sx={{ mt: 2 }}>
          Back to Markets
        </Button>
      </Container>
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/markets')}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {ticker}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {asset.name}
            </Typography>
          </Box>
        </Box>

        {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h4" fontWeight="bold">
            ${displayPrice.toFixed(2)}
          </Typography>
          {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
            {isPositive ? (
              <TrendingUp color="success" fontSize="small" />
            ) : (
              <TrendingDown color="error" fontSize="small" />
            )}
            <Typography
              variant="body1"
              color={isPositive ? 'success.main' : 'error.main'}
              fontWeight="bold"
            >
              {isPositive ? '+' : ''}${priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Price Info */}
      {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
      <Box sx={{ mb: 3, display: 'flex', gap: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Bid
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="success.main">
            ${bidPrice > 0 ? bidPrice.toFixed(2) : '--'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Ask
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="error.main">
            ${askPrice > 0 ? askPrice.toFixed(2) : '--'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Spread
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            ${askPrice > 0 && bidPrice > 0 ? (askPrice - bidPrice).toFixed(2) : '--'}
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Chart - 65% width */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '600px' }}>
            {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Price Chart
              </Typography>
              <ToggleButtonGroup
                value={timeframe}
                exclusive
                onChange={handleTimeframeChange}
                size="small"
              >
                <ToggleButton value="1D">1D</ToggleButton>
                <ToggleButton value="1W">1W</ToggleButton>
                <ToggleButton value="1M">1M</ToggleButton>
                <ToggleButton value="3M">3M</ToggleButton>
                <ToggleButton value="1Y">1Y</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
            <Box sx={{ height: 'calc(100% - 60px)' }}>
              {chartData.length > 0 ? (
                // @ts-ignore - Chart.js financial plugin type definitions
                <Chart type="candlestick" data={prepareChartData()} options={chartOptions} />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary">No chart data available</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Trades - 35% width */}
        <Grid item xs={12} md={4}>
          {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
          <Paper sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold">
                Recent Trades
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Updates every second
              </Typography>
            </Box>
            <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Time</strong></TableCell>
                    <TableCell align="right"><strong>Price</strong></TableCell>
                    <TableCell align="right"><strong>Size</strong></TableCell>
                    <TableCell><strong>Side</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" py={4}>
                          No trades yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    trades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={trade.side === 'BUY' ? 'success.main' : 'error.main'}
                          >
                            ${parseFloat(trade.price).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {parseFloat(trade.size).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={trade.side}
                            size="small"
                            color={trade.side === 'BUY' ? 'success' : 'error'}
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StockDetail;
