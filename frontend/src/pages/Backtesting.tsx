/**
 * Backtesting Page
 * Create and run strategy backtests
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { PlayArrow, Refresh } from '@mui/icons-material';
import apiService from '../services/api';

interface BacktestRun {
  id: number;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  initial_capital: string;
  created_at: string;
  result?: {
    total_return: string;
    total_return_percent: string;
    sharpe_ratio: string;
    max_drawdown: string;
    win_rate: string;
    total_trades: number;
  };
}

const Backtesting: React.FC = () => {
  const [backtests, setBacktests] = useState<BacktestRun[]>([]);
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
      setBacktests(data.results || data);
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

      setCreateSuccess('Backtest created successfully!');
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

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'RUNNING':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Backtesting
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Create New Backtest */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Create New Backtest
            </Typography>

            {createError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {createError}
              </Alert>
            )}

            {createSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {createSuccess}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Backtest Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Initial Capital"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Strategy Code"
              multiline
              rows={6}
              value={strategyCode}
              onChange={(e) => setStrategyCode(e.target.value)}
              margin="normal"
              placeholder="Enter your strategy code here..."
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={handleCreateBacktest}
              disabled={createLoading || !name || !startDate || !endDate}
              sx={{ mt: 2 }}
            >
              {createLoading ? <CircularProgress size={24} /> : 'Run Backtest'}
            </Button>
          </Paper>
        </Grid>

        {/* Backtest History */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Backtest History
              </Typography>
              <Button
                startIcon={<Refresh />}
                onClick={fetchBacktests}
                size="small"
              >
                Refresh
              </Button>
            </Box>

            {backtests.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No backtests yet. Create one to get started.
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                {backtests.map((backtest) => (
                  <Card key={backtest.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {backtest.name}
                        </Typography>
                        <Chip
                          label={backtest.status}
                          size="small"
                          color={getStatusColor(backtest.status)}
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {new Date(backtest.start_date).toLocaleDateString()} - {new Date(backtest.end_date).toLocaleDateString()}
                      </Typography>

                      {backtest.result && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Return
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" color={parseFloat(backtest.result.total_return) >= 0 ? 'success.main' : 'error.main'}>
                                ${parseFloat(backtest.result.total_return).toFixed(2)} ({backtest.result.total_return_percent}%)
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Sharpe Ratio
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {parseFloat(backtest.result.sharpe_ratio).toFixed(2)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Win Rate
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {backtest.result.win_rate}%
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Total Trades
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {backtest.result.total_trades}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Backtesting;
