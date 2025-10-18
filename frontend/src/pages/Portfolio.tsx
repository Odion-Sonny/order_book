/**
 * Portfolio Dashboard
 * Main dashboard displaying portfolio overview, positions, and recent trades
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  AttachMoney,
} from '@mui/icons-material';
import apiService from '../services/api';

interface Portfolio {
  id: number;
  cash_balance: string;
  buying_power: string;
  total_value: string;
  total_pnl: string;
  user_username: string;
}

interface Position {
  id: number;
  asset: { ticker: string; name: string };
  quantity: string;
  average_cost: string;
  current_price: string;
  unrealized_pnl: string;
  cost_basis: string;
}

interface Trade {
  id: number;
  asset: { ticker: string };
  price: string;
  size: string;
  buyer_username: string;
  seller_username: string;
  executed_at: string;
}

const Portfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
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
      setPositions(positionsData.results || positionsData);
      setRecentTrades((tradesData.results || tradesData).slice(0, 10));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const totalValue = parseFloat(portfolio?.total_value || '0');
  const totalPnL = parseFloat(portfolio?.total_pnl || '0');
  const pnlPercent = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Portfolio Dashboard
      </Typography>

      {/* Portfolio Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalance color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Total Value
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                ${totalValue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoney color="success" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Cash Balance
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                ${parseFloat(portfolio?.cash_balance || '0').toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShowChart color="info" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Buying Power
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                ${parseFloat(portfolio?.buying_power || '0').toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {totalPnL >= 0 ? (
                  <TrendingUp color="success" sx={{ mr: 1 }} />
                ) : (
                  <TrendingDown color="error" sx={{ mr: 1 }} />
                )}
                <Typography color="text.secondary" variant="body2">
                  Total P&L
                </Typography>
              </Box>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={totalPnL >= 0 ? 'success.main' : 'error.main'}
              >
                ${totalPnL.toFixed(2)}
              </Typography>
              <Typography
                variant="body2"
                color={totalPnL >= 0 ? 'success.main' : 'error.main'}
              >
                {totalPnL >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Positions Table */}
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight="bold">
            Current Positions
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Symbol</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell align="right"><strong>Quantity</strong></TableCell>
                <TableCell align="right"><strong>Avg Cost</strong></TableCell>
                <TableCell align="right"><strong>Current Price</strong></TableCell>
                <TableCell align="right"><strong>Total Value</strong></TableCell>
                <TableCell align="right"><strong>P&L</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" py={2}>
                      No positions yet. Start trading to see your positions here.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((position) => {
                  const pnl = parseFloat(position.unrealized_pnl || '0');
                  const totalValue = parseFloat(position.quantity) * parseFloat(position.current_price);

                  return (
                    <TableRow key={position.id}>
                      <TableCell>
                        <Typography fontWeight="bold">{position.asset.ticker}</Typography>
                      </TableCell>
                      <TableCell>{position.asset.name}</TableCell>
                      <TableCell align="right">{parseFloat(position.quantity).toFixed(2)}</TableCell>
                      <TableCell align="right">${parseFloat(position.average_cost).toFixed(2)}</TableCell>
                      <TableCell align="right">${parseFloat(position.current_price).toFixed(2)}</TableCell>
                      <TableCell align="right">${totalValue.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Typography color={pnl >= 0 ? 'success.main' : 'error.main'} fontWeight="bold">
                          ${pnl.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Recent Trades */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight="bold">
            Recent Trades
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Symbol</strong></TableCell>
                <TableCell><strong>Price</strong></TableCell>
                <TableCell><strong>Size</strong></TableCell>
                <TableCell><strong>Buyer</strong></TableCell>
                <TableCell><strong>Seller</strong></TableCell>
                <TableCell><strong>Time</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" py={2}>
                      No trades yet
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recentTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>
                      <Typography fontWeight="bold">{trade.asset.ticker}</Typography>
                    </TableCell>
                    <TableCell>${parseFloat(trade.price).toFixed(2)}</TableCell>
                    <TableCell>{parseFloat(trade.size).toFixed(2)}</TableCell>
                    <TableCell>{trade.buyer_username}</TableCell>
                    <TableCell>{trade.seller_username}</TableCell>
                    <TableCell>
                      {new Date(trade.executed_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default Portfolio;
