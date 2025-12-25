import { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/engine';

export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Matrix configuration
    const cols = 32; // Number of frequency bands
    const rows = 8;  // Height resolution
    const gap = 2;   // Gap between pixels
    
    // Calculate sizing based on matrix
    // We want the pixels to be square. 
    // Let's determine total width based on container, but for now fixed internal res is fine
    // as we scale with CSS. 
    // However, to make it crisp, we should probably set width/height to accommodate the grid exactly.
    const pixelSize = 4;
    const width = cols * (pixelSize + gap) + gap;
    const height = rows * (pixelSize + gap) + gap;
    
    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      const values = AudioEngine.getFrequencyData();
      
      // Get theme colors
      const style = getComputedStyle(document.documentElement);
      const bgPrimary = style.getPropertyValue('--bg-tertiary').trim() || '#1e1e1e';
      const accentColor = style.getPropertyValue('--accent-primary').trim() || '#ff5722';
      const inactiveColor = style.getPropertyValue('--step-off').trim() || '#2a2a2a';
      
      // Clear
      ctx.fillStyle = bgPrimary;
      ctx.fillRect(0, 0, width, height);

      if (values instanceof Float32Array || values instanceof Uint8Array) {
        const binCount = values.length;
        // We only use the lower portion of the frequency spectrum usually, 
        // but AudioEngine.getFrequencyData() usually returns a usable range if configured right.
        
        for (let c = 0; c < cols; c++) {
          // Map column to frequency bin
          // Logarithmic distribution usually looks better, but linear is ok for simple
          const binIndex = Math.floor(c * (binCount / cols));
          const val = values[binIndex];
          
          // Map dB to height
          const minDb = -80;
          const maxDb = -20;
          let normalized = (val - minDb) / (maxDb - minDb);
          normalized = Math.max(0, Math.min(1, normalized));
          
          // Calculate how many "pixels" are lit
          const litPixels = Math.floor(normalized * rows);

          for (let r = 0; r < rows; r++) {
            // Draw from bottom up, so row 0 is bottom
            const y = height - ((r + 1) * (pixelSize + gap));
            const x = gap + c * (pixelSize + gap);
            
            if (r < litPixels) {
              // Active pixel
              ctx.fillStyle = accentColor;
              ctx.shadowBlur = 1;
              ctx.shadowColor = accentColor;
            } else {
              // Inactive pixel (matrix background)
              ctx.fillStyle = inactiveColor;
              ctx.shadowBlur = 0;
            }
            
            ctx.fillRect(x, y, pixelSize, pixelSize);
          }
           // Reset shadow for next column iteration (though we reset effectively by setting it per pixel)
           ctx.shadowBlur = 0;
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="visualizer-container">
      <canvas ref={canvasRef} className="visualizer-canvas" />
    </div>
  );
}
