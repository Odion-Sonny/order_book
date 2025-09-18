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
  Grid,
} from '@mui/material';

interface Trade {
  id: string;
  asset: string;
  price: string;
  size: string;
  timestamp: string;
  buyer_order_id: string;
  seller_order_id: string;
  trade_type?: string;
  side?: string;
  volume?: string;
}

const TradeHistory: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        console.log('Fetching trades at:', new Date().toLocaleTimeString());
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
    
    // Setup interval for real-time updates every 2 seconds for more frequent updates
    const interval = setInterval(fetchTrades, 2000);
    
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

      {/* Trading Activity Summary */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Recent Trades
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary.main">
                {trades.length}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Total Volume
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                ${trades.reduce((sum, trade) => sum + (parseFloat(trade.volume || '0')), 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Avg Price
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="warning.main">
                ${trades.length > 0 ? (trades.reduce((sum, trade) => sum + parseFloat(trade.price), 0) / trades.length).toFixed(2) : '0.00'}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Active Assets
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="info.main">
                {new Set(trades.map(trade => trade.asset)).size}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">
          Live Order Executions
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#4CAF50',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.3 },
                '100%': { opacity: 1 },
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Updates every 2 seconds
          </Typography>
        </Box>
      </Box>
      
      <TableContainer component={Paper} sx={{ maxHeight: '600px', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Asset</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Side</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Price</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Size</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Volume</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.length > 0 ? (
              trades.map((trade, index) => {
                const tradeTime = new Date(trade.timestamp);
                const isRecent = (Date.now() - tradeTime.getTime()) < 10000; // Less than 10 seconds ago
                const isBuy = trade.side === 'BUY';
                
                return (
                  <TableRow 
                    key={trade.id}
                    sx={{
                      backgroundColor: isRecent ? (isBuy ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)') : 'inherit',
                      transition: 'background-color 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {isRecent && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: isBuy ? '#4CAF50' : '#f44336',
                              animation: 'pulse 2s infinite',
                              '@keyframes pulse': {
                                '0%': { opacity: 1 },
                                '50%': { opacity: 0.5 },
                                '100%': { opacity: 1 },
                              },
                            }}
                          />
                        )}
                        <Typography variant="body2">
                          {tradeTime.toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography 
                          sx={{ 
                            fontWeight: 'bold',
                            color: 'primary.main'
                          }}
                        >
                          {trade.asset}
                        </Typography>
                        {trade.id.includes('ALPACA_') && (
                          <Chip
                            label="LIVE"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.65rem',
                              height: '18px',
                              '& .MuiChip-label': { px: 1 }
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={trade.side || 'MKT'}
                        size="small"
                        color={isBuy ? 'success' : 'error'}
                        variant="outlined"
                        sx={{ fontWeight: 'bold', minWidth: '60px' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        sx={{ 
                          fontWeight: 'bold',
                          color: isBuy ? 'success.main' : 'error.main'
                        }}
                      >
                        ${parseFloat(trade.price).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold' }}>
                        {parseInt(trade.size).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold' }}>
                        ${trade.volume ? parseFloat(trade.volume).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '--'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={trade.trade_type || 'MARKET'}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          backgroundColor: 'rgba(33, 150, 243, 0.1)',
                          color: 'primary.main',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
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