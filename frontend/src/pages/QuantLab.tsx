import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Rocket, TerminalSquare, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_STRATEGY = `
# Quantitative Trading Strategy
# Available context: data (DataFrame), cash (float), positions (dict), buy(symbol, qty), sell(symbol, qty)

def on_data(data, cash, positions, buy, sell):
    """
    Called whenever new market data arrives (either in backtest or live).
    data: DataFrame with historical bars for all symbols
    """
    # Simple Moving Average Crossover Example
    for symbol in data['symbol'].unique():
        symbol_data = data[data['symbol'] == symbol]
        
        if len(symbol_data) < 30:
            continue
            
        close_prices = symbol_data['close']
        ma10 = close_prices.rolling(10).mean().iloc[-1]
        ma30 = close_prices.rolling(30).mean().iloc[-1]
        current_price = close_prices.iloc[-1]
        
        position = positions.get(symbol, 0)
        
        if ma10 > ma30 and position == 0:
            # Buy signal
            qty = int(cash * 0.2 / current_price)
            if qty > 0:
                buy(symbol, qty)
                
        elif ma10 < ma30 and position > 0:
            # Sell signal
            sell(symbol, position)
`;

const QuantLab = () => {
    const [code, setCode] = useState(DEFAULT_STRATEGY);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [results, setResults] = useState<any>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const runBacktest = async () => {
        setIsRunning(true);
        setResults(null);
        addLog("Starting backtest engine...");
        
        try {
            // Note: API endpoint to be created in backend step
            // const response = await apiService.runBacktestWithCode({ code });
            // setResults(response);
            
            // Mocking delay for now until backend is ready
            await new Promise(r => setTimeout(r, 2000));
            addLog("Backtest completed successfully.");
            setResults({
                totalReturn: "12.4%",
                sharpeRatio: "1.42",
                maxDrawdown: "-4.2%",
                winRate: "58%"
            });
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const deployLive = async () => {
        setIsRunning(true);
        addLog("Deploying bot to live stream engine...");
        try {
            // Mock API call
            await new Promise(r => setTimeout(r, 1000));
            addLog("Bot successfully connected to WebSocket stream!");
            addLog("Waiting for market data...");
        } catch (e: any) {
            addLog(`Error deploying live: ${e.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-10rem)] flex flex-col">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Quant Lab</h1>
                <p className="text-muted-foreground">Develop, backtest, and deploy algorithmic trading strategies.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px]">
                
                {/* Editor Column */}
                <div className="lg:col-span-8 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-[#1e1e1e] border-b border-[#333] px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                            <TerminalSquare className="w-4 h-4 text-blue-400" />
                            strategy.py
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={runBacktest}
                                disabled={isRunning}
                                className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2", 
                                    isRunning ? "bg-neutral-700 text-neutral-500 cursor-not-allowed" : "bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-600")}
                            >
                                <Play className="w-3 h-3" /> Backtest
                            </button>
                            <button 
                                onClick={deployLive}
                                disabled={isRunning}
                                className={cn("px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-md flex items-center gap-2", 
                                    isRunning ? "bg-emerald-900 text-emerald-700 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-500")}
                            >
                                <Rocket className="w-3 h-3" /> Deploy Live
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
                                fontSize: 14,
                                fontFamily: 'JetBrains Mono, monospace',
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>
                </div>

                {/* Info / Results Column */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Metrics Panel */}
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <h3 className="font-bold text-sm text-neutral-400 uppercase tracking-widest mb-4">Backtest Results</h3>
                        {results ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Total Return</span>
                                    <span className="text-lg font-bold text-emerald-400">{results.totalReturn}</span>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Win Rate</span>
                                    <span className="text-lg font-bold text-white">{results.winRate}</span>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Sharpe Ratio</span>
                                    <span className="text-lg font-bold text-white">{results.sharpeRatio}</span>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Max Drawdown</span>
                                    <span className="text-lg font-bold text-red-400">{results.maxDrawdown}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-sm text-neutral-500 border border-dashed border-neutral-700 rounded-lg">
                                Run a backtest to view metrics
                            </div>
                        )}
                    </div>

                    {/* Console / Logs */}
                    <div className="bg-card border border-border rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden min-h-[200px]">
                        <div className="bg-[#1e1e1e] border-b border-[#333] px-4 py-2 flex items-center gap-2 text-xs font-bold text-neutral-400">
                            <AlertCircle className="w-3 h-3" /> Console Output
                        </div>
                        <div className="p-4 font-mono text-[11px] text-neutral-300 space-y-1 overflow-y-auto flex-1 bg-black/40">
                            {logs.length === 0 ? (
                                <span className="text-neutral-600">Waiting for execution...</span>
                            ) : (
                                logs.map((l, i) => <div key={i}>{l}</div>)
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default QuantLab;
