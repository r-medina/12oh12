import { useState, useEffect, useRef } from 'react';
import { AudioEngine } from './audio/engine';
import type { Instrument } from './types';

// Initial Pattern: Basic House Beat
const INITIAL_GRID: Record<Instrument, boolean[]> = {
  kick:  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  hihat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
  clap:  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  bass:  [false, false, true, false, false, true, false, false, false, true, false, false, true, false, false, true],
  kick909: [], snare909: [], hihat909: [], clap909: [] // Unused placeholders
};

const INITIAL_MUTES: Record<Instrument, boolean> = { 
  kick: false, snare: false, hihat: false, clap: false, bass: false,
  kick909: false, snare909: false, hihat909: false, clap909: false
};
const INITIAL_SOLOS: Record<Instrument, boolean> = { 
  kick: false, snare: false, hihat: false, clap: false, bass: false,
  kick909: false, snare909: false, hihat909: false, clap909: false
};
const INITIAL_VOLUMES: Record<Instrument, number> = { 
  kick: -12, snare: -12, hihat: -12, clap: -12, bass: -12,
  kick909: 0, snare909: 0, hihat909: 0, clap909: 0
};

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [swing, setSwing] = useState(0);
  
  const [grid, setGrid] = useState(INITIAL_GRID);
  const [mutes, setMutes] = useState(INITIAL_MUTES);
  const [solos, setSolos] = useState(INITIAL_SOLOS);
  const [volumes, setVolumes] = useState(INITIAL_VOLUMES);

  // Refs for drag-to-toggle
  const isDrawing = useRef(false);
  const drawMode = useRef(true); // true = turning on, false = turning off

  useEffect(() => {
    // Determine if audio is actually ready? 
    // Usually we just need a user interaction to start context
    const handleGlobalMouseUp = () => {
        isDrawing.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleStart = async () => {
    if (!isAudioReady) {
      await AudioEngine.init();
      setIsAudioReady(true);
    }
    
    // Sync initial state
    AudioEngine.setBpm(bpm);
    AudioEngine.updateGrid(grid);
    // Sync mutes/solos/volume
    (Object.keys(mutes) as Instrument[]).forEach(inst => {
        AudioEngine.setMute(inst, mutes[inst]);
        AudioEngine.setSolo(inst, solos[inst]);
        AudioEngine.setVolume(inst, volumes[inst]);
    });
    AudioEngine.updateBassPitches(bassPitches);

    AudioEngine.onStep((step) => {
      setCurrentStep(step);
    });

    const targetState = !isPlaying;
    setIsPlaying(targetState);
    AudioEngine.togglePlay(targetState);
  };

  const setStepState = (inst: Instrument, stepIndex: number, isActive: boolean) => {
    // Avoid unnecessary state updates
    if (grid[inst][stepIndex] === isActive) return;
    
    const newRow = [...grid[inst]];
    newRow[stepIndex] = isActive;
    const newGrid = { ...grid, [inst]: newRow };
    setGrid(newGrid);
    AudioEngine.updateGrid(newGrid);
  }

  const handleStepMouseDown = (inst: Instrument, stepIndex: number) => {
    isDrawing.current = true;
    const newState = !grid[inst][stepIndex];
    drawMode.current = newState;
    setStepState(inst, stepIndex, newState);
  };

  const handleStepMouseEnter = (inst: Instrument, stepIndex: number) => {
    if (isDrawing.current) {
        setStepState(inst, stepIndex, drawMode.current);
    }
  };


  const handleMute = (inst: Instrument) => {
    const newVal = !mutes[inst];
    setMutes({ ...mutes, [inst]: newVal });
    AudioEngine.setMute(inst, newVal);
  };

  const handleSolo = (inst: Instrument) => {
    const newVal = !solos[inst];
    setSolos({ ...solos, [inst]: newVal });
    AudioEngine.setSolo(inst, newVal);
  };

  const handleVolumeChange = (inst: Instrument, val: number) => {
    // Snap to -12dB when within ±2dB
    let snappedVal = val;
    if (val >= -14 && val <= -10 && val !== -12) {
      snappedVal = -12;
    }
    setVolumes({ ...volumes, [inst]: snappedVal });
    AudioEngine.setVolume(inst, snappedVal);
  };

  const handleVolumeWheel = (e: React.WheelEvent<HTMLInputElement>, inst: Instrument) => {
    e.preventDefault();
    const current = volumes[inst];
    const step = 1;
    // deltaY > 0 = scroll up (for this user's setup) = increase volume
    const delta = e.deltaY > 0 ? step : -step;
    let newValue = current + delta;
    
    // Clamp to range
    newValue = Math.max(-60, Math.min(0, newValue));
    
    // Snap to -12dB when crossing it, not when moving away
    if (current < -12 && newValue >= -12 && newValue <= -10) {
      newValue = -12;
    } else if (current > -12 && newValue <= -12 && newValue >= -14) {
      newValue = -12;
    }
    
    if (newValue !== current) {
      setVolumes({ ...volumes, [inst]: newValue });
      AudioEngine.setVolume(inst, newValue);
    }
  };

  const handleSliderWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    try {
      if (e.cancelable) e.preventDefault();
    } catch (err) {
      // Ignore passive listener errors
    }
    
    const input = e.currentTarget;
    const min = parseFloat(input.min || "0");
    const max = parseFloat(input.max || "100");
    const step = parseFloat(input.step || "1");
    const current = parseFloat(input.value);
    
    // Scroll direction: deltaY > 0 is "Up" for this user's preference/setup
    const delta = e.deltaY > 0 ? step : -step;
    const newValue = Math.max(min, Math.min(max, current + delta));

    if (newValue === current) return;

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
  };

  const handleSwingChange = (val: number) => {
    setSwing(val);
    AudioEngine.setSwing(val);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value);
    setBpm(newBpm);
    AudioEngine.setBpm(newBpm);
  };

  /* Per-step Bass Pitches (MIDI notes) */
  const [bassPitches, setBassPitches] = useState<number[]>(new Array(16).fill(36)); // Default C2 (36)

  const handleBassPitchChange = (stepIndex: number, val: number) => {
    const clampedVal = Math.max(24, Math.min(60, val)); // C1 to C4
    const newPitches = [...bassPitches];
    newPitches[stepIndex] = clampedVal;
    setBassPitches(newPitches);
    AudioEngine.updateBassPitches(newPitches);
  };

  const handleNoteWheel = (e: React.WheelEvent<HTMLSelectElement>, stepIndex: number) => {
    e.preventDefault();
    const current = bassPitches[stepIndex];
    // User reported "Up" scroll was taking them to lower notes with previous logic (deltaY < 0 ? 1 : -1)
    // This implies their "Up" scroll produces deltaY > 0.
    // They want "Up" -> Higher Note (+1).
    // So if deltaY > 0 (Up), we want +1.
    const delta = e.deltaY > 0 ? 1 : -1;
    handleBassPitchChange(stepIndex, current + delta);
  };
  
  return (
    <div className="container">
      <h1>12 oh 12</h1>
      
      <div className="controls">
        <button 
          onClick={handleStart}
          style={{ 
            backgroundColor: isPlaying ? '#ff3333' : '#33ff33',
            color: '#000'
          }}
        >
          {isPlaying ? 'STOP' : 'START'}
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label>BPM: {bpm}</label>
          <input 
            type="range" 
            min="65" 
            max="175" 
            value={bpm} 
            onChange={handleBpmChange}
            onWheel={handleSliderWheel}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label>Swing: {Math.round(swing * 100)}%</label>
          <input 
            type="range" 
            min="0" 
            max="0.5" 
            step="0.02"
            value={swing}
            onChange={(e) => handleSwingChange(Number(e.target.value))}
            onWheel={handleSliderWheel}
          />
        </div>
      </div>

      <div className="sequencer-grid">
        {/* Kick */}
        <div className="track-container">
          <div className="track-controls">
            <div className="mute-solo-row">
                <button className={`ms-btn ${mutes.kick ? 'active' : ''}`} onClick={() => handleMute('kick')}>M</button>
                <button className={`ms-btn ${solos.kick ? 'active' : ''}`} onClick={() => handleSolo('kick')}>S</button>
            </div>
            <label style={{width: '70px'}}>Vol: {volumes.kick}dB</label>
            <input type="range" min="-60" max="0" step="1" value={volumes.kick} onChange={e => handleVolumeChange('kick', Number(e.target.value))} onWheel={(e) => handleVolumeWheel(e, 'kick')} />
            
            <label>Tune</label>
            <input type="range" min="0.01" max="0.3" step="0.01" defaultValue="0.05" onChange={e => AudioEngine.setKickPitchDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
            <label>Decay</label>
            <input type="range" min="0.1" max="2.0" step="0.1" defaultValue="0.4" onChange={e => AudioEngine.setKickDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
          </div>
          <div className="track">
            <div className="track-label">kick</div>
            {grid.kick.map((isActive, stepIndex) => (
              <div
                key={stepIndex}
                className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                onMouseDown={() => handleStepMouseDown('kick', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('kick', stepIndex)}
              />
            ))}
          </div>
        </div>

        {/* Snare */}
        <div className="track-container">
           <div className="track-controls">
            <div className="mute-solo-row">
                <button className={`ms-btn ${mutes.snare ? 'active' : ''}`} onClick={() => handleMute('snare')}>M</button>
                <button className={`ms-btn ${solos.snare ? 'active' : ''}`} onClick={() => handleSolo('snare')}>S</button>
            </div>
            <label style={{width: '70px'}}>Vol: {volumes.snare}dB</label>
            <input type="range" min="-60" max="0" step="1" value={volumes.snare} onChange={e => handleVolumeChange('snare', Number(e.target.value))} onWheel={(e) => handleVolumeWheel(e, 'snare')} />

            <label>Tone</label>
            <input type="range" min="400" max="6000" step="100" defaultValue="3000" onChange={e => AudioEngine.setSnareTone(Number(e.target.value))} onWheel={handleSliderWheel} />
            <label>Snappy</label>
            <input type="range" min="0.05" max="0.5" step="0.01" defaultValue="0.2" onChange={e => AudioEngine.setSnareDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
          </div>
          <div className="track">
            <div className="track-label">snare</div>
            {grid.snare.map((isActive, stepIndex) => (
              <div
                key={stepIndex}
                className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                onMouseDown={() => handleStepMouseDown('snare', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('snare', stepIndex)}
              />
            ))}
          </div>
        </div>

        {/* HiHat */}
         <div className="track-container">
           <div className="track-controls">
            <div className="mute-solo-row">
                <button className={`ms-btn ${mutes.hihat ? 'active' : ''}`} onClick={() => handleMute('hihat')}>M</button>
                <button className={`ms-btn ${solos.hihat ? 'active' : ''}`} onClick={() => handleSolo('hihat')}>S</button>
            </div>
            <label style={{width: '70px'}}>Vol: {volumes.hihat}dB</label>
            <input type="range" min="-60" max="0" step="1" value={volumes.hihat} onChange={e => handleVolumeChange('hihat', Number(e.target.value))} onWheel={(e) => handleVolumeWheel(e, 'hihat')} />

            <label>Decay</label>
            <input type="range" min="0.01" max="0.5" step="0.01" defaultValue="0.1" onChange={e => AudioEngine.setHiHatDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
          </div>
          <div className="track">
            <div className="track-label">hihat</div>
            {grid.hihat.map((isActive, stepIndex) => (
              <div
                key={stepIndex}
                className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                onMouseDown={() => handleStepMouseDown('hihat', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('hihat', stepIndex)}
              />
            ))}
          </div>
        </div>

        {/* Clap */}
         <div className="track-container">
          <div className="track-controls">
            <div className="mute-solo-row">
                <button className={`ms-btn ${mutes.clap ? 'active' : ''}`} onClick={() => handleMute('clap')}>M</button>
                <button className={`ms-btn ${solos.clap ? 'active' : ''}`} onClick={() => handleSolo('clap')}>S</button>
            </div>
            <label style={{width: '70px'}}>Vol: {volumes.clap}dB</label>
            <input type="range" min="-60" max="0" step="1" value={volumes.clap} onChange={e => handleVolumeChange('clap', Number(e.target.value))} onWheel={(e) => handleVolumeWheel(e, 'clap')} />

            <label>Decay</label>
            <input type="range" min="0.01" max="0.5" step="0.01" defaultValue="0.3" onChange={e => AudioEngine.setClapDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
          </div>
          <div className="track">
            <div className="track-label">clap</div>
            {grid.clap.map((isActive, stepIndex) => (
              <div
                key={stepIndex}
                className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                onMouseDown={() => handleStepMouseDown('clap', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('clap', stepIndex)}
              />
            ))}
          </div>
        </div>

        {/* Bass (303) */}
        <div className="track-container bass-container">
          <div className="track-controls">
            <div className="mute-solo-row">
                <button className={`ms-btn ${mutes.bass ? 'active' : ''}`} onClick={() => handleMute('bass')}>M</button>
                <button className={`ms-btn ${solos.bass ? 'active' : ''}`} onClick={() => handleSolo('bass')}>S</button>
            </div>
            <label style={{width: '70px'}}>Vol: {volumes.bass}dB</label>
            <input type="range" min="-60" max="0" step="1" value={volumes.bass} onChange={e => handleVolumeChange('bass', Number(e.target.value))} onWheel={(e) => handleVolumeWheel(e, 'bass')} />

            <div className="knob-row">
              {/* Tune is removed/deprecated in favor of per-step pitch */}
              
              <label>Cutoff</label>
              <input type="range" min="50" max="5000" step="10" defaultValue="200" onChange={e => AudioEngine.setBassCutoff(Number(e.target.value))} onWheel={handleSliderWheel} />
              
              <label>Res</label>
              <input type="range" min="0" max="20" step="0.1" defaultValue="2" onChange={e => AudioEngine.setBassResonance(Number(e.target.value))} onWheel={handleSliderWheel} />
              
              <label>Env Mod</label>
              <input type="range" min="0" max="8" step="0.1" defaultValue="2" onChange={e => AudioEngine.setBassEnvMod(Number(e.target.value))} onWheel={handleSliderWheel} />

              <label>Decay</label>
              <input type="range" min="0.1" max="2.0" step="0.1" defaultValue="0.2" onChange={e => AudioEngine.setBassDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
            </div>
          </div>
          <div className="track">
            <div className="track-label">303 Bass</div>
            {/* Combined Step + Pitch */}
            <div className="bass-steps-container">
              {grid.bass.map((isActive, stepIndex) => (
                <div key={stepIndex} className="bass-step-wrapper">
                  <div
                    className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                    onMouseDown={() => handleStepMouseDown('bass', stepIndex)}
                    onMouseEnter={() => handleStepMouseEnter('bass', stepIndex)}
                  />
                  <select 
                    className="note-select"
                    value={bassPitches[stepIndex]}
                    onChange={(e) => handleBassPitchChange(stepIndex, Number(e.target.value))}
                    onWheel={(e) => handleNoteWheel(e, stepIndex)}
                  >
                    {/* C1 (24) to C4 (60) */}
                    {Array.from({ length: 37 }, (_, i) => {
                      const midi = 24 + i;
                      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                      const octave = Math.floor(midi / 12) - 1;
                      const noteName = noteNames[midi % 12];
                      return (
                        <option key={midi} value={midi}>
                          {noteName}{octave}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
