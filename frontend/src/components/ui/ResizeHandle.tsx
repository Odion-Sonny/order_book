'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeHandleProps {
  orientation: 'vertical' | 'horizontal';
  /** Called with the pointer delta in px since the drag started. */
  onResize: (delta: number) => void;
  onDoubleClick?: () => void;
  'aria-label': string;
}

/**
 * Thin drag affordance between docked panels. Pointer capture keeps the drag
 * alive when the cursor leaves the 4px hit area.
 */
export function ResizeHandle({
  orientation,
  onResize,
  onDoubleClick,
  'aria-label': ariaLabel,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);
  const originRef = useRef(0);
  const vertical = orientation === 'vertical';

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      originRef.current = vertical ? event.clientX : event.clientY;
      setDragging(true);
    },
    [vertical],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const position = vertical ? event.clientX : event.clientY;
      onResize(position - originRef.current);
      originRef.current = position;
    },
    [dragging, onResize, vertical],
  );

  const stop = useCallback(() => setDragging(false), []);

  // A drag that ends outside the window still has to release.
  useEffect(() => {
    if (!dragging) return;
    document.body.classList.add('no-select');
    window.addEventListener('pointerup', stop);
    return () => {
      document.body.classList.remove('no-select');
      window.removeEventListener('pointerup', stop);
    };
  }, [dragging, stop]);

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onDoubleClick={onDoubleClick}
      className={[
        'relative shrink-0 z-20 transition-colors duration-150',
        vertical ? 'w-[3px] cursor-col-resize' : 'h-[3px] cursor-row-resize',
        dragging ? 'bg-accent' : 'bg-line hover:bg-accent/70',
      ].join(' ')}
    >
      <span
        className={
          vertical
            ? 'absolute inset-y-0 -left-1 -right-1'
            : 'absolute inset-x-0 -top-1 -bottom-1'
        }
      />
    </div>
  );
}
