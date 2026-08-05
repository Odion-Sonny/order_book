'use client';

import { PythonEditorPanel } from './PythonEditorPanel';
import { StrategyOutputPanel } from './StrategyOutputPanel';

/**
 * The strategy lab: editor on the left, results on the right, so a run and its
 * metrics sit side by side instead of on two tabs you have to swap between.
 */
export function BacktestPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-line lg:border-r">
        <PythonEditorPanel />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-line lg:border-t-0">
        <StrategyOutputPanel />
      </div>
    </div>
  );
}
