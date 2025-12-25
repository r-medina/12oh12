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
    const pixelSize = 4;
    // Add extra columns for Master meter (gap + master bar)
    const masterCols = 2; // Gap + Meter
    const totalCols = cols + masterCols;
    
    const width = totalCols * (pixelSize + gap) + gap;
    const height = rows * (pixelSize + gap) + gap;
    
    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      const values = AudioEngine.getFrequencyData();
      const masterLevelDb = AudioEngine.getMasterLevel() as number;
      
      // Get theme colors
      const style = getComputedStyle(document.documentElement);
      const bgPrimary = style.getPropertyValue('--bg-tertiary').trim() || '#1e1e1e';
      const accentColor = style.getPropertyValue('--accent-primary').trim() || '#ff5722';
      const inactiveColor = style.getPropertyValue('--step-off').trim() || '#2a2a2a';
      const clipColor = '#ff3333'; // Red for clipping

      // Clear
      ctx.fillStyle = bgPrimary;
      ctx.fillRect(0, 0, width, height);

      if (values instanceof Float32Array || values instanceof Uint8Array) {
        const binCount = values.length;
        
        // Draw Frequency Bars
        for (let c = 0; c < cols; c++) {
          const binIndex = Math.floor(c * (binCount / cols));
          const val = values[binIndex];
          
          const minDb = -80;
          const maxDb = -20;
          let normalized = (val - minDb) / (maxDb - minDb);
          normalized = Math.max(0, Math.min(1, normalized));
          
          const litPixels = Math.floor(normalized * rows);

          for (let r = 0; r < rows; r++) {
            const y = height - ((r + 1) * (pixelSize + gap));
            const x = gap + c * (pixelSize + gap);
            
            if (r < litPixels) {
              // Active pixel
              // Turn top pixel red if near max
              if (r === rows - 1) {
                 ctx.fillStyle = clipColor;
                 ctx.shadowColor = clipColor;
              } else {
                 ctx.fillStyle = accentColor;
                 ctx.shadowColor = accentColor;
              }
              ctx.shadowBlur = 1;
            } else {
              // Inactive pixel
              ctx.fillStyle = inactiveColor;
              ctx.shadowBlur = 0;
            }
            
            ctx.fillRect(x, y, pixelSize, pixelSize);
          }
          ctx.shadowBlur = 0;
        }

        // Draw Master Meter
        // Add a small gap before master meter
        const masterXStart = (cols + 1) * (pixelSize + gap) + gap;
        
        // Master Level Mapping
        // Range: -60dB to 0dB (clipping > 0)
        // Be a bit more sensitive near the top
        const masterMin = -60;
        const masterMax = 0;
        let masterNorm = (masterLevelDb - masterMin) / (masterMax - masterMin);
        masterNorm = Math.max(0, Math.min(1.2, masterNorm)); // Allow it to go slightly over 1 to show hard clipping

        const masterLit = Math.floor(masterNorm * rows);

        for (let r = 0; r < rows; r++) {
            const y = height - ((r + 1) * (pixelSize + gap));
            const x = masterXStart; // Single wide column or just one column
            
            if (r < masterLit) {
                 // Check for clipping logic using raw dB value
                 // If we are in the top row OR global level > -0.5dB, turn red
                 if (r === rows - 1 || masterLevelDb > -0.5) {
                    ctx.fillStyle = clipColor;
                    ctx.shadowColor = clipColor;
                 } else {
                    ctx.fillStyle = accentColor;
                    ctx.shadowColor = accentColor;
                 }
                 ctx.shadowBlur = 1;
            } else {
                ctx.fillStyle = inactiveColor;
                ctx.shadowBlur = 0;
            }
            ctx.fillRect(x, y, pixelSize, pixelSize);
        }
        ctx.shadowBlur = 0;
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
