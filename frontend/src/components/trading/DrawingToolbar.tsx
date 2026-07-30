import React from 'react';
import { 
    MousePointer, 
    TrendingUp, 
    Square, 
    Hash, 
    Type, 
    Minus, 
    MoreVertical, 
    Ruler, 
    Brush, 
    Tag,
    Trash2
} from 'lucide-react';

interface DrawingToolbarProps {
    activeTool: string;
    onSelectTool: (tool: string) => void;
    onClearDrawings?: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
    activeTool,
    onSelectTool,
    onClearDrawings
}) => {
    const tools = [
        { id: 'pointer', icon: MousePointer, title: 'Cursor Pointer' },
        { id: 'trendline', icon: TrendingUp, title: 'Trendline' },
        { id: 'hline', icon: Minus, title: 'Horizontal Price Line' },
        { id: 'vline', icon: MoreVertical, title: 'Vertical Time Line' },
        { id: 'fib', icon: Hash, title: 'Fibonacci Retracement' },
        { id: 'rectangle', icon: Square, title: 'Rectangle Zone' },
        { id: 'brush', icon: Brush, title: 'Freehand Brush' },
        { id: 'text', icon: Type, title: 'Text Note' },
        { id: 'measure', icon: Ruler, title: 'Price/Time Ruler' },
        { id: 'label', icon: Tag, title: 'Price Label' },
    ];

    return (
        <div className="drawing-toolbar">
            {tools.map(tool => {
                const Icon = tool.icon;
                return (
                    <button
                        key={tool.id}
                        className={`draw-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                        onClick={() => onSelectTool(tool.id)}
                        title={tool.title}
                    >
                        <Icon size={16} />
                    </button>
                );
            })}

            {onClearDrawings && (
                <button
                    className="draw-tool-btn clear-btn"
                    onClick={onClearDrawings}
                    title="Clear All Drawings"
                >
                    <Trash2 size={16} className="text-red" />
                </button>
            )}
        </div>
    );
};
