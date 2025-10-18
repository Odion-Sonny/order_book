/**
 * Orders Page
 * View and manage all orders
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Delete, Refresh } from '@mui/icons-material';
import apiService, { Order } from '../services/api';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiService.getOrders();
      setOrders(data.results || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancelDialog = (order: Order) => {
    setSelectedOrder(order);
    setCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    setCancelLoading(true);
    try {
      await apiService.cancelOrder(selectedOrder.id);
      handleCloseCancelDialog();
      fetchOrders(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'FILLED':
        return 'success';
      case 'CANCELLED':
      case 'REJECTED':
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Orders
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={fetchOrders}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>ID</strong></TableCell>
                <TableCell><strong>Symbol</strong></TableCell>
                <TableCell><strong>Side</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell align="right"><strong>Price</strong></TableCell>
                <TableCell align="right"><strong>Size</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="text.secondary" py={4}>
                      No orders yet. Place an order from the Markets page to see it here.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">{order.asset_ticker || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.side}
                        size="small"
                        color={order.side === 'BUY' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{order.order_type}</TableCell>
                    <TableCell align="right">
                      ${parseFloat(order.price).toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(order.size).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        size="small"
                        color={getStatusColor(order.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {order.status === 'PENDING' && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenCancelDialog(order)}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={handleCloseCancelDialog}>
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this order?
          </Typography>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Symbol:</strong> {selectedOrder.asset_ticker || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Side:</strong> {selectedOrder.side}
              </Typography>
              <Typography variant="body2">
                <strong>Size:</strong> {selectedOrder.size}
              </Typography>
              <Typography variant="body2">
                <strong>Price:</strong> ${parseFloat(selectedOrder.price).toFixed(2)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} disabled={cancelLoading}>
            No
          </Button>
          <Button
            onClick={handleCancelOrder}
            variant="contained"
            color="error"
            disabled={cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={24} /> : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Orders;
