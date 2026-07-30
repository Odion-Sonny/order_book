import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Square, Terminal, Code2, Cpu, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface MonacoEditorProps {
    ticker?: string;
    onRunStrategy?: (code: string) => void;
}

const DEFAULT_PYTHON_STRATEGY = `"""
Antigravity High-Frequency Electronic Trading Strategy
Engineered for QuantConnect / Python Sandbox API

Lifecycle Hooks:
- on_start(context): Called when strategy starts
- on_tick(tick, context): Called on every level-1 quote/trade tick
- on_bar(bar, context): Called on candle bar completion
- on_fill(fill, context): Called on order fills
- on_exit(context): Called on strategy shutdown
"""

import numpy as np

def on_start(context):
    context.symbol = "AAPL"
    context.sma_fast_period = 5
    context.sma_slow_period = 20
    context.position = 0
    context.log("Strategy Initialized: Dual Moving Average Crossover Algorithm")

def on_bar(bar, context):
    prices = context.get_history(context.symbol, count=context.sma_slow_period)
    if len(prices) < context.sma_slow_period:
        return
        
    sma_fast = np.mean(prices[-context.sma_fast_period:])
    sma_slow = np.mean(prices[-context.sma_slow_period:])
    
    current_price = bar['close']
    context.log(f"Bar Time: {bar['time']} | Fast SMA: {sma_fast:.2f} | Slow SMA: {sma_slow:.2f}")

    # Golden Cross Trigger
    if sma_fast > sma_slow and context.position <= 0:
        qty = 100
        order_id = context.buy(context.symbol, quantity=qty, order_type="MARKET")
        context.position = qty
        context.log(f"GOLDEN CROSS BUY TRIGGERED: {qty} shares @ \${current_price:.2f} (Order #{order_id})")

    # Death Cross Trigger
    elif sma_fast < sma_slow and context.position > 0:
        order_id = context.sell(context.symbol, quantity=context.position, order_type="MARKET")
        context.log(f"DEATH CROSS SELL TRIGGERED: Closing position @ \${current_price:.2f}")
        context.position = 0

def on_fill(fill, context):
    context.log(f"ORDER FILLED: {fill['side']} {fill['quantity']} {fill['symbol']} @ \${fill['price']:.2f}")

def on_exit(context):
    context.log("Strategy Stopped. Cleaning up open positions.")
`;

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ ticker = 'AAPL', onRunStrategy }) => {
    const [code, setCode] = useState<string>(DEFAULT_PYTHON_STRATEGY);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [logs, setLogs] = useState<Array<{ id: number; time: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; text: string }>>([
        { id: 1, time: new Date().toLocaleTimeString(), type: 'INFO', text: 'Python Sandbox Ready. Click [Run Strategy] to compile and deploy bot.' }
    ]);

    const handleRun = () => {
        setIsRunning(true);
        const newLog = {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            type: 'SUCCESS' as const,
            text: `[SYSTEM] Strategy process spawned. Executing on_start() for ticker ${ticker}...`
        };
        setLogs(prev => [newLog, ...prev]);

        if (onRunStrategy) {
            onRunStrategy(code);
        }

        setTimeout(() => {
            setLogs(prev => [{
                id: Date.now() + 1,
                time: new Date().toLocaleTimeString(),
                type: 'INFO',
                text: `[BOT] Strategy Initialized: Dual Moving Average Crossover Algorithm`
            }, ...prev]);
        }, 800);

        setTimeout(() => {
            setLogs(prev => [{
                id: Date.now() + 2,
                time: new Date().toLocaleTimeString(),
                type: 'SUCCESS',
                text: `[EXECUTION] GOLDEN CROSS BUY TRIGGERED: 100 shares @ $185.75`
            }, ...prev]);
        }, 2000);
    };

    const handleStop = () => {
        setIsRunning(false);
        setLogs(prev => [{
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            type: 'WARNING',
            text: '[SYSTEM] Bot execution halted by user.'
        }, ...prev]);
    };

    const handleClearLogs = () => {
        setLogs([]);
    };

    return (
        <div className="monaco-ide-container">
            <div className="ide-toolbar">
                <div className="ide-title">
                    <Code2 size={18} className="ide-icon" />
                    <span>Python Strategy IDE</span>
                    <span className="file-tag">strategy.py</span>
                </div>

                <div className="ide-controls">
                    {isRunning ? (
                        <button className="ide-btn stop-btn" onClick={handleStop}>
                            <Square size={14} /> Stop Bot
                        </button>
                    ) : (
                        <button className="ide-btn run-btn" onClick={handleRun}>
                            <Play size={14} /> Run Strategy
                        </button>
                    )}
                    <button className="ide-btn icon-only" onClick={handleClearLogs} title="Clear Console">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="ide-body">
                <div className="editor-pane">
                    <Editor
                        height="100%"
                        defaultLanguage="python"
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        options={{
                            fontSize: 13,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 4,
                            lineNumbersMinChars: 3,
                            fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace'
                        }}
                    />
                </div>

                <div className="console-pane">
                    <div className="console-header">
                        <Terminal size={14} />
                        <span>Execution Output Console</span>
                        <Cpu size={14} className="cpu-icon" />
                    </div>

                    <div className="console-logs">
                        {logs.map((log) => (
                            <div key={log.id} className={`log-entry log-${log.type.toLowerCase()}`}>
                                <span className="log-time">[{log.time}]</span>
                                {log.type === 'SUCCESS' && <CheckCircle2 size={12} className="log-icon" />}
                                {log.type === 'WARNING' && <AlertTriangle size={12} className="log-icon" />}
                                <span className="log-msg">{log.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
