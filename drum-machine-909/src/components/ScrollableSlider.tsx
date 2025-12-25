import React, { useRef, useEffect, useCallback } from 'react';

interface ScrollableSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Optional callback for wheel events. If not provided, the component will
   * still prevent page scroll and update the value internally.
   */
  onWheelChange?: (e: WheelEvent, newValue: number) => void;
}

/**
 * A range slider that properly prevents page scrolling when the user scrolls over it.
 * This works around React's passive wheel event listeners.
 */
export const ScrollableSlider: React.FC<ScrollableSliderProps> = ({
  onWheelChange,
  onChange,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const input = inputRef.current;
    if (!input) return;

    const min = parseFloat(input.min || "0");
    const max = parseFloat(input.max || "100");
    const step = parseFloat(input.step || "1");
    const current = parseFloat(input.value);
    
    // deltaY > 0 is "Up" (increasing value) for this user's setup
    const delta = e.deltaY > 0 ? step : -step;
    const newValue = Math.max(min, Math.min(max, current + delta));

    if (newValue === current) return;

    if (onWheelChange) {
      onWheelChange(e, newValue);
    }

    // Support for React controlled inputs by bypassing its internal value tracking
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 
      "value"
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, String(newValue));
    } else {
      input.value = String(newValue);
    }
    
    // Dispatch events to trigger React's onChange
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [onWheelChange]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;

    // Add the wheel listener as non-passive to allow preventDefault
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  return (
    <input
      ref={inputRef}
      type="range"
      onChange={onChange}
      {...props}
    />
  );
};
