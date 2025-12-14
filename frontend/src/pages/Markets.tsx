import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  LineChart,
  Plus,
  Trash2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService, { Asset } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const Markets: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Order Dialog State
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET' | 'STOP_LOSS'>('LIMIT');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  // Add Stock Dialog State
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [newStockTicker, setNewStockTicker] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [addStockLoading, setAddStockLoading] = useState(false);
  const [addStockError, setAddStockError] = useState('');
  const [addStockSuccess, setAddStockSuccess] = useState('');

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5000);
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
      fetchMarketData();
      setTimeout(() => {
        setAddStockDialogOpen(false);
        setNewStockTicker('');
        setNewStockName('');
        setAddStockError('');
        setAddStockSuccess('');
      }, 1500);
    } catch (err: any) {
      setAddStockError(err.message || 'Failed to add stock');
    } finally {
      setAddStockLoading(false);
    }
  };

  const handleDeleteStock = async () => {
    if (!assetToDelete) return;
    setDeleteLoading(true);
    try {
      await apiService.deleteAsset(assetToDelete.id);
      fetchMarketData();
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete stock');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
          <p className="text-muted-foreground">Real-time quotes and trading</p>
        </div>
        <Button onClick={() => setAddStockDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Stock
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assets.map((asset) => {
          const currentPrice = parseFloat(String(asset.current_price || '0'));
          const bidPrice = parseFloat(String(asset.bid_price || '0'));
          const askPrice = parseFloat(String(asset.ask_price || '0'));
          const displayPrice = currentPrice || (bidPrice && askPrice ? (bidPrice + askPrice) / 2 : 0);

          const priceChange = parseFloat(String(asset.price_change || '0'));
          const priceChangePercent = parseFloat(String(asset.price_change_percent || '0'));
          const isPositive = priceChange >= 0;

          return (
            <Card key={asset.id} className="cursor-pointer group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-border hover:bg-card/80 transition-all duration-300" onClick={() => navigate(`/stock/${asset.ticker}`)}>
              {/* Neon Glow on Hover */}
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br", isPositive ? "from-emerald-500/5 to-transparent" : "from-red-500/5 to-transparent")} />

              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold tracking-tight">{asset.ticker}</CardTitle>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono", isPositive ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-red-500/30 text-red-500 bg-red-500/5")}>{isPositive ? 'BULL' : 'BEAR'}</span>
                  </div>
                  <CardDescription className="text-xs truncate max-w-[150px]">{asset.name}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssetToDelete(asset);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-4">
                  {displayPrice > 0 ? (
                    <div>
                      <div className="text-3xl font-bold font-mono tracking-tighter">${displayPrice.toFixed(2)}</div>
                      {(priceChange !== 0 || priceChangePercent !== 0) && (
                        <div className={cn("flex items-center gap-1 text-sm font-medium font-mono mt-1", isPositive ? "text-emerald-500" : "text-red-500")}>
                          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {isPositive ? "+" : ""}${priceChange.toFixed(2)} ({isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Price unavailable
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                    <div className="group/bid hover:bg-emerald-500/5 p-1 rounded transition-colors">
                      <span className="text-muted-foreground block uppercase tracking-wider text-[10px]">Bid</span>
                      <span className="font-mono font-medium text-emerald-500">${bidPrice > 0 ? bidPrice.toFixed(2) : '--'}</span>
                    </div>
                    <div className="text-right group/ask hover:bg-red-500/5 p-1 rounded transition-colors">
                      <span className="text-muted-foreground block uppercase tracking-wider text-[10px]">Ask</span>
                      <span className="font-mono font-medium text-red-500">${askPrice > 0 ? askPrice.toFixed(2) : '--'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 relative z-10">
                <Button
                  className={cn("w-full font-semibold shadow-none border", isPositive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20")}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenOrderDialog(asset);
                  }}
                >
                  Quick Trade
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-xl bg-card/20">
          <LineChart className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground">No stocks tracked</h3>
          <p className="text-muted-foreground mb-4">Add a ticker to your watchlist to start tracking.</p>
          <Button onClick={() => setAddStockDialogOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Add First Stock
          </Button>
        </div>
      )}

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Place Order - {selectedAsset?.ticker}</DialogTitle>
            <DialogDescription>
              Execute a trade for {selectedAsset?.name}
            </DialogDescription>
          </DialogHeader>

          {orderError && (
            <div className="bg-red-50 text-red-600 p-2 rounded text-sm flex gap-2 items-center">
              <AlertCircle className="h-4 w-4" /> {orderError}
            </div>
          )}
          {orderSuccess && (
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded text-sm">
              {orderSuccess}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Side</Label>
                <Select value={side} onValueChange={(v: any) => setSide(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIMIT">Limit</SelectItem>
                    <SelectItem value="MARKET">Market</SelectItem>
                    <SelectItem value="STOP_LOSS">Stop Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {orderType !== 'MARKET' && (
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center">
              Estimated Total: <span className="font-medium text-foreground">${(parseFloat(size || '0') * parseFloat(price || '0')).toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseOrderDialog} disabled={orderLoading}>Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={orderLoading || !size || (orderType !== 'MARKET' && !price)}>
              {orderLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {side === 'BUY' ? 'Buy' : 'Sell'} {selectedAsset?.ticker}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stock Dialog */}
      <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Stock</DialogTitle>
            <DialogDescription>Add a stock to your watchlist to track and trade.</DialogDescription>
          </DialogHeader>

          {addStockError && <div className="text-red-500 text-sm mb-2">{addStockError}</div>}
          {addStockSuccess && <div className="text-emerald-500 text-sm mb-2">{addStockSuccess}</div>}

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker Symbol</Label>
              <Input
                id="ticker"
                placeholder="e.g. AAPL, TSLA"
                value={newStockTicker}
                onChange={(e) => setNewStockTicker(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Company Name (Optional)</Label>
              <Input
                id="name"
                placeholder="e.g. Apple Inc."
                value={newStockName}
                onChange={(e) => setNewStockName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStockDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStock} disabled={addStockLoading || !newStockTicker}>
              {addStockLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {assetToDelete?.ticker}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this stock from your watchlist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteStock} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Markets;
