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

    // Helper to parse color strings
    const parseColor = (color: string) => {
      if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
          return { r: parseInt(matches[0]), g: parseInt(matches[1]), b: parseInt(matches[2]) };
        }
      }
      if (color.startsWith('#')) {
        const hex = color.substring(1);
        if (hex.length === 3) {
          return {
            r: parseInt(hex[0] + hex[0], 16),
            g: parseInt(hex[1] + hex[1], 16),
            b: parseInt(hex[2] + hex[2], 16)
          };
        }
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16)
        };
      }
      return { r: 255, g: 87, b: 34 }; // Default TE Orange
    };

    const draw = () => {
      const values = AudioEngine.getFrequencyData();
      const masterLevelDb = AudioEngine.getMasterLevel() as number;
      
      // Get theme colors
      const style = getComputedStyle(document.documentElement);
      const bgPrimary = style.getPropertyValue('--bg-tertiary').trim() || '#1e1e1e';
      const accentColorStr = style.getPropertyValue('--accent-primary').trim() || '#ff5722';
      const inactiveColor = style.getPropertyValue('--step-off').trim() || '#2a2a2a';
      
      const accentRGB = parseColor(accentColorStr);
      // Dark Red for the top/clipping pixels
      const darkRedRGB = { r: 180, g: 20, b: 20 };

      // Clear
      ctx.fillStyle = bgPrimary;
      ctx.fillRect(0, 0, width, height);

      const getPixelColor = (r: number, isClipping: boolean) => {
        // factor 0 at bottom, 1 at top
        const factor = r / (rows - 1);
        
        // If we are clipping at the very top, make it even more intense/pure red
        if (isClipping && r === rows - 1) {
           return 'rgb(255, 0, 0)';
        }

        const currR = Math.round(accentRGB.r + factor * (darkRedRGB.r - accentRGB.r));
        const currG = Math.round(accentRGB.g + factor * (darkRedRGB.g - accentRGB.g));
        const currB = Math.round(accentRGB.b + factor * (darkRedRGB.b - accentRGB.b));
        
        return `rgb(${currR}, ${currG}, ${currB})`;
      };

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
              const color = getPixelColor(r, false);
              ctx.fillStyle = color;
              ctx.shadowColor = color;
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
        const masterXStart = (cols + 1) * (pixelSize + gap) + gap;
        
        const masterMin = -60;
        const masterMax = 0;
        let masterNorm = (masterLevelDb - masterMin) / (masterMax - masterMin);
        masterNorm = Math.max(0, Math.min(1.2, masterNorm)); 

        const masterLit = Math.floor(masterNorm * rows);
        const isMasterClipping = masterLevelDb > -0.5;

        for (let r = 0; r < rows; r++) {
            const y = height - ((r + 1) * (pixelSize + gap));
            const x = masterXStart;
            
            if (r < masterLit) {
                 const color = getPixelColor(r, isMasterClipping);
                 ctx.fillStyle = color;
                 ctx.shadowColor = color;
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
