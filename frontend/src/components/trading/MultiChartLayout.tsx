import React, { useState } from 'react';
import { TradingViewChart } from './TradingViewChart';
import { DrawingToolbar } from './DrawingToolbar';
import { MarketReplayControls } from './MarketReplayControls';
import type { ChartData } from '../../types';
import { Columns, Square } from 'lucide-react';

interface MultiChartLayoutProps {
    primaryData: ChartData[];
    primaryTicker: string;
    indicators: { rsi: boolean; macd: boolean; bollinger: boolean; sma: boolean };
    chartStyle: 'CANDLE' | 'LINE' | 'AREA';
    activeTool: string;
    onSelectTool: (tool: string) => void;
    onResetTool: () => void;
    
    // Replay props
    isReplaying: boolean;
    onTogglePlay: () => void;
    replaySpeed: number;
    onSpeedChange: (speed: number) => void;
    currentTickIndex: number;
    totalTicks: number;
    onSeek: (index: number) => void;
    onStep: (direction: 'prev' | 'next') => void;
    onResetReplay: () => void;
}

export const MultiChartLayout: React.FC<MultiChartLayoutProps> = ({
    primaryData,
    primaryTicker,
    indicators,
    chartStyle,
    activeTool,
    onSelectTool,
    onResetTool,
    isReplaying,
    onTogglePlay,
    replaySpeed,
    onSpeedChange,
    currentTickIndex,
    totalTicks,
    onSeek,
    onStep,
    onResetReplay,
}) => {
    const [layoutMode, setLayoutMode] = useState<'SINGLE' | 'SPLIT'>('SINGLE');
    const [secondaryTicker, setSecondaryTicker] = useState<string>('NVDA');

    // Generate secondary comparison dataset
    const secondaryData: ChartData[] = primaryData.map(d => ({
        ...d,
        open: d.open * 0.65,
        high: d.high * 0.65,
        low: d.low * 0.65,
        close: d.close * 0.65,
        volume: (d.volume || 1000) * 1.5
    }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Split Screen Control Bar */}
            <div className="layout-split-toolbar">
                <div className="split-modes">
                    <button 
                        className={`split-btn ${layoutMode === 'SINGLE' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('SINGLE')}
                        title="Single Chart View"
                    >
                        <Square size={14} /> Single Chart
                    </button>
                    <button 
                        className={`split-btn ${layoutMode === 'SPLIT' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('SPLIT')}
                        title="Split Screen Dual View"
                    >
                        <Columns size={14} /> Split Dual View
                    </button>
                </div>

                {layoutMode === 'SPLIT' && (
                    <div className="secondary-picker">
                        <span>Compare Symbol 2:</span>
                        <select value={secondaryTicker} onChange={e => setSecondaryTicker(e.target.value)}>
                            <option value="NVDA">NVDA (NVIDIA Corp.)</option>
                            <option value="TSLA">TSLA (Tesla Inc.)</option>
                            <option value="BTC-USD">BTC-USD (Bitcoin)</option>
                            <option value="EUR-USD">EUR-USD (Euro/USD)</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Charts View Area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                <DrawingToolbar
                    activeTool={activeTool}
                    onSelectTool={onSelectTool}
                />

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Primary Chart */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <TradingViewChart 
                            data={primaryData}
                            ticker={primaryTicker}
                            indicators={indicators}
                            chartStyle={chartStyle}
                            activeTool={activeTool}
                            onResetTool={onResetTool}
                        />
                    </div>

                    {/* Secondary Split Chart */}
                    {layoutMode === 'SPLIT' && (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            <TradingViewChart 
                                data={secondaryData}
                                ticker={secondaryTicker}
                                indicators={indicators}
                                chartStyle={chartStyle}
                                activeTool={activeTool}
                                onResetTool={onResetTool}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Replay Controls Footer */}
            <MarketReplayControls
                isPlaying={isReplaying}
                onTogglePlay={onTogglePlay}
                speed={replaySpeed}
                onSpeedChange={onSpeedChange}
                currentTickIndex={currentTickIndex}
                totalTicks={totalTicks}
                onSeek={onSeek}
                onStep={onStep}
                onReset={onResetReplay}
            />
        </div>
    );
};
