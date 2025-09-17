import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const PlaceOrder: React.FC = () => {
  const [orderType, setOrderType] = useState('LIMIT');
  const [side, setSide] = useState('BUY');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [asset, setAsset] = useState('');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const response = await fetch(`${protocol}//${hostname}:8001/api/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset,
          price,
          size,
          order_type: orderType,
          side,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          type: 'success',
          message: `Order placed successfully! Order ID: ${data.id}`,
        });
        setPrice('');
        setSize('');
      } else {
        throw new Error('Failed to place order');
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Failed to place order. Please try again.',
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Place Order
      </Typography>
      <StyledPaper>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Asset</InputLabel>
                <Select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  required
                >
                  <MenuItem value="AAPL">AAPL</MenuItem>
                  <MenuItem value="GOOGL">GOOGL</MenuItem>
                  <MenuItem value="MSFT">MSFT</MenuItem>
                  <MenuItem value="TSLA">TSLA</MenuItem>
                  <MenuItem value="AMZN">AMZN</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Order Type</InputLabel>
                <Select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                >
                  <MenuItem value="LIMIT">Limit</MenuItem>
                  <MenuItem value="MARKET">Market</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Side</InputLabel>
                <Select value={side} onChange={(e) => setSide(e.target.value)}>
                  <MenuItem value="BUY">Buy</MenuItem>
                  <MenuItem value="SELL">Sell</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Size"
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                required
              />
            </Grid>
            {orderType === 'LIMIT' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color={side === 'BUY' ? 'success' : 'error'}
                fullWidth
              >
                Place {side} Order
              </Button>
            </Grid>
          </Grid>
        </form>
      </StyledPaper>
      {status && (
        <Alert severity={status.type} sx={{ mt: 2 }}>
          {status.message}
        </Alert>
      )}
    </Box>
  );
};

export default PlaceOrder; 