import React, { useRef, useEffect, useCallback, useState } from 'react';

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
  const touchStartY = useRef<number | null>(null);
  const touchStartVelocity = useRef<number>(velocity);
  const [isTouchAdjusting, setIsTouchAdjusting] = useState(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWheel(e);
  }, [onWheel]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isActive) return;
    
    // Check if this is a long press for velocity adjustment
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartVelocity.current = velocity;
    
    // Set a small timeout to distinguish between tap and swipe
    setTimeout(() => {
      if (touchStartY.current !== null) {
        setIsTouchAdjusting(true);
      }
    }, 100);
  }, [isActive, velocity]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isActive || touchStartY.current === null || !isTouchAdjusting) return;
    
    e.preventDefault(); // Prevent scrolling while adjusting velocity
    
    const touch = e.touches[0];
    const deltaY = touchStartY.current - touch.clientY; // Inverted: swipe up = increase
    const velocityChange = Math.round(deltaY / 2); // 2px = 1 velocity unit
    
    // Create a synthetic wheel event
    const syntheticEvent = new WheelEvent('wheel', {
      deltaY: -velocityChange, // Negative because we want swipe up to increase
      bubbles: true,
      cancelable: true,
    });
    
    onWheel(syntheticEvent);
    
    // Reset start position for continuous adjustment
    touchStartY.current = touch.clientY;
  }, [isActive, isTouchAdjusting, onWheel]);

  const handleTouchEnd = useCallback(() => {
    touchStartY.current = null;
    setIsTouchAdjusting(false);
  }, []);

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
      className={`step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''} ${isTouchAdjusting ? 'adjusting' : ''}`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isActive && <div className="step-velocity">{velocity}</div>}
    </div>
  );
};

