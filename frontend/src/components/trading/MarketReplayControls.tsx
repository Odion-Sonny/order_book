import React from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, Bookmark, RefreshCw } from 'lucide-react';

interface MarketReplayControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    speed: number;
    onSpeedChange: (speed: number) => void;
    currentTickIndex: number;
    totalTicks: number;
    onSeek: (index: number) => void;
    onStep: (direction: 'prev' | 'next') => void;
    onReset: () => void;
}

export const MarketReplayControls: React.FC<MarketReplayControlsProps> = ({
    isPlaying,
    onTogglePlay,
    speed,
    onSpeedChange,
    currentTickIndex,
    totalTicks,
    onSeek,
    onStep,
    onReset
}) => {
    const speeds = [1, 2, 5, 20, 100];
    const progressPct = totalTicks > 0 ? (currentTickIndex / totalTicks) * 100 : 0;

    return (
        <div className="replay-bar">
            <div className="replay-status">
                <span className={`replay-badge ${isPlaying ? 'active' : ''}`}>
                    {isPlaying ? '● REPLAYING' : '❚❚ PAUSED'}
                </span>
                <span className="replay-clock">
                    Tick #{currentTickIndex} / {totalTicks}
                </span>
            </div>

            {/* Playback Controls */}
            <div className="replay-actions">
                <button className="replay-btn" onClick={onReset} title="Reset Replay">
                    <RefreshCw size={16} />
                </button>
                <button className="replay-btn" onClick={() => onStep('prev')} title="Step Back (←)">
                    <SkipBack size={16} />
                </button>
                <button className={`replay-btn play-btn ${isPlaying ? 'playing' : ''}`} onClick={onTogglePlay}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button className="replay-btn" onClick={() => onStep('next')} title="Step Forward (→)">
                    <SkipForward size={16} />
                </button>
            </div>

            {/* Timeline Scrubber */}
            <div className="replay-timeline">
                <input
                    type="range"
                    min={0}
                    max={Math.max(totalTicks - 1, 0)}
                    value={currentTickIndex}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="timeline-scrubber"
                />
                <div className="timeline-fill" style={{ width: `${progressPct}%` }} />
            </div>

            {/* Speed Multipliers */}
            <div className="replay-speeds">
                <FastForward size={14} className="speed-icon" />
                {speeds.map((s) => (
                    <button
                        key={s}
                        className={`speed-btn ${speed === s ? 'active' : ''}`}
                        onClick={() => onSpeedChange(s)}
                    >
                        {s}x
                    </button>
                ))}
            </div>

            <button className="replay-btn bookmark-btn" title="Add Bookmark">
                <Bookmark size={16} />
            </button>
        </div>
    );
};
