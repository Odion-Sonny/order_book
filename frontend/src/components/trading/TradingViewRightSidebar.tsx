import React, { useState } from 'react';
import type { Asset, Portfolio, Trade } from '@/types';
import { cn } from '@/lib/utils';
import { OrderBookTable } from './OrderBookTable';
import { MarketDepthChart } from './MarketDepthChart';
import { RecentTrades } from './RecentTrades';
import { 
    List, 
    Layers, 
    CreditCard, 
    History as HistoryIcon,
    Search,
    DollarSign,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

interface TradingViewRightSidebarProps {
    assets: Asset[];
    selectedTicker: string;
    onSelectTicker: (ticker: string) => void;
    bids: any[];
    asks: any[];
    trades: Trade[];
    portfolio: Portfolio | null;
    onPlaceOrder: (orderData: { asset: string; side: 'BUY' | 'SELL'; order_type: 'MARKET' | 'LIMIT'; quantity: string; price?: string }) => Promise<void>;
    orderStatus?: { msg: string; type: 'success' | 'error' } | null;
    isSubmittingOrder?: boolean;
}

export const TradingViewRightSidebar: React.FC<TradingViewRightSidebarProps> = ({
    assets,
    selectedTicker,
    onSelectTicker,
    bids,
    asks,
    trades,
    portfolio,
    onPlaceOrder,
    orderStatus,
    isSubmittingOrder = false
}) => {
    const [activeTab, setActiveTab] = useState<'WATCHLIST' | 'ORDERBOOK' | 'TICKET' | 'TRADES'>('WATCHLIST');
    
    // Order Ticket State
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
    const [quantity, setQuantity] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [depthMode, setDepthMode] = useState<'BOOK' | 'CHART'>('BOOK');
    const [watchlistFilter, setWatchlistFilter] = useState('');

    const selectedAsset = assets.find(a => a.ticker === selectedTicker);
    const currentPrice = parseFloat(selectedAsset?.current_price || '0');
    const priceChange = parseFloat(selectedAsset?.price_change || '0');
    const priceChangePercent = parseFloat(selectedAsset?.price_change_percent || '0');

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPlaceOrder({
            asset: selectedTicker,
            side,
            order_type: orderType,
            quantity,
            price: orderType === 'LIMIT' ? price : undefined
        });
    };

    const filteredAssets = assets.filter(a => 
        a.ticker.toLowerCase().includes(watchlistFilter.toLowerCase()) || 
        a.name.toLowerCase().includes(watchlistFilter.toLowerCase())
    );

    return (
        <div className="flex h-full bg-[#1e222d] border-l border-[#2a2e39] text-[#d1d4dc] text-xs select-none overflow-hidden shrink-0">
            {/* Panel Content View */}
            <div className="w-80 flex flex-col h-full bg-[#131722] border-r border-[#2a2e39] overflow-hidden">
                
                {/* 1. WATCHLIST & QUOTE DETAILS TAB */}
                {activeTab === 'WATCHLIST' && (
                    <div className="flex flex-col h-full">
                        {/* Header & Search */}
                        <div className="p-3 bg-[#1e222d] border-b border-[#2a2e39] space-y-2">
                            <div className="flex items-center justify-between font-bold text-white text-xs">
                                <span>Watchlist</span>
                                <span className="text-[10px] text-[#787b86]">{assets.length} Symbols</span>
                            </div>
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#787b86]" />
                                <input
                                    type="text"
                                    placeholder="Filter watchlist..."
                                    value={watchlistFilter}
                                    onChange={(e) => setWatchlistFilter(e.target.value)}
                                    className="w-full bg-[#131722] border border-[#2a2e39] rounded pl-8 pr-2 py-1 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-[#2962ff]"
                                />
                            </div>
                        </div>

                        {/* Watchlist Table */}
                        <div className="flex-1 overflow-y-auto tv-scrollbar">
                            <table className="w-full text-left font-mono">
                                <thead className="bg-[#1e222d]/60 text-[10px] text-[#787b86] uppercase sticky top-0 font-sans border-b border-[#2a2e39]">
                                    <tr>
                                        <th className="py-1.5 px-3">Symbol</th>
                                        <th className="py-1.5 px-2 text-right">Last</th>
                                        <th className="py-1.5 px-3 text-right">Chg%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2e39]/40">
                                    {filteredAssets.map(asset => {
                                        const p = parseFloat(asset.current_price || '0');
                                        const chgPct = parseFloat(asset.price_change_percent || '0');
                                        const isSelected = selectedTicker === asset.ticker;

                                        return (
                                            <tr
                                                key={asset.ticker}
                                                onClick={() => onSelectTicker(asset.ticker)}
                                                className={cn(
                                                    "cursor-pointer transition-colors hover:bg-[#2a2e39]/50",
                                                    isSelected ? "bg-[#2962ff]/15 font-bold" : ""
                                                )}
                                            >
                                                <td className="py-2 px-3">
                                                    <div className="font-extrabold text-white font-sans">{asset.ticker}</div>
                                                    <div className="text-[9px] text-[#787b86] font-sans truncate max-w-[90px]">{asset.name}</div>
                                                </td>
                                                <td className="py-2 px-2 text-right text-white">
                                                    ${p.toFixed(2)}
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-bold inline-block",
                                                        chgPct >= 0 ? "bg-[#089981]/20 text-[#089981]" : "bg-[#f23645]/20 text-[#f23645]"
                                                    )}>
                                                        {chgPct >= 0 ? '+' : ''}{chgPct.toFixed(2)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Selected Ticker Key Summary */}
                        {selectedAsset && (
                            <div className="p-3 bg-[#1e222d] border-t border-[#2a2e39] space-y-2 shrink-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-extrabold text-white font-sans">{selectedAsset.ticker}</h3>
                                        <p className="text-[10px] text-[#787b86]">{selectedAsset.name}</p>
                                    </div>
                                    <div className="text-right font-mono">
                                        <div className="text-sm font-bold text-white">${currentPrice.toFixed(2)}</div>
                                        <div className={cn("text-[10px] font-bold", priceChange >= 0 ? "text-[#089981]" : "text-[#f23645]")}>
                                            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2a2e39] text-[10px] font-mono">
                                    <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                                        <span className="text-[#787b86] block font-sans text-[9px] uppercase">Buying Power</span>
                                        <span className="text-white font-bold">${portfolio?.buying_power || '100,000.00'}</span>
                                    </div>
                                    <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                                        <span className="text-[#787b86] block font-sans text-[9px] uppercase">Cash Balance</span>
                                        <span className="text-white font-bold">${portfolio?.cash_balance || '100,000.00'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. ORDER BOOK & DEPTH TAB */}
                {activeTab === 'ORDERBOOK' && (
                    <div className="flex flex-col h-full">
                        <div className="p-2.5 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between">
                            <span className="font-bold text-white text-xs">Order Book ({selectedTicker})</span>
                            <div className="flex bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
                                <button
                                    onClick={() => setDepthMode('BOOK')}
                                    className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition-colors", depthMode === 'BOOK' ? "bg-[#2962ff] text-white" : "text-[#787b86]")}
                                >
                                    Book
                                </button>
                                <button
                                    onClick={() => setDepthMode('CHART')}
                                    className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition-colors", depthMode === 'CHART' ? "bg-[#2962ff] text-white" : "text-[#787b86]")}
                                >
                                    Depth
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden p-2">
                            {depthMode === 'BOOK' ? (
                                <OrderBookTable bids={bids} asks={asks} lastPrice={currentPrice} />
                            ) : (
                                <MarketDepthChart bids={bids} asks={asks} />
                            )}
                        </div>
                    </div>
                )}

                {/* 3. ORDER TICKET FORM TAB */}
                {activeTab === 'TICKET' && (
                    <div className="flex flex-col h-full overflow-y-auto tv-scrollbar p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-[#2962ff]" />
                                <span className="font-extrabold text-white text-sm">Order Panel</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-white">{selectedTicker}</span>
                        </div>

                        {/* Buy / Sell Toggle Buttons */}
                        <div className="grid grid-cols-2 gap-1 bg-[#131722] p-1 rounded-md border border-[#2a2e39]">
                            <button
                                type="button"
                                onClick={() => setSide('BUY')}
                                className={cn(
                                    "py-2 rounded font-black text-xs transition-all uppercase tracking-wider",
                                    side === 'BUY' ? "bg-[#089981] text-white shadow-lg" : "text-[#787b86] hover:text-white"
                                )}
                            >
                                BUY
                            </button>
                            <button
                                type="button"
                                onClick={() => setSide('SELL')}
                                className={cn(
                                    "py-2 rounded font-black text-xs transition-all uppercase tracking-wider",
                                    side === 'SELL' ? "bg-[#f23645] text-white shadow-lg" : "text-[#787b86] hover:text-white"
                                )}
                            >
                                SELL
                            </button>
                        </div>

                        {/* Order Entry Form */}
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            {/* Order Type Toggle */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#787b86] uppercase tracking-wider block">Order Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOrderType('MARKET')}
                                        className={cn(
                                            "py-1.5 rounded border text-xs font-bold transition-colors",
                                            orderType === 'MARKET' ? "bg-[#2962ff]/20 text-[#2962ff] border-[#2962ff]" : "bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white"
                                        )}
                                    >
                                        Market
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrderType('LIMIT')}
                                        className={cn(
                                            "py-1.5 rounded border text-xs font-bold transition-colors",
                                            orderType === 'LIMIT' ? "bg-[#2962ff]/20 text-[#2962ff] border-[#2962ff]" : "bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white"
                                        )}
                                    >
                                        Limit
                                    </button>
                                </div>
                            </div>

                            {/* Quantity Input */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#787b86] uppercase tracking-wider block">Quantity (Shares)</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-sm text-white font-mono placeholder-[#787b86] focus:outline-none focus:border-[#2962ff]"
                                />
                            </div>

                            {/* Limit Price Input */}
                            {orderType === 'LIMIT' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[#787b86] uppercase tracking-wider block">Limit Price ($)</label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder={currentPrice > 0 ? currentPrice.toString() : "0.00"}
                                        required
                                        className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-sm text-white font-mono placeholder-[#787b86] focus:outline-none focus:border-[#2962ff]"
                                    />
                                </div>
                            )}

                            {/* Status Notification */}
                            {orderStatus && (
                                <div className={cn(
                                    "p-2.5 rounded border text-xs font-semibold flex items-center gap-2",
                                    orderStatus.type === 'success' ? "bg-[#089981]/10 border-[#089981]/30 text-[#089981]" : "bg-[#f23645]/10 border-[#f23645]/30 text-[#f23645]"
                                )}>
                                    {orderStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                    <span>{orderStatus.msg}</span>
                                </div>
                            )}

                            {/* Submit Order Button */}
                            <button
                                type="submit"
                                disabled={isSubmittingOrder}
                                className={cn(
                                    "w-full py-3 rounded-md font-extrabold text-sm text-white uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]",
                                    isSubmittingOrder ? "bg-[#2a2e39] text-[#787b86] cursor-not-allowed" :
                                        side === 'BUY' ? "bg-[#089981] hover:bg-[#089981]/90" : "bg-[#f23645] hover:bg-[#f23645]/90"
                                )}
                            >
                                {isSubmittingOrder ? 'Executing...' : `${side} ${selectedTicker}`}
                            </button>
                        </form>
                    </div>
                )}

                {/* 4. RECENT TRADES LOG TAB */}
                {activeTab === 'TRADES' && (
                    <div className="flex flex-col h-full p-2 overflow-hidden">
                        <div className="px-2 py-1.5 font-bold text-white border-b border-[#2a2e39] mb-2 flex items-center justify-between">
                            <span>Market Trades</span>
                            <span className="text-[10px] text-[#787b86] font-mono">{selectedTicker}</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <RecentTrades trades={trades} />
                        </div>
                    </div>
                )}
            </div>

            {/* Vertical Tab Navigation Icon Strip (Far Right) */}
            <div className="w-12 bg-[#1e222d] flex flex-col items-center py-2 space-y-1 select-none">
                <button
                    onClick={() => setActiveTab('WATCHLIST')}
                    title="Watchlist & Details"
                    className={cn(
                        "w-9 h-9 rounded flex items-center justify-center transition-colors relative group",
                        activeTab === 'WATCHLIST' ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                    )}
                >
                    <List className="w-4 h-4" />
                </button>

                <button
                    onClick={() => setActiveTab('ORDERBOOK')}
                    title="Order Book & Depth"
                    className={cn(
                        "w-9 h-9 rounded flex items-center justify-center transition-colors relative group",
                        activeTab === 'ORDERBOOK' ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                    )}
                >
                    <Layers className="w-4 h-4" />
                </button>

                <button
                    onClick={() => setActiveTab('TICKET')}
                    title="Place Order Panel"
                    className={cn(
                        "w-9 h-9 rounded flex items-center justify-center transition-colors relative group",
                        activeTab === 'TICKET' ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                    )}
                >
                    <CreditCard className="w-4 h-4" />
                </button>

                <button
                    onClick={() => setActiveTab('TRADES')}
                    title="Live Trades Stream"
                    className={cn(
                        "w-9 h-9 rounded flex items-center justify-center transition-colors relative group",
                        activeTab === 'TRADES' ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                    )}
                >
                    <HistoryIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
