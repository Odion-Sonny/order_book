import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
    MousePointer, 
    Crosshair, 
    TrendingUp, 
    Grid, 
    Pencil, 
    Type, 
    Ruler, 
    ZoomIn, 
    Magnet, 
    Lock, 
    EyeOff, 
    Trash2 
} from 'lucide-react';

interface TradingViewDrawingBarProps {
    className?: string;
}

export const TradingViewDrawingBar: React.FC<TradingViewDrawingBarProps> = ({ className }) => {
    const [activeTool, setActiveTool] = useState<string>('crosshair');
    const [isMagnetOn, setIsMagnetOn] = useState<boolean>(false);
    const [isLocked, setIsLocked] = useState<boolean>(false);

    const tools = [
        { id: 'crosshair', name: 'Crosshair', icon: Crosshair },
        { id: 'pointer', name: 'Arrow Pointer', icon: MousePointer },
        { id: 'trendline', name: 'Trend Line Tool', icon: TrendingUp },
        { id: 'fibonacci', name: 'Fib Retracement', icon: Grid },
        { id: 'brush', name: 'Brush & Rectangle', icon: Pencil },
        { id: 'text', name: 'Text Note', icon: Type },
        { id: 'ruler', name: 'Measure Distance', icon: Ruler },
        { id: 'zoom', name: 'Zoom In/Out', icon: ZoomIn },
    ];

    return (
        <div className={cn(
            "w-12 bg-[#1e222d] border-r border-[#2a2e39] flex flex-col items-center py-2 justify-between select-none shrink-0",
            className
        )}>
            {/* Top Drawing Tools */}
            <div className="flex flex-col items-center gap-1">
                {tools.map(t => {
                    const Icon = t.icon;
                    const isActive = activeTool === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTool(t.id)}
                            title={t.name}
                            className={cn(
                                "w-8 h-8 rounded flex items-center justify-center transition-colors relative group",
                                isActive ? "bg-[#2962ff] text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            
                            {/* Tooltip */}
                            <span className="absolute left-full ml-2 px-2 py-1 bg-[#131722] text-white text-[10px] rounded border border-[#2a2e39] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl font-sans">
                                {t.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Bottom Utilities (Magnet, Lock, Hide, Trash) */}
            <div className="flex flex-col items-center gap-1 border-t border-[#2a2e39] pt-2 w-full px-2">
                <button
                    onClick={() => setIsMagnetOn(!isMagnetOn)}
                    title="Magnet Mode (Snap to OHLC)"
                    className={cn(
                        "w-8 h-8 rounded flex items-center justify-center transition-colors relative group",
                        isMagnetOn ? "bg-[#2962ff]/20 text-[#2962ff]" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                    )}
                >
                    <Magnet className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-[#131722] text-white text-[10px] rounded border border-[#2a2e39] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-sans">
                        Magnet Mode ({isMagnetOn ? 'On' : 'Off'})
                    </span>
                </button>

                <button
                    onClick={() => setIsLocked(!isLocked)}
                    title="Lock All Drawing Tools"
                    className={cn(
                        "w-8 h-8 rounded flex items-center justify-center transition-colors relative group",
                        isLocked ? "bg-[#2962ff]/20 text-[#2962ff]" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                    )}
                >
                    <Lock className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-[#131722] text-white text-[10px] rounded border border-[#2a2e39] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-sans">
                        Lock Drawings
                    </span>
                </button>

                <button
                    title="Hide All Drawings"
                    className="w-8 h-8 rounded flex items-center justify-center text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors relative group"
                >
                    <EyeOff className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-[#131722] text-white text-[10px] rounded border border-[#2a2e39] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-sans">
                        Hide Drawings
                    </span>
                </button>

                <button
                    title="Remove All Drawings"
                    className="w-8 h-8 rounded flex items-center justify-center text-[#787b86] hover:text-[#f23645] hover:bg-[#2a2e39] transition-colors relative group"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-[#131722] text-white text-[10px] rounded border border-[#2a2e39] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-sans">
                        Remove All Drawings
                    </span>
                </button>
            </div>
        </div>
    );
};
