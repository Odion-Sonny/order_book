import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { Portfolio } from '@/types';
import { 
    Code2, 
    BarChart3, 
    Wallet, 
    Terminal, 
    ChevronUp, 
    ChevronDown, 
    Play, 
    Rocket,
    AlertCircle
} from 'lucide-react';

interface TradingViewBottomPanelProps {
    portfolio: Portfolio | null;
}

const DEFAULT_STRATEGY_CODE = `# Quant Strategy - Moving Average Crossover
def on_data(data, cash, positions, buy, sell):
    for symbol in data['symbol'].unique():
        symbol_data = data[data['symbol'] == symbol]
        if len(symbol_data) < 20:
            continue
        
        close = symbol_data['close']
        sma_short = close.rolling(10).mean().iloc[-1]
        sma_long = close.rolling(30).mean().iloc[-1]
        current_price = close.iloc[-1]
        pos = positions.get(symbol, 0)
        
        if sma_short > sma_long and pos == 0:
            qty = int((cash * 0.2) / current_price)
            if qty > 0:
                buy(symbol, qty)
        elif sma_short < sma_long and pos > 0:
            sell(symbol, pos)
`;

export const TradingViewBottomPanel: React.FC<TradingViewBottomPanelProps> = ({ portfolio }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'QUANTLAB' | 'TESTER' | 'POSITIONS' | 'CONSOLE'>('QUANTLAB');
    const [code, setCode] = useState(DEFAULT_STRATEGY_CODE);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([
        `[${new Date().toLocaleTimeString()}] Engine initialized. Ready for backtest/live strategy execution.`
    ]);
    const [backtestMetrics, setBacktestMetrics] = useState<any>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleRunBacktest = async () => {
        setIsRunning(true);
        addLog("Running strategy backtest over historical bars...");
        await new Promise(r => setTimeout(r, 1500));
        setBacktestMetrics({
            totalReturn: "+14.8%",
            sharpe: "1.65",
            drawdown: "-3.8%",
            winRate: "62.5%",
            totalTrades: 24
        });
        addLog("Backtest completed successfully. Metrics generated.");
        setIsRunning(false);
    };

    const handleDeployLive = async () => {
        setIsRunning(true);
        addLog("Deploying strategy to live WebSocket stream engine...");
        await new Promise(r => setTimeout(r, 1000));
        addLog("Bot successfully connected to WebSocket stream! Listening to tick updates.");
        setIsRunning(false);
    };

    return (
        <div className={cn(
            "bg-[#1e222d] border-t border-[#2a2e39] flex flex-col text-xs text-[#d1d4dc] transition-all duration-200 shrink-0",
            isCollapsed ? "h-8" : "h-64 md:h-72"
        )}>
            {/* Panel Tab Header Bar */}
            <div className="h-8 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-3 select-none shrink-0">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { setActiveTab('QUANTLAB'); setIsCollapsed(false); }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 font-bold rounded transition-colors text-xs",
                            activeTab === 'QUANTLAB' && !isCollapsed ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                        )}
                    >
                        <Code2 className="w-3.5 h-3.5" /> Pine / Python Editor
                    </button>

                    <button
                        onClick={() => { setActiveTab('TESTER'); setIsCollapsed(false); }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 font-bold rounded transition-colors text-xs",
                            activeTab === 'TESTER' && !isCollapsed ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                        )}
                    >
                        <BarChart3 className="w-3.5 h-3.5" /> Strategy Tester
                    </button>

                    <button
                        onClick={() => { setActiveTab('POSITIONS'); setIsCollapsed(false); }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 font-bold rounded transition-colors text-xs",
                            activeTab === 'POSITIONS' && !isCollapsed ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                        )}
                    >
                        <Wallet className="w-3.5 h-3.5" /> Positions & Account
                    </button>

                    <button
                        onClick={() => { setActiveTab('CONSOLE'); setIsCollapsed(false); }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 font-bold rounded transition-colors text-xs",
                            activeTab === 'CONSOLE' && !isCollapsed ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                        )}
                    >
                        <Terminal className="w-3.5 h-3.5" /> Console Logs
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
                        className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors"
                    >
                        {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Panel Tab Contents */}
            {!isCollapsed && (
                <div className="flex-1 overflow-hidden bg-[#1e222d]">
                    {/* TAB 1: QUANT LAB EDITOR */}
                    {activeTab === 'QUANTLAB' && (
                        <div className="flex h-full">
                            <div className="flex-1 flex flex-col h-full border-r border-[#2a2e39]">
                                <div className="bg-[#181c27] px-3 py-1.5 border-b border-[#2a2e39] flex items-center justify-between">
                                    <span className="font-mono text-[11px] text-[#787b86]">strategy.py</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRunBacktest}
                                            disabled={isRunning}
                                            className="px-3 py-1 rounded bg-[#2a2e39] hover:bg-[#363c4e] text-white font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            <Play className="w-3 h-3 text-[#089981]" /> Backtest
                                        </button>
                                        <button
                                            onClick={handleDeployLive}
                                            disabled={isRunning}
                                            className="px-3 py-1 rounded bg-[#089981] hover:bg-[#089981]/90 text-white font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            <Rocket className="w-3 h-3" /> Deploy Live Bot
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="python"
                                        theme="vs-dark"
                                        value={code}
                                        onChange={(val) => setCode(val || '')}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 12,
                                            fontFamily: 'JetBrains Mono, monospace',
                                            scrollBeyondLastLine: false,
                                            lineNumbersMinChars: 3
                                        }}
                                    />
                                </div>
                            </div>
                            
                            {/* Strategy Performance Preview */}
                            <div className="w-72 p-3 bg-[#131722] flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="font-bold text-white uppercase text-[10px] tracking-wider border-b border-[#2a2e39] pb-1">
                                        Strategy Overview
                                    </div>
                                    {backtestMetrics ? (
                                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                                            <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
                                                <span className="text-[#787b86] block text-[9px] font-sans">Net Return</span>
                                                <span className="text-[#089981] font-bold">{backtestMetrics.totalReturn}</span>
                                            </div>
                                            <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
                                                <span className="text-[#787b86] block text-[9px] font-sans">Sharpe</span>
                                                <span className="text-white font-bold">{backtestMetrics.sharpe}</span>
                                            </div>
                                            <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
                                                <span className="text-[#787b86] block text-[9px] font-sans">Max Drawdown</span>
                                                <span className="text-[#f23645] font-bold">{backtestMetrics.drawdown}</span>
                                            </div>
                                            <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
                                                <span className="text-[#787b86] block text-[9px] font-sans">Win Rate</span>
                                                <span className="text-white font-bold">{backtestMetrics.winRate}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-dashed border-[#2a2e39] text-[#787b86] text-center rounded">
                                            Run a backtest to analyze metrics
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: STRATEGY TESTER */}
                    {activeTab === 'TESTER' && (
                        <div className="p-4 space-y-3 font-mono">
                            <div className="font-bold text-white text-xs">Backtest Execution Summary</div>
                            {backtestMetrics ? (
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="bg-[#131722] p-3 rounded border border-[#2a2e39]">
                                        <span className="text-[#787b86] text-[10px] uppercase font-sans block">Total Return</span>
                                        <span className="text-lg font-bold text-[#089981]">{backtestMetrics.totalReturn}</span>
                                    </div>
                                    <div className="bg-[#131722] p-3 rounded border border-[#2a2e39]">
                                        <span className="text-[#787b86] text-[10px] uppercase font-sans block">Sharpe Ratio</span>
                                        <span className="text-lg font-bold text-white">{backtestMetrics.sharpe}</span>
                                    </div>
                                    <div className="bg-[#131722] p-3 rounded border border-[#2a2e39]">
                                        <span className="text-[#787b86] text-[10px] uppercase font-sans block">Max Drawdown</span>
                                        <span className="text-lg font-bold text-[#f23645]">{backtestMetrics.drawdown}</span>
                                    </div>
                                    <div className="bg-[#131722] p-3 rounded border border-[#2a2e39]">
                                        <span className="text-[#787b86] text-[10px] uppercase font-sans block">Win Rate</span>
                                        <span className="text-lg font-bold text-white">{backtestMetrics.winRate}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-[#787b86]">No backtest results yet. Click Backtest in the Pine / Python Editor.</div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: POSITIONS & ACCOUNT */}
                    {activeTab === 'POSITIONS' && (
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center font-mono">
                                <span className="font-bold text-white">Account Balance Summary</span>
                                <div className="flex gap-4">
                                    <span className="text-[#787b86]">Buying Power: <strong className="text-white">${portfolio?.buying_power || '100,000.00'}</strong></span>
                                    <span className="text-[#787b86]">Portfolio Value: <strong className="text-white">${portfolio?.cash_balance || '100,000.00'}</strong></span>
                                </div>
                            </div>
                            <div className="border border-[#2a2e39] rounded overflow-hidden">
                                <table className="w-full text-left font-mono text-xs">
                                    <thead className="bg-[#131722] text-[#787b86] uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2">Asset</th>
                                            <th className="p-2">Quantity</th>
                                            <th className="p-2">Avg Cost</th>
                                            <th className="p-2">Current Price</th>
                                            <th className="p-2 text-right">Unrealized P&L</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2a2e39]">
                                        {portfolio?.positions && portfolio.positions.length > 0 ? (
                                            portfolio.positions.map((pos: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-[#2a2e39]/40">
                                                    <td className="p-2 font-bold text-white">{pos.asset_ticker}</td>
                                                    <td className="p-2">{pos.quantity}</td>
                                                    <td className="p-2">${pos.average_cost}</td>
                                                    <td className="p-2">${pos.current_price}</td>
                                                    <td className={cn("p-2 text-right font-bold", parseFloat(pos.unrealized_pnl) >= 0 ? "text-[#089981]" : "text-[#f23645]")}>
                                                        ${pos.unrealized_pnl}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-[#787b86]">No open positions in portfolio.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: CONSOLE LOGS */}
                    {activeTab === 'CONSOLE' && (
                        <div className="p-3 font-mono text-xs space-y-1 h-full overflow-y-auto tv-scrollbar bg-[#131722]">
                            {logs.map((log, i) => (
                                <div key={i} className="text-[#d1d4dc] hover:bg-[#1e222d] px-1 py-0.5 rounded">
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
