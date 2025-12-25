import React, { useRef, useEffect, useCallback } from 'react';

interface StepProps {
  isActive: boolean;
  isCurrent: boolean;
  velocity: number;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onWheel: (e: WheelEvent) => void;
}

/**
 * A step button in the sequencer that properly prevents page scrolling when
 * scrolling to adjust velocity.
 */
export const Step: React.FC<StepProps> = ({
  isActive,
  isCurrent,
  velocity,
  onMouseDown,
  onMouseEnter,
  onWheel,
}) => {
  const stepRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWheel(e);
  }, [onWheel]);

  useEffect(() => {
    const element = stepRef.current;
    if (!element) return;

    // Add the wheel listener as non-passive to allow preventDefault
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  return (
    <div
      ref={stepRef}
      className={`step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
    >
      {isActive && <div className="step-velocity">{velocity}</div>}
    </div>
  );
};

