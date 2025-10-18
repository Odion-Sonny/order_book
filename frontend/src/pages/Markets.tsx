/**
 * Markets Page
 * Display available assets and market data with order placement
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { TrendingUp, TrendingDown, ShowChart } from '@mui/icons-material';
import apiService from '../services/api';

interface Asset {
  id: number;
  ticker: string;
  name: string;
  current_price?: number;
  price_change?: number;
  price_change_percent?: number;
  quote?: {
    bid_price: number;
    ask_price: number;
  };
}

const Markets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Order form state
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET' | 'STOP_LOSS'>('LIMIT');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
    try {
      const data = await apiService.getMarketData();
      setAssets(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrderDialog = (asset: Asset) => {
    setSelectedAsset(asset);
    setPrice(asset.current_price?.toString() || asset.quote?.ask_price?.toString() || '');
    setOrderDialogOpen(true);
    setOrderError('');
    setOrderSuccess('');
  };

  const handleCloseOrderDialog = () => {
    setOrderDialogOpen(false);
    setSelectedAsset(null);
    setSide('BUY');
    setOrderType('LIMIT');
    setPrice('');
    setSize('');
    setOrderError('');
    setOrderSuccess('');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAsset) return;

    setOrderLoading(true);
    setOrderError('');
    setOrderSuccess('');

    try {
      await apiService.createOrder({
        asset: selectedAsset.id,
        side,
        order_type: orderType,
        price: orderType === 'MARKET' ? '0' : price,
        size,
      });

      setOrderSuccess('Order placed successfully!');
      setTimeout(() => {
        handleCloseOrderDialog();
      }, 1500);
    } catch (err: any) {
      setOrderError(err.message || 'Failed to place order');
    } finally {
      setOrderLoading(false);
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Markets
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time market data and order placement
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {assets.map((asset) => {
          const displayPrice = asset.current_price || (
            asset.quote?.bid_price && asset.quote?.ask_price
              ? (asset.quote.bid_price + asset.quote.ask_price) / 2
              : 0
          );

          const priceChange = asset.price_change || 0;
          const priceChangePercent = asset.price_change_percent || 0;
          const isPositive = priceChange >= 0;

          return (
            <Grid item xs={12} sm={6} md={4} key={asset.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <div>
                      <Typography variant="h6" fontWeight="bold">
                        {asset.ticker}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {asset.name}
                      </Typography>
                    </div>
                    <ShowChart color="primary" />
                  </Box>

                  {displayPrice > 0 && (
                    <>
                      <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                        ${displayPrice.toFixed(2)}
                      </Typography>

                      {(priceChange !== 0 || priceChangePercent !== 0) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          {isPositive ? (
                            <TrendingUp color="success" fontSize="small" />
                          ) : (
                            <TrendingDown color="error" fontSize="small" />
                          )}
                          <Typography
                            variant="body2"
                            color={isPositive ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            {isPositive ? '+' : ''}${priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Bid
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        ${asset.quote?.bid_price?.toFixed(2) || '--'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Ask
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="error.main">
                        ${asset.quote?.ask_price?.toFixed(2) || '--'}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleOpenOrderDialog(asset)}
                  >
                    Trade
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {assets.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShowChart sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No market data available
          </Typography>
        </Box>
      )}

      {/* Order Placement Dialog */}
      <Dialog open={orderDialogOpen} onClose={handleCloseOrderDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Place Order - {selectedAsset?.ticker}
        </DialogTitle>
        <DialogContent>
          {orderError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {orderError}
            </Alert>
          )}

          {orderSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {orderSuccess}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Side</InputLabel>
                <Select
                  value={side}
                  label="Side"
                  onChange={(e) => setSide(e.target.value as 'BUY' | 'SELL')}
                >
                  <MenuItem value="BUY">Buy</MenuItem>
                  <MenuItem value="SELL">Sell</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Order Type</InputLabel>
                <Select
                  value={orderType}
                  label="Order Type"
                  onChange={(e) => setOrderType(e.target.value as any)}
                >
                  <MenuItem value="LIMIT">Limit</MenuItem>
                  <MenuItem value="MARKET">Market</MenuItem>
                  <MenuItem value="STOP_LOSS">Stop Loss</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Size (Quantity)"
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {orderType !== 'MARKET' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Estimated Total: ${(parseFloat(size || '0') * parseFloat(price || '0')).toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrderDialog} disabled={orderLoading}>
            Cancel
          </Button>
          <Button
            onClick={handlePlaceOrder}
            variant="contained"
            disabled={orderLoading || !size || (orderType !== 'MARKET' && !price)}
          >
            {orderLoading ? <CircularProgress size={24} /> : 'Place Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Markets;
