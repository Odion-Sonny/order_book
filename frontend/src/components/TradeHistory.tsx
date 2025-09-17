import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  CircularProgress,
  Chip,
} from '@mui/material';

interface Trade {
  id: string;
  asset: string;
  price: string;
  size: string;
  timestamp: string;
  buyer_order_id: string;
  seller_order_id: string;
}

const TradeHistory: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/trades/');
        
        if (response.ok) {
          const data = await response.json();
          setTrades(data.slice(0, 50)); // Keep only 50 most recent trades
          setError(null);
          setLastUpdate(new Date());
        } else {
          throw new Error('Failed to fetch trades');
        }
      } catch (err) {
        setError('Failed to load trade history');
        console.error('Error fetching trades:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchTrades();
    
    // Setup interval for real-time updates every 5 seconds
    const interval = setInterval(fetchTrades, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom>
          Trade History
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
      
      {error && (
        <Box mb={2}>
          <Chip label={error} color="error" />
        </Box>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Asset</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell>Trade ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.length > 0 ? (
              trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>{new Date(trade.timestamp).toLocaleTimeString()}</TableCell>
                  <TableCell>{trade.asset}</TableCell>
                  <TableCell align="right">${trade.price}</TableCell>
                  <TableCell align="right">{trade.size}</TableCell>
                  <TableCell>{trade.id}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">
                    No trades available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TradeHistory; 