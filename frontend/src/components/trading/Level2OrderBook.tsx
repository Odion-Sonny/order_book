import React from 'react';
import type { OrderBookData } from '../../types';

interface Level2OrderBookProps {
    orderBook: OrderBookData | null;
    currentPrice?: number;
}

export const Level2OrderBook: React.FC<Level2OrderBookProps> = ({ orderBook, currentPrice = 185.50 }) => {
    // Generate fallback depth levels if orderBook is sparse or loading
    const bids = orderBook?.bids && orderBook.bids.length > 0 ? orderBook.bids : [
        { price: (currentPrice - 0.05).toFixed(2), size: 120 },
        { price: (currentPrice - 0.10).toFixed(2), size: 340 },
        { price: (currentPrice - 0.15).toFixed(2), size: 510 },
        { price: (currentPrice - 0.20).toFixed(2), size: 210 },
        { price: (currentPrice - 0.25).toFixed(2), size: 850 },
        { price: (currentPrice - 0.30).toFixed(2), size: 430 },
        { price: (currentPrice - 0.35).toFixed(2), size: 620 },
        { price: (currentPrice - 0.40).toFixed(2), size: 290 },
    ];

    const asks = orderBook?.asks && orderBook.asks.length > 0 ? orderBook.asks : [
        { price: (currentPrice + 0.40).toFixed(2), size: 310 },
        { price: (currentPrice + 0.35).toFixed(2), size: 190 },
        { price: (currentPrice + 0.30).toFixed(2), size: 450 },
        { price: (currentPrice + 0.25).toFixed(2), size: 720 },
        { price: (currentPrice + 0.20).toFixed(2), size: 280 },
        { price: (currentPrice + 0.15).toFixed(2), size: 610 },
        { price: (currentPrice + 0.10).toFixed(2), size: 390 },
        { price: (currentPrice + 0.05).toFixed(2), size: 150 },
    ];

    const maxBidSize = Math.max(...bids.map(b => Number(b.size) || 1), 100);
    const maxAskSize = Math.max(...asks.map(a => Number(a.size) || 1), 100);
    const maxVolume = Math.max(maxBidSize, maxAskSize);

    const bestBid = bids.length > 0 ? parseFloat(String(bids[0].price)) : currentPrice - 0.05;
    const bestAsk = asks.length > 0 ? parseFloat(String(asks[asks.length - 1].price)) : currentPrice + 0.05;
    const spread = (bestAsk - bestBid).toFixed(2);
    const midPrice = ((bestBid + bestAsk) / 2).toFixed(2);

    return (
        <div className="level2-orderbook-container">
            <div className="ob-header">
                <span className="ob-title">Level II Order Book</span>
                <span className="ob-spread">Spread: ${spread}</span>
            </div>

            <div className="ob-grid-headers">
                <span>Price ($)</span>
                <span>Size</span>
                <span>Total</span>
            </div>

            {/* Asks (Sells) - Rendered top to bottom */}
            <div className="ob-asks">
                {asks.slice().reverse().map((ask, idx) => {
                    const priceNum = Number(ask.price);
                    const sizeNum = Number(ask.size);
                    const widthPct = Math.min((sizeNum / maxVolume) * 100, 100);
                    return (
                        <div key={`ask-${idx}-${ask.price}`} className="ob-row ask-row">
                            <div className="depth-bar ask-depth" style={{ width: `${widthPct}%` }} />
                            <span className="price ask-price">{priceNum.toFixed(2)}</span>
                            <span className="size">{sizeNum}</span>
                            <span className="total">{(priceNum * sizeNum).toFixed(0)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Mid Price Bar */}
            <div className="ob-mid-bar">
                <span className="mid-label">MARKET MID</span>
                <span className="mid-price">${midPrice}</span>
            </div>

            {/* Bids (Buys) */}
            <div className="ob-bids">
                {bids.map((bid, idx) => {
                    const priceNum = Number(bid.price);
                    const sizeNum = Number(bid.size);
                    const widthPct = Math.min((sizeNum / maxVolume) * 100, 100);
                    return (
                        <div key={`bid-${idx}-${bid.price}`} className="ob-row bid-row">
                            <div className="depth-bar bid-depth" style={{ width: `${widthPct}%` }} />
                            <span className="price bid-price">{priceNum.toFixed(2)}</span>
                            <span className="size">{sizeNum}</span>
                            <span className="total">{(priceNum * sizeNum).toFixed(0)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
