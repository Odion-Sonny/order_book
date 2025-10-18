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
  IconButton,
} from '@mui/material';
import { TrendingUp, TrendingDown, ShowChart, Add, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService, { Asset } from '../services/api';

const Markets: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Add stock dialog state
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [newStockTicker, setNewStockTicker] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [addStockLoading, setAddStockLoading] = useState(false);
  const [addStockError, setAddStockError] = useState('');
  const [addStockSuccess, setAddStockSuccess] = useState('');

  // Delete stock dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    const interval = setInterval(fetchMarketData, 1000); // Refresh every second for real-time updates
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
    const priceValue = asset.current_price || asset.ask_price || '';
    setPrice(String(priceValue));
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

  const handleOpenAddStockDialog = () => {
    setAddStockDialogOpen(true);
    setNewStockTicker('');
    setNewStockName('');
    setAddStockError('');
    setAddStockSuccess('');
  };

  const handleCloseAddStockDialog = () => {
    setAddStockDialogOpen(false);
    setNewStockTicker('');
    setNewStockName('');
    setAddStockError('');
    setAddStockSuccess('');
  };

  const handleAddStock = async () => {
    if (!newStockTicker.trim()) {
      setAddStockError('Please enter a stock ticker symbol');
      return;
    }

    setAddStockLoading(true);
    setAddStockError('');
    setAddStockSuccess('');

    try {
      await apiService.createAsset({
        ticker: newStockTicker.toUpperCase().trim(),
        name: newStockName.trim() || newStockTicker.toUpperCase().trim(),
        description: `${newStockTicker.toUpperCase()} stock`,
      });

      setAddStockSuccess('Stock added successfully!');

      // Refresh market data to include the new stock
      await fetchMarketData();

      setTimeout(() => {
        handleCloseAddStockDialog();
      }, 1500);
    } catch (err: any) {
      setAddStockError(err.message || 'Failed to add stock. It may already exist or be invalid.');
    } finally {
      setAddStockLoading(false);
    }
  };

  const handleOpenDeleteDialog = (asset: Asset) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAssetToDelete(null);
  };

  const handleDeleteStock = async () => {
    if (!assetToDelete) return;

    setDeleteLoading(true);

    try {
      await apiService.deleteAsset(assetToDelete.id);

      // Refresh market data to remove the deleted stock
      await fetchMarketData();

      handleCloseDeleteDialog();
    } catch (err: any) {
      setError(err.message || 'Failed to delete stock');
    } finally {
      setDeleteLoading(false);
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
      {/* @ts-ignore - MUI v5 known TypeScript issue with complex sx props */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Markets
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time market data and order placement
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAddStockDialog}
          sx={{ mt: 1 }}
        >
          Add Stock
        </Button>
      </Box>

      <Grid container spacing={3}>
        {assets.map((asset) => {
          const currentPrice = parseFloat(String(asset.current_price || '0'));
          const bidPrice = parseFloat(String(asset.bid_price || '0'));
          const askPrice = parseFloat(String(asset.ask_price || '0'));
          const displayPrice = currentPrice || (bidPrice && askPrice ? (bidPrice + askPrice) / 2 : 0);

          const priceChange = parseFloat(String(asset.price_change || '0'));
          const priceChangePercent = parseFloat(String(asset.price_change_percent || '0'));
          const isPositive = priceChange >= 0;

          return (
            <Grid item xs={12} sm={6} md={4} key={asset.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/stock/${asset.ticker}`)}
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
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <ShowChart color="primary" />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteDialog(asset);
                        }}
                        sx={{ ml: 1 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
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
                        ${bidPrice > 0 ? bidPrice.toFixed(2) : '--'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Ask
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="error.main">
                        ${askPrice > 0 ? askPrice.toFixed(2) : '--'}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenOrderDialog(asset);
                    }}
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

      {/* Add Stock Dialog */}
      <Dialog open={addStockDialogOpen} onClose={handleCloseAddStockDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add New Stock
        </DialogTitle>
        <DialogContent>
          {addStockError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addStockError}
            </Alert>
          )}

          {addStockSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {addStockSuccess}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Stock Ticker Symbol"
              placeholder="e.g., TSLA, MSFT, GOOGL"
              value={newStockTicker}
              onChange={(e) => setNewStockTicker(e.target.value.toUpperCase())}
              margin="normal"
              helperText="Enter the stock ticker symbol (e.g., AAPL for Apple Inc.)"
              autoFocus
            />

            <TextField
              fullWidth
              label="Stock Name (Optional)"
              placeholder="e.g., Tesla Inc."
              value={newStockName}
              onChange={(e) => setNewStockName(e.target.value)}
              margin="normal"
              helperText="Stock name will be auto-filled if left blank"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              The stock will be added to your market watchlist and real-time data will be fetched from Alpaca.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddStockDialog} disabled={addStockLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddStock}
            variant="contained"
            disabled={addStockLoading || !newStockTicker.trim()}
            startIcon={addStockLoading ? <CircularProgress size={20} /> : <Add />}
          >
            {addStockLoading ? 'Adding...' : 'Add Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Stock Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Remove Stock
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{assetToDelete?.ticker}</strong> ({assetToDelete?.name}) from your watchlist?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will remove the stock from your markets page. Any existing orders or positions for this stock will not be affected.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteStock}
            variant="contained"
            color="error"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <Delete />}
          >
            {deleteLoading ? 'Removing...' : 'Remove Stock'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Markets;
