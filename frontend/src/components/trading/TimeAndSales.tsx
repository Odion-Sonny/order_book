import React from 'react';
import type { Trade } from '../../types';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TimeAndSalesProps {
    trades: Trade[];
}

export const TimeAndSales: React.FC<TimeAndSalesProps> = ({ trades }) => {
    // Generate fallback trades if list is short
    const displayTrades = trades.length > 0 ? trades : [
        { id: 1, price: '185.55', quantity: '100', side: 'BUY', timestamp: new Date().toISOString() },
        { id: 2, price: '185.50', quantity: '250', side: 'SELL', timestamp: new Date(Date.now() - 1000).toISOString() },
        { id: 3, price: '185.55', quantity: '500', side: 'BUY', timestamp: new Date(Date.now() - 2500).toISOString() },
        { id: 4, price: '185.45', quantity: '50', side: 'SELL', timestamp: new Date(Date.now() - 4000).toISOString() },
    ];

    return (
        <div className="time-sales-container">
            <div className="ts-header">
                <span>Time & Sales</span>
                <span className="live-tag">LIVE TAPE</span>
            </div>

            <div className="ts-grid-headers">
                <span>Time</span>
                <span>Price ($)</span>
                <span>Size</span>
                <span>Side</span>
            </div>

            <div className="ts-list">
                {displayTrades.map((t, idx) => {
                    const timeStr = new Date(t.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const isBuy = t.side?.toUpperCase() === 'BUY';
                    const priceNum = Number(t.price).toFixed(2);
                    return (
                        <div key={`ts-${t.id || idx}`} className={`ts-row ${isBuy ? 'buy' : 'sell'}`}>
                            <span className="ts-time">{timeStr}</span>
                            <span className="ts-price">{priceNum}</span>
                            <span className="ts-size">{t.quantity}</span>
                            <span className="ts-side">
                                {isBuy ? (
                                    <>
                                        <ArrowUpRight size={14} /> BUY
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownRight size={14} /> SELL
                                    </>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
