import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Grid,
  CircularProgress,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

interface OrderBookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
  last_price: number;
  ticker: string;
}

const GradientTableRow = styled(TableRow)<{ depth: number; side: 'bid' | 'ask' }>(
  ({ theme, depth, side }) => ({
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: `${depth}%`,
      backgroundColor:
        side === 'bid'
          ? 'rgba(102, 187, 106, 0.1)'
          : 'rgba(244, 67, 54, 0.1)',
      zIndex: 0,
    },
    '& > td': {
      position: 'relative',
      zIndex: 1,
    },
  })
);

const OrderBook: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        console.log(`Fetching order book for ${ticker} at:`, new Date().toLocaleTimeString());
        const response = await fetch(
          `http://localhost:8001/api/orderbooks/by_ticker/?ticker=${ticker}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setOrderBookData(data);
          setError(null);
          setLastUpdate(new Date());
        } else {
          throw new Error('Failed to fetch order book');
        }
      } catch (err) {
        setError('Failed to load order book');
        console.error('Error fetching order book:', err);
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      // Initial fetch
      fetchOrderBook();
      
      // Setup interval for real-time updates every 5 seconds
      const interval = setInterval(fetchOrderBook, 5000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [ticker]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !orderBookData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {ticker} Order Book
        </Typography>
        <Chip label={error || 'No data available'} color="error" />
      </Box>
    );
  }

  const { bids, asks, last_price } = orderBookData;

  const maxTotal = Math.max(
    ...bids.map((bid) => bid.total),
    ...asks.map((ask) => ask.total)
  );

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
  const spreadPercent = bestAsk && bestBid ? (spread / bestBid) * 100 : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom>
          {ticker} Order Book
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip 
            label="LIVE" 
            color="success"
            size="small"
            variant="filled"
          />
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              Last update: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Last Price
            </Typography>
            <Typography variant="h5" color="primary.main" fontWeight="bold">
              ${last_price?.toFixed(2) || '--'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Best Bid
            </Typography>
            <Typography variant="h5" color="success.main" fontWeight="bold">
              ${bestBid?.toFixed(2) || '--'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Best Ask
            </Typography>
            <Typography variant="h5" color="error.main" fontWeight="bold">
              ${bestAsk?.toFixed(2) || '--'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Spread
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              ${spread?.toFixed(2) || '--'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ({spreadPercent?.toFixed(2) || '--'}%)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom color="error.main">
            Asks (Sell Orders)
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Price</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {asks.reverse().map((ask, index) => (
                  <GradientTableRow
                    key={`ask-${index}`}
                    depth={(ask.total / maxTotal) * 100}
                    side="ask"
                  >
                    <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      ${ask.price.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">{ask.size}</TableCell>
                    <TableCell align="right">${ask.total.toFixed(2)}</TableCell>
                  </GradientTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom color="success.main">
            Bids (Buy Orders)
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Price</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bids.map((bid, index) => (
                  <GradientTableRow
                    key={`bid-${index}`}
                    depth={(bid.total / maxTotal) * 100}
                    side="bid"
                  >
                    <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
                      ${bid.price.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">{bid.size}</TableCell>
                    <TableCell align="right">${bid.total.toFixed(2)}</TableCell>
                  </GradientTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrderBook; 