import React, { useRef, useEffect, useCallback } from 'react';

interface ScrollableSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onWheel'> {
  onWheel?: (e: WheelEvent) => void;
}

/**
 * A wrapper for the <select> element that properly prevents page scrolling 
 * when using the wheel to change selection.
 */
export const ScrollableSelect: React.FC<ScrollableSelectProps> = ({
  onWheel,
  children,
  ...props
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (onWheel) {
      // If a custom onWheel handler is provided, let it handle prevention if it wants
      // but usually we want to prevent default here anyway if it's scroll-editable.
      e.preventDefault();
      e.stopPropagation();
      onWheel(e);
    } else {
      // Default behavior: just prevent scroll leakage
      e.preventDefault();
      e.stopPropagation();
    }
  }, [onWheel]);

  useEffect(() => {
    const element = selectRef.current;
    if (!element) return;

    // Add the wheel listener as non-passive to allow preventDefault
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  return (
    <select
      ref={selectRef}
      {...props}
    >
      {children}
    </select>
  );
};
