import React, { useState } from 'react';
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
    Tag 
} from 'lucide-react';

export const DrawingToolbar: React.FC = () => {
    const [activeTool, setActiveTool] = useState<string>('pointer');

    const tools = [
        { id: 'pointer', icon: MousePointer, title: 'Cursor Pointer' },
        { id: 'trendline', icon: TrendingUp, title: 'Trendline' },
        { id: 'hline', icon: Minus, title: 'Horizontal Line' },
        { id: 'vline', icon: MoreVertical, title: 'Vertical Line' },
        { id: 'fib', icon: Hash, title: 'Fibonacci Retracement' },
        { id: 'rectangle', icon: Square, title: 'Rectangle Zone' },
        { id: 'brush', icon: Brush, title: 'Brush Draw' },
        { id: 'text', icon: Type, title: 'Text Annotation' },
        { id: 'measure', icon: Ruler, title: 'Price / Time Ruler' },
        { id: 'label', icon: Tag, title: 'Price Tag' },
    ];

    return (
        <div className="drawing-toolbar">
            {tools.map(tool => {
                const Icon = tool.icon;
                return (
                    <button
                        key={tool.id}
                        className={`draw-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                        onClick={() => setActiveTool(tool.id)}
                        title={tool.title}
                    >
                        <Icon size={16} />
                    </button>
                );
            })}
        </div>
    );
};
