import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/engine';

interface VisualizerProps {
  theme: 'day' | 'night';
  isPlaying: boolean;
}

export function Visualizer({ theme, isPlaying }: VisualizerProps) {
  const [on, setOn] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<{ val: number, timer: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sizing needs to be set regardless of ON/OFF state 
    // so the blank canvas is the right size
    const cols = 32;
    const rows = 16;     // Unified high resolution
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

    const getPixelColor = (r: number, isClipping: boolean) => {
      // Use a power function to make the color transition more dramatic towards the top
      // This keeps the bottom few rows closer to the accent color and shifts rapidly at the top
      const factor = Math.pow(r / (rows - 1), 2); // Steeper curve
      
      if (isClipping && r === rows - 1) {
         return 'rgb(255, 255, 255)'; // Pure White for clipping
      }

      // Transition from accent color to a hot yellow/white
      const targetRGB = { r: 255, g: 255, b: 0 }; // Bright Yellow
      
      const currR = Math.round(accentRGB.r + factor * (targetRGB.r - accentRGB.r));
      const currG = Math.round(accentRGB.g + factor * (targetRGB.g - accentRGB.g));
      const currB = Math.round(accentRGB.b + factor * (targetRGB.b - accentRGB.b));
      
      return `rgb(${currR}, ${currG}, ${currB})`;
    };

    // Optimization: Cache row colors since they don't change per frame
    // This avoids 512+ math operations per frame
    const rowColorCache: string[] = [];
    for (let r = 0; r < rows; r++) {
        rowColorCache[r] = getPixelColor(r, false);
    }

    // Optimization: Pre-calculate grid coordinates
    // [col][row] -> {x, y}
    const gridCoords: {x: number, y: number}[][] = [];
    for (let c = 0; c < cols; c++) {
      gridCoords[c] = [];
      for (let r = 0; r < rows; r++) {
        const y = height - ((r + 1) * (pixelSize + gap));
        const x = gap + c * (pixelSize + gap);
        gridCoords[c][r] = { x, y };
      }
    }
    
    // Optimization: Pre-calculate Master Meter coordinates
    const masterXStart = (cols + 1) * (pixelSize + gap) + gap;
    const masterCoords: {x: number, y: number}[] = [];
    for(let r=0; r<rows; r++){
        const y = height - ((r + 1) * (pixelSize + gap));
        masterCoords[r] = { x: masterXStart, y };
    }

    // Peak Hold State
    const dropRate = 0.005; // Drop rate per ms (in normalized 0-1 units)
    const holdTime = 500;   // ms to hold peak before dropping

    // Initialize peaks if needed
    if (peaksRef.current.length !== totalCols) {
        peaksRef.current = Array(totalCols).fill(null).map(() => ({ val: 0, timer: 0 }));
    }

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
          
          // Optimization: Single Path for batch drawing inactive/active cells?
          // For now, simple rects are fast enough if logic is minimal.
          
          for (let c = 0; c < cols; c++) {
            // Logarithmic x-axis
            const minBin = 1;
            const maxBin = binCount - 1;
            const binIndex = Math.floor(minBin * Math.pow(maxBin / minBin, c / (cols - 1)));
            const val = values[binIndex];
            
            const minDb = -80;
            const maxDb = -40; // Increased sensitivity (was -20)
            let normalized = (val - minDb) / (maxDb - minDb);
            normalized = Math.max(0, Math.min(1, normalized));
            
            // Peak Hold Logic
            const peak = peaksRef.current[c];
            if (normalized > peak.val) {
                peak.val = normalized;
                peak.timer = holdTime;
            } else {
                if (peak.timer > 0) {
                    peak.timer -= elapsed;
                } else {
                    peak.val = Math.max(0, peak.val - dropRate * elapsed);
                }
            }

            const litPixels = Math.floor(normalized * rows);
            const peakPixel = Math.min(rows - 1, Math.floor(peak.val * rows));

            for (let r = 0; r < rows; r++) {
              const { x, y } = gridCoords[c][r];
              
              if (r < litPixels) {
                const color = rowColorCache[r];
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 1;
              } else if (r === peakPixel && peak.val > 0.05) {
                 // Peak Indicator
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                 ctx.shadowColor = rowColorCache[r];
                 ctx.shadowBlur = 0;
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
         // Reset peaks when off/stopped
         peaksRef.current.forEach(p => { p.val = 0; });

         // If OFF, draw inactive grid for consistent aesthetics
         for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              const { x, y } = gridCoords[c][r];
              ctx.fillStyle = inactiveColor;
              ctx.fillRect(x, y, pixelSize, pixelSize);
            }
         }
      }

      // Draw Master Meter (ALWAYS) - Higher resolution with dB-based colors
      const masterXStart = (cols + 1) * (pixelSize + gap) + gap;
      
      const masterMin = -60;  // dB floor
      const masterMax = 6;    // dB ceiling (allow some over for clipping indication)
      let masterNorm = (masterLevelDb - masterMin) / (masterMax - masterMin);
      masterNorm = Math.max(0, Math.min(1.0, masterNorm)); 

      const masterLit = Math.floor(masterNorm * rows);
      
      // Calculate the row that corresponds to 0 dB for the reference line
      const zeroDbNorm = (0 - masterMin) / (masterMax - masterMin);
      const zeroDbRow = Math.floor(zeroDbNorm * rows);

      // Color function for master meter based on dB level
      // Maps row position to dB level and returns appropriate color
      const getMasterColor = (row: number): string => {
        const rowDb = masterMin + (row / rows) * (masterMax - masterMin);
        
        if (rowDb >= 0) {
          // Clipping zone: red to white
          const factor = Math.min(1, (rowDb) / 6);
          const r = 255;
          const g = Math.round(50 + factor * 205);
          const b = Math.round(50 + factor * 205);
          return `rgb(${r}, ${g}, ${b})`;
        } else if (rowDb >= -6) {
          // Hot zone (-6 to 0): orange to red
          const factor = (rowDb + 6) / 6;
          const r = 255;
          const g = Math.round(165 - factor * 115); // 165 -> 50
          const b = 0;
          return `rgb(${r}, ${g}, ${b})`;
        } else if (rowDb >= -18) {
          // Caution zone (-18 to -6): yellow to orange  
          const factor = (rowDb + 18) / 12;
          const r = 255;
          const g = Math.round(220 - factor * 55); // 220 -> 165
          const b = 0;
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          // Safe zone (below -18): green to yellow
          const factor = (rowDb + 60) / 42; // -60 to -18
          const r = Math.round(factor * 255); // 0 -> 255
          const g = Math.round(180 + factor * 40); // 180 -> 220
          const b = 0;
          return `rgb(${r}, ${g}, ${b})`;
        }
      };

       // Peak hold for Master
       const masterPeakIdx = cols;
       const masterPeak = peaksRef.current[masterPeakIdx];
       
       if (masterNorm > masterPeak.val) {
           masterPeak.val = masterNorm;
           masterPeak.timer = holdTime;
       } else {
           if (masterPeak.timer > 0) {
               masterPeak.timer -= elapsed;
           } else {
               masterPeak.val = Math.max(0, masterPeak.val - dropRate * elapsed);
           }
       }
       const masterPeakPixel = Math.min(rows - 1, Math.floor(masterPeak.val * rows));


      for (let r = 0; r < rows; r++) {
          const y = height - ((r + 1) * (pixelSize + gap));
          const x = masterXStart;
          
          // Draw 0 dB reference line (dim outline on the 0dB row)
          const isZeroDbRow = r === zeroDbRow;
          
          if (r < masterLit) {
               const color = getMasterColor(r);
               ctx.fillStyle = color;
               ctx.shadowColor = color;
               ctx.shadowBlur = 1;
          } else if (r === masterPeakPixel && masterPeak.val > 0.05) {
               ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
               ctx.shadowBlur = 0;
          } else if (isZeroDbRow) {
               // 0 dB reference line - slightly brighter than inactive
               ctx.fillStyle = theme === 'night' ? '#555555' : '#999999';
               ctx.shadowBlur = 0;
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
