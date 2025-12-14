import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2
} from 'lucide-react';
import apiService, { Order } from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_-4px_rgba(234,179,8,0.5)]"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'FILLED':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_-4px_rgba(16,185,129,0.5)]"><CheckCircle2 className="w-3 h-3 mr-1" /> Filled</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-slate-500/10 text-muted-foreground border-border"><Ban className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="shadow-[0_0_10px_-4px_rgba(239,68,68,0.5)]"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage your open and historical orders</p>
        </div>
        <Button variant="outline" onClick={fetchOrders} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border/50 py-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[100px] text-xs uppercase tracking-wider font-semibold text-muted-foreground">ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Symbol</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Side</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Type</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Price</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Size</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Created</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="h-8 w-8 opacity-20" />
                      <p>No orders found. Start trading in the Markets page.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="border-border/50 hover:bg-white/5 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">{String(order.id).slice(0, 8)}</TableCell>
                    <TableCell className="font-bold font-mono">{order.asset_ticker}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 h-5 font-mono border", order.side === 'BUY' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-red-500/30 text-red-500 bg-red-500/5')}>
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs uppercase font-medium">{order.order_type}</TableCell>
                    <TableCell className="text-right font-mono font-medium">${parseFloat(order.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(order.size).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(order.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleOpenCancelDialog(order)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this pending order?
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Symbol:</span>
                <span className="font-medium">{selectedOrder.asset_ticker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Side:</span>
                <span className="font-medium">{selectedOrder.side}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{selectedOrder.size} @ ${parseFloat(selectedOrder.price).toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCancelDialog} disabled={cancelLoading}>No, Keep Order</Button>
            <Button variant="destructive" onClick={handleCancelOrder} disabled={cancelLoading}>
              {cancelLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
