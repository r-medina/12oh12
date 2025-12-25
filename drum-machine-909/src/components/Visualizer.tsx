import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/engine';

interface VisualizerProps {
  theme: 'day' | 'night';
  isPlaying: boolean;
}

export function Visualizer({ theme, isPlaying }: VisualizerProps) {
  const [on, setOn] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sizing needs to be set regardless of ON/OFF state 
    // so the blank canvas is the right size
    const cols = 32;
    const rows = 8;
    const gap = 2;
    const pixelSize = 4;
    const masterCols = 2;
    const totalCols = cols + masterCols;
    
    const width = totalCols * (pixelSize + gap) + gap;
    const height = rows * (pixelSize + gap) + gap;
    
    canvas.width = width;
    canvas.height = height;

    const style = getComputedStyle(document.documentElement);
    const bgPrimary = style.getPropertyValue('--bg-tertiary').trim() || '#1e1e1e';
    
    // Clear / Background
    ctx.fillStyle = bgPrimary;
    ctx.fillRect(0, 0, width, height);

    // Removed early return to keep loop running for Master Meter

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

    let animationId: number;
    let lastDrawTime = 0;
    const targetFps = 16;
    const frameInterval = 1000 / targetFps;

    // Cache computed styles outside draw loop for performance
    const accentColorStr = style.getPropertyValue('--accent-primary').trim() || '#ff5722';
    const inactiveColor = style.getPropertyValue('--step-off').trim() || '#2a2a2a';
    const accentRGB = parseColor(accentColorStr);
    const darkRedRGB = { r: 180, g: 20, b: 20 };

    const getPixelColor = (r: number, isClipping: boolean) => {
      const factor = r / (rows - 1);
      
      if (isClipping && r === rows - 1) {
         return 'rgb(255, 0, 0)';
      }

      const currR = Math.round(accentRGB.r + factor * (darkRedRGB.r - accentRGB.r));
      const currG = Math.round(accentRGB.g + factor * (darkRedRGB.g - accentRGB.g));
      const currB = Math.round(accentRGB.b + factor * (darkRedRGB.b - accentRGB.b));
      
      return `rgb(${currR}, ${currG}, ${currB})`;
    };

    const draw = (timestamp: number) => {
      animationId = requestAnimationFrame(draw);

      const elapsed = timestamp - lastDrawTime;
      if (elapsed < frameInterval) return;

      lastDrawTime = timestamp - (elapsed % frameInterval);

      const masterLevelDb = AudioEngine.getMasterLevel() as number;

      // Clear
      ctx.fillStyle = bgPrimary;
      ctx.fillRect(0, 0, width, height);

      // Draw Frequency Bars (ONLY IF ON AND PLAYING)
      if (on && isPlaying) {
        const values = AudioEngine.getFrequencyData();
        
        if (values instanceof Float32Array || values instanceof Uint8Array) {
          const binCount = values.length;
          for (let c = 0; c < cols; c++) {
            // Logarithmic x-axis
            const minBin = 1;
            const maxBin = binCount - 1;
            const binIndex = Math.floor(minBin * Math.pow(maxBin / minBin, c / (cols - 1)));
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
                ctx.fillStyle = inactiveColor;
                ctx.shadowBlur = 0;
              }
              
              ctx.fillRect(x, y, pixelSize, pixelSize);
            }
            ctx.shadowBlur = 0;
          }
        }
      } else {
         // If OFF, draw inactive grid for consistent aesthetics
         for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              const y = height - ((r + 1) * (pixelSize + gap));
              const x = gap + c * (pixelSize + gap);
              ctx.fillStyle = inactiveColor;
              ctx.fillRect(x, y, pixelSize, pixelSize);
            }
         }
      }

      // Draw Master Meter (ALWAYS)
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
    };

    animationId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationId);
  }, [on, theme, isPlaying]);

  return (
    <div className="visualizer-container" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} className="visualizer-canvas" />
      <div 
        className={`visualizer-toggle ${on ? 'active' : ''}`} 
        onClick={() => setOn(!on)}
        title="Toggle Frequency Visualizer"
      >
        <span className="visualizer-toggle-label">FFT</span>
        <div className="visualizer-toggle-track">
          <div className="visualizer-toggle-thumb" />
        </div>
      </div>
    </div>
  );
}
