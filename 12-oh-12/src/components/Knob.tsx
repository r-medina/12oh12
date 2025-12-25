import React, { useState, useEffect, useRef } from 'react';
import { usePreventScroll } from '../hooks/usePreventScroll';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  label?: string;
  size?: number;
  step?: number;
  onDoubleClick?: () => void;
}

export const Knob: React.FC<KnobProps> = ({ 
  value, 
  min, 
  max, 
  onChange, 
  label, 
  size = 36,
  step = 1,
  onDoubleClick
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startValue = useRef<number>(0);
  const knobRef = useRef<HTMLDivElement>(null);
  
  // Prevent page scroll when hovering over knob
  usePreventScroll(knobRef);
  
  // Convert value to angle (-135 to 135 degrees)
  const angle = ((value - min) / (max - min)) * 270 - 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    document.body.style.cursor = 'ns-resize';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    startValue.current = value;
    // Prevent default to avoid scrolling while dragging
    // e.preventDefault() on React synthetic events might be tricky, 
    // better handled in the move listener or via styling, but often 
    // stopPropagation helps avoid other gesture conflicts.
    e.stopPropagation(); 
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent page scroll
    
    // Scroll direction: deltaY > 0 is "scroll down" -> increase value
    const delta = e.deltaY > 0 ? step : -step;
    let newValue = value + delta;
    
    // Clamp to range
    newValue = Math.max(min, Math.min(max, newValue));
    
    // Apply step rounding
    if (step) {
      newValue = Math.round(newValue / step) * step;
    }
    
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  useEffect(() => {
    const handleMove = (clientY: number) => {
      const deltaY = startY.current - clientY;
      const range = max - min;
      // Sensitivity: 100px drag = full range
      const deltaVal = (deltaY / 100) * range; 
      
      let newValue = startValue.current + deltaVal;
      
      // Clamp
      newValue = Math.min(max, Math.max(min, newValue));
      
      // Step
      if (step) {
        newValue = Math.round(newValue / step) * step;
      }
      
      onChange(newValue);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      handleMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault(); // Prevent scrolling
      handleMove(e.touches[0].clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, min, max, onChange, step]);
  
  // Colors from CSS vars (simplified for SVG)
  const trackColor = "#333";
  const activeColor = "#ff5722";
  const indicatorColor = "#fff";

  return (
    <div className="knob-container" style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div 
        ref={knobRef}
        className="knob-control" 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={onDoubleClick}
        onWheel={handleWheel}
        style={{ 
          width: size, 
          height: size, 
          cursor: 'ns-resize', 
          position: 'relative',
          touchAction: 'none' // Important for browser to allow us to handle touch
        }}
      >
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track */}
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            fill="none" 
            stroke={trackColor} 
            strokeWidth="8"
            strokeDasharray="188.5 252" // 270 degrees (0.75 * 251.3)
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-135 50 50)"
          />
          
          {/* Active Value Arc */}
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            fill="none" 
            stroke={activeColor} 
            strokeWidth="8"
            strokeDasharray={`${((value - min) / (max - min)) * 188.5} 252`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-135 50 50)"
          />
        </svg>
        
        {/* Indicator Dot/Line wrapper to rotate */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: `rotate(${angle}deg)`,
            pointerEvents: 'none'
          }}
        >
          <div 
             style={{
               position: 'absolute',
               top: '12%',
               left: '50%',
               width: 2,
               height: 6,
               backgroundColor: indicatorColor,
               transform: 'translate(-50%, 0)',
               borderRadius: 1
             }}
          />
        </div>
      </div>
      {label && <span className="knob-label">{label}</span>}
    </div>
  );
};
