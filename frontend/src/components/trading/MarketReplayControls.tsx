import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, Bookmark, RefreshCw, Calendar } from 'lucide-react';

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
    onJumpToYear?: (year: number) => void;
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
    onReset,
    onJumpToYear
}) => {
    const [selectedYear, setSelectedYear] = useState<number>(2026);
    const speeds = [1, 2, 5, 20, 100];
    const years = [2021, 2022, 2023, 2024, 2025, 2026];
    const progressPct = totalTicks > 0 ? (currentTickIndex / totalTicks) * 100 : 0;

    const handleYearSelect = (yr: number) => {
        setSelectedYear(yr);
        if (onJumpToYear) onJumpToYear(yr);
        const fraction = (yr - 2021) / 5;
        const targetIndex = Math.floor(fraction * totalTicks);
        onSeek(Math.min(targetIndex, Math.max(totalTicks - 1, 0)));
    };

    return (
        <div className="replay-bar">
            <div className="replay-status">
                <span className={`replay-badge ${isPlaying ? 'active' : ''}`}>
                    {isPlaying ? '● REPLAYING' : '❚❚ PAUSED'}
                </span>
                <span className="replay-clock">
                    Bar #{currentTickIndex} / {totalTicks}
                </span>
            </div>

            {/* Playback Controls */}
            <div className="replay-actions">
                <button className="replay-btn" onClick={onReset} title="Reset Replay">
                    <RefreshCw size={15} />
                </button>
                <button className="replay-btn" onClick={() => onStep('prev')} title="Step Back (←)">
                    <SkipBack size={15} />
                </button>
                <button className={`replay-btn play-btn ${isPlaying ? 'playing' : ''}`} onClick={onTogglePlay}>
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button className="replay-btn" onClick={() => onStep('next')} title="Step Forward (→)">
                    <SkipForward size={15} />
                </button>
            </div>

            {/* 5-Year History Backlog Jump Bar */}
            <div className="replay-history-jump">
                <Calendar size={13} className="cal-icon" />
                <span>5Y Backlog:</span>
                {years.map(yr => (
                    <button
                        key={yr}
                        className={`year-btn ${selectedYear === yr ? 'active' : ''}`}
                        onClick={() => handleYearSelect(yr)}
                    >
                        '{String(yr).slice(2)}
                    </button>
                ))}
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

            <button className="replay-btn bookmark-btn" title="Add Replay Bookmark">
                <Bookmark size={15} />
            </button>
        </div>
    );
};
