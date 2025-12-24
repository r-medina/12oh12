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

    // Lofi resolution
    const width = 64;
    const height = 16; 
    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      // Get frequency data (Float32Array usually -Infinity to 0dB, or linear if using waveform)
      // We used 'fft' in engine, default is dB
      const values = AudioEngine.getFrequencyData(); // Float32Array
      
      // Clear
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color') || '#000';
      ctx.fillRect(0, 0, width, height);

      if (values instanceof Float32Array || values instanceof Uint8Array) {
        const binCount = values.length;
        // We want to map ~32 bars
        const barWidth = 2; // 32 bars * 2px = 64px
        const totalBars = width / barWidth;
        
        ctx.fillStyle = '#ff5500'; // Will be overridden by CSS variable usually, but hardcode fallbacks or use CSS var in JS if needed. 
        // Better: use the active color from theme.
        const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--active-color').trim() || '#ff0000';
        ctx.fillStyle = activeColor;
        
        for (let i = 0; i < totalBars; i++) {
          // Map bar index to frequency bin
          // We have binCount bins (e.g. 32 or 64).
          // If 64 bins, and 32 bars, step is 2.
          const binIndex = Math.floor(i * (binCount / totalBars));
          const val = values[binIndex];
          
          // val is in dB, usually -100 to 0
          // Mapping to height 0-16
          // range: -100 -> 0 height, -30 -> full height?
          const minDb = -100;
          const maxDb = -30;
          
          let normalized = (val - minDb) / (maxDb - minDb);
          if (normalized < 0) normalized = 0;
          if (normalized > 1) normalized = 1;
          
          const barHeight = Math.floor(normalized * height);
          
          if (barHeight > 0) {
             // Draw pixelated bar
             ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
          }
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
