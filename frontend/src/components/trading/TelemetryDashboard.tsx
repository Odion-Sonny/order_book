import React, { useState, useEffect } from 'react';
import { Activity, Server, Zap, HardDrive, Wifi, ShieldCheck, Gauge } from 'lucide-react';

export const TelemetryDashboard: React.FC = () => {
    const [tickRate, setTickRate] = useState<number>(1450);
    const [ordersPerSec, setOrdersPerSec] = useState<number>(128);
    const [wsLatency, setWsLatency] = useState<number>(14);
    const [memUsage, setMemUsage] = useState<number>(42.8);
    const [queueDepth, setQueueDepth] = useState<number>(3);

    // Simulate real-time micro-fluctuations in telemetry metrics
    useEffect(() => {
        const interval = setInterval(() => {
            setTickRate(Math.floor(1400 + Math.random() * 200));
            setOrdersPerSec(Math.floor(110 + Math.random() * 40));
            setWsLatency(Math.floor(12 + Math.random() * 6));
            setMemUsage(parseFloat((42.5 + Math.random() * 0.8).toFixed(1)));
            setQueueDepth(Math.floor(Math.random() * 5));
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="telemetry-container">
            <div className="telemetry-header">
                <div className="telemetry-title">
                    <Activity size={18} className="telemetry-icon" />
                    <span>Engine Telemetry & Distributed Observability</span>
                </div>
                <div className="telemetry-badge">
                    <ShieldCheck size={14} /> SYSTEM HEALTHY (99.99%)
                </div>
            </div>

            <div className="telemetry-grid">
                {/* Metric 1 */}
                <div className="tele-card">
                    <div className="tele-card-header">
                        <Zap size={16} className="metric-icon glow-cyan" />
                        <span>Market Data Stream Rate</span>
                    </div>
                    <div className="tele-value">{tickRate.toLocaleString()} <span className="unit">ticks/sec</span></div>
                    <div className="tele-progress">
                        <div className="tele-bar" style={{ width: `${Math.min((tickRate / 2000) * 100, 100)}%` }} />
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="tele-card">
                    <div className="tele-card-header">
                        <Gauge size={16} className="metric-icon glow-green" />
                        <span>Order Engine Throughput</span>
                    </div>
                    <div className="tele-value">{ordersPerSec} <span className="unit">orders/sec</span></div>
                    <div className="tele-progress">
                        <div className="tele-bar green" style={{ width: `${Math.min((ordersPerSec / 200) * 100, 100)}%` }} />
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="tele-card">
                    <div className="tele-card-header">
                        <Wifi size={16} className="metric-icon glow-yellow" />
                        <span>WebSocket Ping Latency</span>
                    </div>
                    <div className="tele-value">{wsLatency} <span className="unit">ms</span></div>
                    <div className="tele-progress">
                        <div className="tele-bar yellow" style={{ width: `${Math.min((wsLatency / 50) * 100, 100)}%` }} />
                    </div>
                </div>

                {/* Metric 4 */}
                <div className="tele-card">
                    <div className="tele-card-header">
                        <HardDrive size={16} className="metric-icon glow-purple" />
                        <span>Memory Footprint</span>
                    </div>
                    <div className="tele-value">{memUsage} <span className="unit">% MB</span></div>
                    <div className="tele-progress">
                        <div className="tele-bar purple" style={{ width: `${memUsage}%` }} />
                    </div>
                </div>
            </div>

            {/* Microservices Architecture Status */}
            <div className="services-status-card">
                <div className="card-header">
                    <Server size={16} />
                    <span>Distributed Microservice Mesh Status</span>
                </div>

                <div className="services-list">
                    <div className="service-row">
                        <span className="svc-name">Market Feed Processor (Redis Stream)</span>
                        <span className="svc-status online">● ONLINE</span>
                        <span className="svc-metrics">Latency: 1.2ms | Queue: {queueDepth}</span>
                    </div>
                    <div className="service-row">
                        <span className="svc-name">Order Matching Engine</span>
                        <span className="svc-status online">● ONLINE</span>
                        <span className="svc-metrics">Queue: 0 | Executions: 100%</span>
                    </div>
                    <div className="service-row">
                        <span className="svc-name">Python Strategy Sandbox Runner</span>
                        <span className="svc-status online">● ACTIVE</span>
                        <span className="svc-metrics">Containers: 4 | Isolation: Sandboxed</span>
                    </div>
                    <div className="service-row">
                        <span className="svc-name">WebSocket Channels Gateway</span>
                        <span className="svc-status online">● ONLINE</span>
                        <span className="svc-metrics">Clients: 1 | Frames: 4,820/min</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
