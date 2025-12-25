import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { AudioEngine } from './audio/engine';
import { Visualizer } from './components/Visualizer';
import { TrackRow } from './components/TrackRow';
import { SceneSelector } from './components/SceneSelector';
import { ShortcutHelp } from './components/ShortcutHelp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { loadScenes, saveScenes, createEmptyScene, downloadScene, importScene } from './utils/storage';
import type { Instrument, Scene } from './types';

// Initial Pattern: Basic House Beat
const INITIAL_GRID: Record<Instrument, boolean[]> = {
  kick:  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  hihat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
  clap:  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  bass:  [false, false, true, false, false, true, false, false, false, true, false, false, true, false, false, true],
  pad:   [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  kick909: [], snare909: [], hihat909: [], clap909: [] // Unused placeholders
};

const INITIAL_MUTES: Record<Instrument, boolean> = { 
  kick: false, snare: false, hihat: false, clap: false, bass: false, pad: false,
  kick909: false, snare909: false, hihat909: false, clap909: false
};
const INITIAL_SOLOS: Record<Instrument, boolean> = { 
  kick: false, snare: false, hihat: false, clap: false, bass: false, pad: false,
  kick909: false, snare909: false, hihat909: false, clap909: false
};
const INITIAL_VOLUMES: Record<Instrument, number> = { 
  kick: -12, snare: -12, hihat: -12, clap: -12, bass: -12, pad: -12,
  kick909: 0, snare909: 0, hihat909: 0, clap909: 0
};
const INITIAL_REVERB_SENDS: Record<Instrument, number> = {
  kick: -60, snare: -60, hihat: -60, clap: -60, bass: -60, pad: -60,
  kick909: -60, snare909: -60, hihat909: -60, clap909: -60
};
const INITIAL_DELAY_SENDS: Record<Instrument, number> = {
  kick: -60, snare: -60, hihat: -60, clap: -60, bass: -60, pad: -60,
  kick909: -60, snare909: -60, hihat909: -60, clap909: -60
};
const INITIAL_EQ_GAINS: Record<Instrument, { low: number; mid: number; high: number }> = {
  kick: { low: 0, mid: 0, high: 0 },
  snare: { low: 0, mid: 0, high: 0 },
  hihat: { low: 0, mid: 0, high: 0 },
  clap: { low: 0, mid: 0, high: 0 },
  bass: { low: 0, mid: 0, high: 0 },
  pad: { low: 0, mid: 0, high: 0 },
  kick909: { low: 0, mid: 0, high: 0 },
  snare909: { low: 0, mid: 0, high: 0 },
  hihat909: { low: 0, mid: 0, high: 0 },
  clap909: { low: 0, mid: 0, high: 0 }
};

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [swing, setSwing] = useState(0);
  const [theme, setTheme] = useState<'night' | 'day'>('night');
  
  const [grid, setGrid] = useState(INITIAL_GRID);
  const [mutes, setMutes] = useState(INITIAL_MUTES);
  const [solos, setSolos] = useState(INITIAL_SOLOS);
  const [volumes, setVolumes] = useState(INITIAL_VOLUMES);
  const [reverbSends, setReverbSends] = useState(INITIAL_REVERB_SENDS);
  const [delaySends, setDelaySends] = useState(INITIAL_DELAY_SENDS);
  const [eqGains, setEqGains] = useState(INITIAL_EQ_GAINS);

  // Scene management
  const [scenes, setScenes] = useState<Scene[]>(() => loadScenes());
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [copiedScene, setCopiedScene] = useState<Scene | null>(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // Theme effect
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'night' ? 'day' : 'night');
  };

  // Refs for drag-to-toggle
  const isDrawing = useRef(false);
  const drawMode = useRef(true); // true = turning on, false = turning off
  const isStarting = useRef(false); // Mutex for start/stop

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
    if (isStarting.current) return;
    isStarting.current = true;

    try {
      if (!isAudioReady) {
        await AudioEngine.init();
        setIsAudioReady(true);
      }
      
      const targetState = !isPlaying;

      if (targetState) {
          // WE ARE STARTING
          // 1. Reset critical engine state
          AudioEngine.resetMutesSolos(); // Ensure no ghost solos persist
          
          // 2. Sync everything fresh
          AudioEngine.setBpm(bpm);
          AudioEngine.updateGrid(grid);
          
          (Object.keys(mutes) as Instrument[]).forEach(inst => {
              AudioEngine.setMute(inst, mutes[inst]);
              AudioEngine.setSolo(inst, solos[inst]);
              AudioEngine.setVolume(inst, volumes[inst]);
              AudioEngine.setReverbSend(inst, reverbSends[inst]);
              AudioEngine.setDelaySend(inst, delaySends[inst]);
              
              const eq = eqGains[inst];
              AudioEngine.setChannelEQ(inst, 'low', eq.low);
              AudioEngine.setChannelEQ(inst, 'mid', eq.mid);
              AudioEngine.setChannelEQ(inst, 'high', eq.high);
          });
          AudioEngine.updateBassPitches(bassPitches);
          AudioEngine.updatePadPitches(padPitches);
          AudioEngine.updatePadVoicings(padVoicings);

          AudioEngine.onStep((step) => {
            setCurrentStep(step);
          });
      }

      setIsPlaying(targetState);
      AudioEngine.togglePlay(targetState);
    } finally {
        isStarting.current = false;
    }
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

  const handleReverbSendChange = (inst: Instrument, val: number) => {
    setReverbSends({ ...reverbSends, [inst]: val });
    AudioEngine.setReverbSend(inst, val);
  };

  const handleDelaySendChange = (inst: Instrument, val: number) => {
    setDelaySends({ ...delaySends, [inst]: val });
    AudioEngine.setDelaySend(inst, val);
  };

  const handleEQChange = (inst: Instrument, band: 'low' | 'mid' | 'high', val: number) => {
    const newGains = { ...eqGains, [inst]: { ...eqGains[inst], [band]: val } };
    setEqGains(newGains);
    AudioEngine.setChannelEQ(inst, band, val);
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

  /* Per-step Pad Pitches (MIDI notes) and Voicings */
  const [padPitches, setPadPitches] = useState<number[]>(new Array(16).fill(48)); // Default C3 (48)
  const [padVoicings, setPadVoicings] = useState<string[]>(new Array(16).fill('single'));

  // Save current state to active scene whenever it changes
  useEffect(() => {
    const currentScene: Scene = {
      name: scenes[activeSceneIndex].name,
      grid,
      bassPitches,
      padPitches,
      padVoicings,
      volumes,
      reverbSends,
      delaySends,
      eqGains,
      mutes,
      solos,
      bpm,
      swing,
    };

    const newScenes = [...scenes];
    newScenes[activeSceneIndex] = currentScene;
    setScenes(newScenes);
    saveScenes(newScenes);
  }, [grid, bassPitches, padPitches, padVoicings, volumes, reverbSends, delaySends, eqGains, mutes, solos, bpm, swing]);

  // Scene Management Handlers
  const loadSceneState = useCallback((scene: Scene) => {
    setGrid(scene.grid);
    setBassPitches(scene.bassPitches);
    setPadPitches(scene.padPitches);
    setPadVoicings(scene.padVoicings);
    setVolumes(scene.volumes);
    setReverbSends(scene.reverbSends);
    setDelaySends(scene.delaySends);
    setEqGains(scene.eqGains);
    setMutes(scene.mutes);
    setSolos(scene.solos);
    setBpm(scene.bpm);
    setSwing(scene.swing);

    // Sync to audio engine
    AudioEngine.setBpm(scene.bpm);
    AudioEngine.updateGrid(scene.grid);
    AudioEngine.updateBassPitches(scene.bassPitches);
    AudioEngine.updatePadPitches(scene.padPitches);
    AudioEngine.updatePadVoicings(scene.padVoicings);
    AudioEngine.setSwing(scene.swing);

    (Object.keys(scene.mutes) as Instrument[]).forEach(inst => {
      AudioEngine.setMute(inst, scene.mutes[inst]);
      AudioEngine.setSolo(inst, scene.solos[inst]);
      AudioEngine.setVolume(inst, scene.volumes[inst]);
      AudioEngine.setReverbSend(inst, scene.reverbSends[inst]);
      AudioEngine.setDelaySend(inst, scene.delaySends[inst]);

      const eq = scene.eqGains[inst];
      AudioEngine.setChannelEQ(inst, 'low', eq.low);
      AudioEngine.setChannelEQ(inst, 'mid', eq.mid);
      AudioEngine.setChannelEQ(inst, 'high', eq.high);
    });
  }, []);

  const handleSceneSelect = useCallback((index: number) => {
    if (index === activeSceneIndex) return;

    loadSceneState(scenes[index]);
    setActiveSceneIndex(index);
  }, [activeSceneIndex, scenes, loadSceneState]);

  const handleSceneCopy = useCallback((index: number) => {
    setCopiedScene(scenes[index]);
    console.log(`Scene ${String.fromCharCode(65 + index)} copied`);
  }, [scenes]);

  const handleScenePaste = useCallback((index: number) => {
    if (!copiedScene) return;

    const newScene = { ...copiedScene, name: `Scene ${String.fromCharCode(65 + index)}` };
    const newScenes = [...scenes];
    newScenes[index] = newScene;
    setScenes(newScenes);
    saveScenes(newScenes);

    // If pasting to active scene, load it
    if (index === activeSceneIndex) {
      loadSceneState(newScene);
    }
  }, [copiedScene, scenes, activeSceneIndex, loadSceneState]);

  const handleSceneClear = useCallback((index: number) => {
    const newScene = createEmptyScene(`Scene ${String.fromCharCode(65 + index)}`);
    const newScenes = [...scenes];
    newScenes[index] = newScene;
    setScenes(newScenes);
    saveScenes(newScenes);

    // If clearing active scene, load it
    if (index === activeSceneIndex) {
      loadSceneState(newScene);
    }
  }, [scenes, activeSceneIndex, loadSceneState]);

  const handleExport = useCallback(() => {
    downloadScene(scenes[activeSceneIndex]);
  }, [scenes, activeSceneIndex]);

  const handleRandomizeActiveScene = useCallback(() => {
    const instruments: Instrument[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'pad'];
    const newGrid = { ...grid };
    const newBassPitches = [...bassPitches];
    const newPadPitches = [...padPitches];
    const newPadVoicings = [...padVoicings];
    const PAD_VOICING_OPTIONS = ['single', 'octave', 'fifth', 'major', 'minor', 'sus2', 'sus4'];

    instruments.forEach(inst => {
      const density = inst === 'kick' ? 0.3 : inst === 'snare' ? 0.2 : 0.4;
      newGrid[inst] = new Array(16).fill(false).map(() => Math.random() < density);
    });

    // Randomize bass and pad steps
    for (let i = 0; i < 16; i++) {
        if (newGrid.bass[i]) newBassPitches[i] = Math.floor(Math.random() * 24) + 24; // C1 to C3
        if (newGrid.pad[i]) {
            newPadPitches[i] = Math.floor(Math.random() * 24) + 36; // C2 to C4
            newPadVoicings[i] = PAD_VOICING_OPTIONS[Math.floor(Math.random() * PAD_VOICING_OPTIONS.length)];
        }
    }

    setGrid(newGrid);
    setBassPitches(newBassPitches);
    setPadPitches(newPadPitches);
    setPadVoicings(newPadVoicings);

    // Sync to engine
    AudioEngine.updateGrid(newGrid);
    AudioEngine.updateBassPitches(newBassPitches);
    AudioEngine.updatePadPitches(newPadPitches);
    AudioEngine.updatePadVoicings(newPadVoicings);
  }, [grid, bassPitches, padPitches, padVoicings]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        const scene = importScene(json);
        if (scene) {
          const newScenes = [...scenes];
          newScenes[activeSceneIndex] = scene;
          setScenes(newScenes);
          saveScenes(newScenes);
          loadSceneState(scene);
        } else {
          alert('Failed to import scene. Invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [scenes, activeSceneIndex, loadSceneState]);

  // Keyboard shortcuts
  const instruments: Instrument[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'pad'];

  useKeyboardShortcuts({
    onPlayPause: handleStart,
    onBpmIncrease: () => {
      const newBpm = Math.min(175, bpm + 5);
      setBpm(newBpm);
      AudioEngine.setBpm(newBpm);
    },
    onBpmDecrease: () => {
      const newBpm = Math.max(65, bpm - 5);
      setBpm(newBpm);
      AudioEngine.setBpm(newBpm);
    },
    onSceneSelect: handleSceneSelect,
    onSolo: (index) => {
      if (index < instruments.length) {
        handleSolo(instruments[index]);
      }
    },
    onMute: (index) => {
      if (index < instruments.length) {
        handleMute(instruments[index]);
      }
    },
    onSave: () => saveScenes(scenes),
    onExport: handleExport,
    onHelp: () => setShowShortcutHelp(true),
  }, true);

  const PAD_VOICING_OPTIONS = ['single', 'octave', 'fifth', 'major', 'minor', 'sus2', 'sus4'];

  const handlePadPitchChange = (stepIndex: number, val: number) => {
    const clampedVal = Math.max(36, Math.min(72, val)); // C2 to C5
    const newPitches = [...padPitches];
    newPitches[stepIndex] = clampedVal;
    setPadPitches(newPitches);
    AudioEngine.updatePadPitches(newPitches);
  };

  const handlePadVoicingChange = (stepIndex: number, voicing: string) => {
    const newVoicings = [...padVoicings];
    newVoicings[stepIndex] = voicing;
    setPadVoicings(newVoicings);
    AudioEngine.updatePadVoicings(newVoicings);
  };

  const handlePadNoteWheel = (e: React.WheelEvent<HTMLSelectElement>, stepIndex: number) => {
    e.preventDefault();
    const current = padPitches[stepIndex];
    const delta = e.deltaY > 0 ? 1 : -1;
    handlePadPitchChange(stepIndex, current + delta);
  };
  
  return (
    <div className="container">
      <div className="header">
        <h1>12 oh 12</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="help-btn" onClick={() => setShowShortcutHelp(true)} title="Keyboard Shortcuts (?)">
            ?
          </button>
          <div className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-toggle-label">{theme === 'night' ? 'night' : 'day'}</span>
            <div className="theme-toggle-track">
              <div className="theme-toggle-thumb" />
            </div>
          </div>
        </div>
      </div>
      
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

        <div className="control-group">
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

        <div className="control-group">
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

      <SceneSelector
        scenes={scenes}
        activeIndex={activeSceneIndex}
        onSceneSelect={handleSceneSelect}
        onSceneCopy={handleSceneCopy}
        onScenePaste={handleScenePaste}
        onSceneClear={handleSceneClear}
        onRandomizeActive={handleRandomizeActiveScene}
        onImport={handleImport}
        onExport={handleExport}
      />

      <div className="sequencer-grid">
        {/* Kick */}
        <TrackRow
          label="kick"
          instrument="kick"
          mute={mutes.kick}
          solo={solos.kick}
          volume={volumes.kick}
          reverbSend={reverbSends.kick}
          delaySend={delaySends.kick}
          eq={eqGains.kick}
          onMute={() => handleMute('kick')}
          onSolo={() => handleSolo('kick')}
          onVolumeChange={(v: number) => handleVolumeChange('kick', v)}
          onVolumeWheel={(e: React.WheelEvent) => handleVolumeWheel(e as React.WheelEvent<HTMLInputElement>, 'kick')}
          onReverbSendChange={(v: number) => handleReverbSendChange('kick', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('kick', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('kick', band, v)}
          extraControls={
            <>
              <div className="param-item">
                <label>Tune</label>
                <input type="range" min="0.01" max="0.3" step="0.01" defaultValue="0.05" onChange={e => AudioEngine.setKickPitchDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Decay</label>
                <input type="range" min="0.1" max="2.0" step="0.1" defaultValue="0.4" onChange={e => AudioEngine.setKickDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
            </>
          }
        >
          <div className="steps-container">
            {[0, 1, 2, 3].map(groupIdx => (
              <div key={groupIdx} className="step-group">
                {[0, 1, 2, 3].map(stepInGroup => {
                  const stepIndex = groupIdx * 4 + stepInGroup;
                  const isActive = grid.kick[stepIndex];
                  return (
                    <div
                      key={stepIndex}
                      className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                      onMouseDown={() => handleStepMouseDown('kick', stepIndex)}
                      onMouseEnter={() => handleStepMouseEnter('kick', stepIndex)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </TrackRow>

        {/* Snare */}
        <TrackRow
          label="snare"
          instrument="snare"
          mute={mutes.snare}
          solo={solos.snare}
          volume={volumes.snare}
          reverbSend={reverbSends.snare}
          delaySend={delaySends.snare}
          eq={eqGains.snare}
          onMute={() => handleMute('snare')}
          onSolo={() => handleSolo('snare')}
          onVolumeChange={(v: number) => handleVolumeChange('snare', v)}
          onVolumeWheel={(e: React.WheelEvent) => handleVolumeWheel(e as React.WheelEvent<HTMLInputElement>, 'snare')}
          onReverbSendChange={(v: number) => handleReverbSendChange('snare', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('snare', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('snare', band, v)}
          extraControls={
            <>
              <div className="param-item">
                <label>Tone</label>
                <input type="range" min="400" max="6000" step="100" defaultValue="3000" onChange={e => AudioEngine.setSnareTone(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Snappy</label>
                <input type="range" min="0.05" max="0.5" step="0.01" defaultValue="0.2" onChange={e => AudioEngine.setSnareDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
            </>
          }
        >
          <div className="steps-container">
            {[0, 1, 2, 3].map(groupIdx => (
              <div key={groupIdx} className="step-group">
                {[0, 1, 2, 3].map(stepInGroup => {
                  const stepIndex = groupIdx * 4 + stepInGroup;
                  const isActive = grid.snare[stepIndex];
                  return (
                    <div
                      key={stepIndex}
                      className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                      onMouseDown={() => handleStepMouseDown('snare', stepIndex)}
                      onMouseEnter={() => handleStepMouseEnter('snare', stepIndex)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </TrackRow>

        {/* HiHat */}
        <TrackRow
          label="hihat"
          instrument="hihat"
          mute={mutes.hihat}
          solo={solos.hihat}
          volume={volumes.hihat}
          reverbSend={reverbSends.hihat}
          delaySend={delaySends.hihat}
          eq={eqGains.hihat}
          onMute={() => handleMute('hihat')}
          onSolo={() => handleSolo('hihat')}
          onVolumeChange={(v: number) => handleVolumeChange('hihat', v)}
          onVolumeWheel={(e: React.WheelEvent) => handleVolumeWheel(e as React.WheelEvent<HTMLInputElement>, 'hihat')}
          onReverbSendChange={(v: number) => handleReverbSendChange('hihat', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('hihat', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('hihat', band, v)}
          extraControls={
            <>
              <div className="param-item">
                <label>Decay</label>
                <input type="range" min="0.05" max="1.0" step="0.01" defaultValue="0.2" onChange={e => AudioEngine.setHiHatDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Tone</label>
                <input type="range" min="500" max="10000" step="100" defaultValue="3000" onChange={e => AudioEngine.setHiHatTone(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
            </>
          }
        >
          <div className="steps-container">
            {[0, 1, 2, 3].map(groupIdx => (
              <div key={groupIdx} className="step-group">
                {[0, 1, 2, 3].map(stepInGroup => {
                  const stepIndex = groupIdx * 4 + stepInGroup;
                  const isActive = grid.hihat[stepIndex];
                  return (
                    <div
                      key={stepIndex}
                      className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                      onMouseDown={() => handleStepMouseDown('hihat', stepIndex)}
                      onMouseEnter={() => handleStepMouseEnter('hihat', stepIndex)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </TrackRow>

        {/* Clap */}
        <TrackRow
          label="clap"
          instrument="clap"
          mute={mutes.clap}
          solo={solos.clap}
          volume={volumes.clap}
          reverbSend={reverbSends.clap}
          delaySend={delaySends.clap}
          eq={eqGains.clap}
          onMute={() => handleMute('clap')}
          onSolo={() => handleSolo('clap')}
          onVolumeChange={(v: number) => handleVolumeChange('clap', v)}
          onVolumeWheel={(e: React.WheelEvent) => handleVolumeWheel(e as React.WheelEvent<HTMLInputElement>, 'clap')}
          onReverbSendChange={(v: number) => handleReverbSendChange('clap', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('clap', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('clap', band, v)}
          extraControls={
            <>
              <div className="param-item">
                <label>Decay</label>
                <input type="range" min="0.01" max="0.5" step="0.01" defaultValue="0.3" onChange={e => AudioEngine.setClapDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Tone</label>
                <input type="range" min="500" max="4000" step="100" defaultValue="1500" onChange={e => AudioEngine.setClapTone(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
            </>
          }
        >
          <div className="steps-container">
            {[0, 1, 2, 3].map(groupIdx => (
              <div key={groupIdx} className="step-group">
                {[0, 1, 2, 3].map(stepInGroup => {
                  const stepIndex = groupIdx * 4 + stepInGroup;
                  const isActive = grid.clap[stepIndex];
                  return (
                    <div
                      key={stepIndex}
                      className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                      onMouseDown={() => handleStepMouseDown('clap', stepIndex)}
                      onMouseEnter={() => handleStepMouseEnter('clap', stepIndex)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </TrackRow>

        {/* Bass (303) */}
        <TrackRow
          label="303 Bass"
          instrument="bass"
          className="bass-container"
          mute={mutes.bass}
          solo={solos.bass}
          volume={volumes.bass}
          reverbSend={reverbSends.bass}
          delaySend={delaySends.bass}
          eq={eqGains.bass}
          onMute={() => handleMute('bass')}
          onSolo={() => handleSolo('bass')}
          onVolumeChange={(v: number) => handleVolumeChange('bass', v)}
          onVolumeWheel={(e: React.WheelEvent) => handleVolumeWheel(e as React.WheelEvent<HTMLInputElement>, 'bass')}
          onReverbSendChange={(v: number) => handleReverbSendChange('bass', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('bass', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('bass', band, v)}
          extraControls={
            <>
              <div className="param-item">
                <label>Cutoff</label>
                <input type="range" min="50" max="5000" step="10" defaultValue="200" onChange={e => AudioEngine.setBassCutoff(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Res</label>
                <input type="range" min="0" max="20" step="0.1" defaultValue="2" onChange={e => AudioEngine.setBassResonance(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Env Mod</label>
                <input type="range" min="0" max="8" step="0.1" defaultValue="2" onChange={e => AudioEngine.setBassEnvMod(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Decay</label>
                <input type="range" min="0.1" max="2.0" step="0.1" defaultValue="0.2" onChange={e => AudioEngine.setBassDecay(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
            </>
          }
        >
          {/* Combined Step + Pitch with quarter note grouping */}
          <div className="bass-steps-container">
            {[0, 1, 2, 3].map(groupIdx => (
              <div key={groupIdx} className="step-group bass-group">
                {[0, 1, 2, 3].map(stepInGroup => {
                  const stepIndex = groupIdx * 4 + stepInGroup;
                  const isActive = grid.bass[stepIndex];
                  return (
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
                        {/* C4 (60) to C1 (24) */}
                        {Array.from({ length: 37 }, (_, i) => {
                          const midi = 60 - i;
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
                  );
                })}
              </div>
            ))}
          </div>
        </TrackRow>

        {/* Pad Synth */}
        <TrackRow
          label="Pad"
          instrument="pad"
          className="pad-container"
          mute={mutes.pad}
          solo={solos.pad}
          volume={volumes.pad}
          reverbSend={reverbSends.pad}
          delaySend={delaySends.pad}
          eq={eqGains.pad}
          onMute={() => handleMute('pad')}
          onSolo={() => handleSolo('pad')}
          onVolumeChange={(v: number) => handleVolumeChange('pad', v)}
          onVolumeWheel={(e: React.WheelEvent) => handleVolumeWheel(e as React.WheelEvent<HTMLInputElement>, 'pad')}
          onReverbSendChange={(v: number) => handleReverbSendChange('pad', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('pad', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('pad', band, v)}
          extraControls={
            <>
              <div className="param-item">
                <label>Attack</label>
                <input type="range" min="0.01" max="1.0" step="0.01" defaultValue="0.3" onChange={e => AudioEngine.setPadAttack(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Release</label>
                <input type="range" min="0.1" max="3.0" step="0.1" defaultValue="1.5" onChange={e => AudioEngine.setPadRelease(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Filter</label>
                <input type="range" min="100" max="8000" step="50" defaultValue="2000" onChange={e => AudioEngine.setPadFilterCutoff(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Detune</label>
                <input type="range" min="0" max="30" step="1" defaultValue="12" onChange={e => AudioEngine.setPadDetune(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
              <div className="param-item">
                <label>Distortion</label>
                <input type="range" min="0" max="1" step="0.01" defaultValue="0" onChange={e => AudioEngine.setPadDistortion(Number(e.target.value))} onWheel={handleSliderWheel} />
              </div>
            </>
          }
        >
          {/* Combined Step + Pitch + Voicing with quarter note grouping */}
          <div className="pad-steps-container">
            {[0, 1, 2, 3].map(groupIdx => (
              <div key={groupIdx} className="step-group pad-group">
                {[0, 1, 2, 3].map(stepInGroup => {
                  const stepIndex = groupIdx * 4 + stepInGroup;
                  const isActive = grid.pad[stepIndex];
                  return (
                    <div key={stepIndex} className="pad-step-wrapper">
                      <div
                        className={`step ${isActive ? 'active' : ''} ${currentStep === stepIndex && isPlaying ? 'current' : ''}`}
                        onMouseDown={() => handleStepMouseDown('pad', stepIndex)}
                        onMouseEnter={() => handleStepMouseEnter('pad', stepIndex)}
                      />
                      <select 
                        className="note-select"
                        value={padPitches[stepIndex]}
                        onChange={(e) => handlePadPitchChange(stepIndex, Number(e.target.value))}
                        onWheel={(e) => handlePadNoteWheel(e, stepIndex)}
                      >
                        {/* C5 (72) to C2 (36) */}
                        {Array.from({ length: 37 }, (_, i) => {
                          const midi = 72 - i;
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
                      <select 
                        className="voicing-select"
                        value={padVoicings[stepIndex]}
                        onChange={(e) => handlePadVoicingChange(stepIndex, e.target.value)}
                      >
                        {PAD_VOICING_OPTIONS.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </TrackRow>

      </div>
      
      <Visualizer theme={theme} isPlaying={isPlaying} />

      <ShortcutHelp isOpen={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />
    </div>
  );
}

export default App;
