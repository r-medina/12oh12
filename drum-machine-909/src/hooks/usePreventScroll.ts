import { useEffect, type RefObject } from 'react';

/**
 * Hook to prevent page scroll when wheel events occur on an element.
 * This is necessary because React's synthetic onWheel events are passive by default
 * in modern browsers, meaning preventDefault() doesn't work to stop page scrolling.
 * 
 * By attaching a native event listener with { passive: false }, we can properly
 * prevent the page from scrolling when the user scrolls over editable controls
 * like sliders and knobs.
 */
export function usePreventScroll(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      // Always prevent default to stop page scroll
      e.preventDefault();
    };

    // Add the wheel listener as non-passive to allow preventDefault
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [ref]);
}
