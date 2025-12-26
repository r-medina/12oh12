import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { AudioEngine } from './audio/engine';
import { Visualizer } from './components/Visualizer';
import { TrackRow } from './components/TrackRow';
import { NoteStepper, midiToNoteName } from './components/NoteStepper';
import { SceneSelector } from './components/SceneSelector';
import { ShortcutHelp } from './components/ShortcutHelp';
import { ProModeControls } from './components/ProModeControls';
import { ScrollableSlider } from './components/ScrollableSlider';
import { Step } from './components/Step';
import { ScrollableSelect } from './components/ScrollableSelect';
import { PianoRoll } from './components/PianoRoll';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { loadScenes, saveScenes, createEmptyScene, downloadScene, importScene, downloadProject, parseProjectFile } from './utils/storage';
import { ImportSelectionModal } from './components/ImportSelectionModal';
import type { Instrument, Scene, InstrumentParams, ProModeParams, ProjectFile } from './types';

// Initial Pattern: Basic House Beat
const INITIAL_GRID: Record<Instrument, boolean[]> = {
  kick:  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  hihat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
  clap:  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  bass:  [false, false, true, false, false, true, false, false, false, true, false, false, true, false, false, true],
  pad:   [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  poly:  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  kick909: [], snare909: [], hihat909: [], clap909: [] // Unused placeholders
};

const INITIAL_MUTES: Record<Instrument, boolean> = { 
  kick: false, snare: false, hihat: false, clap: false, bass: false, pad: false, poly: false,
  kick909: false, snare909: false, hihat909: false, clap909: false
};
const INITIAL_SOLOS: Record<Instrument, boolean> = { 
  kick: false, snare: false, hihat: false, clap: false, bass: false, pad: false, poly: false,
  kick909: false, snare909: false, hihat909: false, clap909: false
};
const INITIAL_VOLUMES: Record<Instrument, number> = { 
  kick: -12, snare: -12, hihat: -12, clap: -12, bass: -12, pad: -12, poly: -12,
  kick909: 0, snare909: 0, hihat909: 0, clap909: 0
};
const INITIAL_REVERB_SENDS: Record<Instrument, number> = {
  kick: -60, snare: -60, hihat: -60, clap: -60, bass: -60, pad: -60, poly: -60,
  kick909: -60, snare909: -60, hihat909: -60, clap909: -60
};
const INITIAL_DELAY_SENDS: Record<Instrument, number> = {
  kick: -60, snare: -60, hihat: -60, clap: -60, bass: -60, pad: -60, poly: -60,
  kick909: -60, snare909: -60, hihat909: -60, clap909: -60
};
const INITIAL_EQ_GAINS: Record<Instrument, { low: number; mid: number; high: number }> = {
  kick: { low: 0, mid: 0, high: 0 },
  snare: { low: 0, mid: 0, high: 0 },
  hihat: { low: 0, mid: 0, high: 0 },
  clap: { low: 0, mid: 0, high: 0 },
  bass: { low: 0, mid: 0, high: 0 },
  pad: { low: 0, mid: 0, high: 0 },
  poly: { low: 0, mid: 0, high: 0 },
  kick909: { low: 0, mid: 0, high: 0 },
  snare909: { low: 0, mid: 0, high: 0 },
  hihat909: { low: 0, mid: 0, high: 0 },
  clap909: { low: 0, mid: 0, high: 0 }
};

const INITIAL_PARAMS: InstrumentParams = {
  kick: { tune: 0.05, decay: 0.4, distortion: 0 },
  snare: { tone: 3000, snappy: 0.2 },
  hihat: { decay: 0.2, tone: 3000 },
  clap: { decay: 0.3, tone: 1500 },
  bass: { cutoff: 200, resonance: 2, envMod: 2, decay: 0.2 },
  pad: { attack: 0.3, release: 1.5, cutoff: 2000, detune: 12, distortion: 0 },
  poly: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1.0, filter: 2000, detune: 0, oscillator: 'square' }
};

const INITIAL_PRO_MODE_PARAMS: ProModeParams = {
  masterVolume: 0,
  masterCompressor: {
    bypass: false,
    threshold: -20,
    ratio: 2,
    attack: 0.05,
    release: 0.2
  },
  tapeChain: {
    bypass: false,
    compThreshold: -20,
    compRatio: 2,
    compAttack: 0.01,
    compRelease: 0.2,
    distortion: 0.05,
    filterCutoff: 18000
  },
  reverb: {
    bypass: false,
    decay: 4.0,
    preDelay: 0.05,
    toneFilter: 600,
    preFilter: 150,
    postFilter: 95
  },
  delay: {
    bypass: false,
    time: "8n.",
    feedback: 0.4,
    preFilter: 150,
    postFilter: 95
  },
  trackEnabled: {
    kick: true,
    snare: true,
    hihat: true,
    clap: true,
    bass: true,
    pad: true,
    poly: true
  }
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
  const [velocities, setVelocities] = useState<Record<Instrument, number[]>>(() => {
    // Initialize velocities to 100/127 for all
    const vels: any = {};
    const insts: Instrument[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'pad', 'poly', 'kick909', 'snare909', 'hihat909', 'clap909'];
    insts.forEach(i => vels[i] = new Array(16).fill(100));
    return vels;
  });
  const [params, setParams] = useState<InstrumentParams>(INITIAL_PARAMS);
  const [proMode, setProMode] = useState(false);
  const [proModeParams, setProModeParams] = useState<ProModeParams>(INITIAL_PRO_MODE_PARAMS);

  /* Per-step Bass Pitches (MIDI notes) */
  const [bassPitches, setBassPitches] = useState<number[]>(new Array(16).fill(36)); // Default C2 (36)
  /* Per-step Pad Pitches & Voicings */
  const [padPitches, setPadPitches] = useState<number[]>(new Array(16).fill(48)); // Default C3 (48)
  const [padVoicings, setPadVoicings] = useState<string[]>(new Array(16).fill('single'));
  const PAD_VOICING_OPTIONS = ['single', 'major', 'minor', 'maj7', 'min7', 'sus4', 'dim', 'aug'];
  /* Per-step Poly Notes (Piano Roll) */
  const [polyNotes, setPolyNotes] = useState<number[][]>(new Array(16).fill([]));

  // Scene management
  const [scenes, setScenes] = useState<Scene[]>(() => loadScenes());
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [copiedScene, setCopiedScene] = useState<Scene | null>(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [pendingImport, setPendingImport] = useState<ProjectFile | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

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

          // Sync Params
          AudioEngine.setKickPitchDecay(params.kick.tune);
          AudioEngine.setKickDecay(params.kick.decay);
          AudioEngine.setKickDistortion(params.kick.distortion);
          AudioEngine.setSnareTone(params.snare.tone);
          AudioEngine.setSnareDecay(params.snare.snappy);
          AudioEngine.setHiHatDecay(params.hihat.decay);
          AudioEngine.setHiHatTone(params.hihat.tone);
          AudioEngine.setClapDecay(params.clap.decay);
          AudioEngine.setClapTone(params.clap.tone);
          AudioEngine.setBassCutoff(params.bass.cutoff);
          AudioEngine.setBassResonance(params.bass.resonance);
          AudioEngine.setBassEnvMod(params.bass.envMod);
          AudioEngine.setBassDecay(params.bass.decay);
          AudioEngine.setPadAttack(params.pad.attack);
          AudioEngine.setPadRelease(params.pad.release);
          AudioEngine.setPadFilterCutoff(params.pad.cutoff);
          AudioEngine.setPadDetune(params.pad.detune);
          AudioEngine.setPadDistortion(params.pad.distortion);

          AudioEngine.updateBassPitches(bassPitches);
          AudioEngine.updatePadPitches(padPitches);
          AudioEngine.updatePadVoicings(padVoicings);
          AudioEngine.updateBassPitches(bassPitches);
          AudioEngine.updatePadPitches(padPitches);
          AudioEngine.updatePadVoicings(padVoicings);
          AudioEngine.updatePolyNotes(polyNotes);
          AudioEngine.updateVelocities(velocities);

          // Sync Pro Mode Params
          AudioEngine.setMasterVolume(proModeParams.masterVolume);
          AudioEngine.setMasterCompressorBypass(proModeParams.masterCompressor.bypass);
          AudioEngine.setMasterCompressorThreshold(proModeParams.masterCompressor.threshold);
          AudioEngine.setMasterCompressorRatio(proModeParams.masterCompressor.ratio);
          AudioEngine.setMasterCompressorAttack(proModeParams.masterCompressor.attack);
          AudioEngine.setMasterCompressorRelease(proModeParams.masterCompressor.release);
          
          AudioEngine.setTapeBypass(proModeParams.tapeChain.bypass);
          AudioEngine.setTapeCompressorThreshold(proModeParams.tapeChain.compThreshold);
          AudioEngine.setTapeCompressorRatio(proModeParams.tapeChain.compRatio);
          AudioEngine.setTapeCompressorAttack(proModeParams.tapeChain.compAttack);
          AudioEngine.setTapeCompressorRelease(proModeParams.tapeChain.compRelease);
          AudioEngine.setTapeDistortion(proModeParams.tapeChain.distortion);
          AudioEngine.setTapeFilterCutoff(proModeParams.tapeChain.filterCutoff);
          
          AudioEngine.setReverbBypass(proModeParams.reverb.bypass);
          AudioEngine.setReverbDecay(proModeParams.reverb.decay);
          AudioEngine.setReverbPreDelay(proModeParams.reverb.preDelay);
          AudioEngine.setReverbToneFilter(proModeParams.reverb.toneFilter);
          AudioEngine.setReverbPreFilter(proModeParams.reverb.preFilter);
          AudioEngine.setReverbPostFilter(proModeParams.reverb.postFilter);
          
          AudioEngine.setDelayBypass(proModeParams.delay.bypass);
          AudioEngine.setDelayTime(proModeParams.delay.time);
          AudioEngine.setDelayFeedback(proModeParams.delay.feedback);
          AudioEngine.setDelayPreFilter(proModeParams.delay.preFilter);
          AudioEngine.setDelayPostFilter(proModeParams.delay.postFilter);

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


  /* Handlers with functional updates for stability */
  const setStepState = useCallback((inst: Instrument, stepIndex: number, isActive: boolean) => {
    setGrid(prev => {
        if (prev[inst][stepIndex] === isActive) return prev;
        const newRow = [...prev[inst]];
        newRow[stepIndex] = isActive;
        const newGrid = { ...prev, [inst]: newRow };
        AudioEngine.updateGrid(newGrid);
        return newGrid;
    });
  }, []);

  const handleStepMouseDown = useCallback((inst: Instrument, stepIndex: number) => {
    isDrawing.current = true;
    // We need to know current state to toggle. 
    // We can peek at state in setter, but we need 'drawMode.current' updated too.
    // Using functional update pattern where we run side effects:
    setGrid(prev => {
        const newState = !prev[inst][stepIndex];
        drawMode.current = newState;
        
        const newRow = [...prev[inst]];
        newRow[stepIndex] = newState;
        const newGrid = { ...prev, [inst]: newRow };
        AudioEngine.updateGrid(newGrid);
        return newGrid;
    });
  }, []);

  const handleStepMouseEnter = useCallback((inst: Instrument, stepIndex: number) => {
    if (isDrawing.current) {
        setStepState(inst, stepIndex, drawMode.current);
    }
  }, [setStepState]);


  const handleMute = useCallback((inst: Instrument) => {
    setMutes(prev => {
        const newVal = !prev[inst];
        AudioEngine.setMute(inst, newVal);
        return { ...prev, [inst]: newVal };
    });
  }, []);

  const handleSolo = useCallback((inst: Instrument) => {
    setSolos(prev => {
        const newVal = !prev[inst];
        AudioEngine.setSolo(inst, newVal);
        return { ...prev, [inst]: newVal };
    });
  }, []);

  const handleVolumeChange = useCallback((inst: Instrument, val: number) => {
    // Snap to -12dB when within ±2dB
    let snappedVal = val;
    if (val >= -14 && val <= -10 && val !== -12) {
      snappedVal = -12;
    }
    setVolumes(prev => ({ ...prev, [inst]: snappedVal }));
    AudioEngine.setVolume(inst, snappedVal);
  }, []);

  const handleReverbSendChange = useCallback((inst: Instrument, val: number) => {
    setReverbSends(prev => ({ ...prev, [inst]: val }));
    AudioEngine.setReverbSend(inst, val);
  }, []);

  const handleDelaySendChange = useCallback((inst: Instrument, val: number) => {
    setDelaySends(prev => ({ ...prev, [inst]: val }));
    AudioEngine.setDelaySend(inst, val);
  }, []);

  const handleEQChange = useCallback((inst: Instrument, band: 'low' | 'mid' | 'high', val: number) => {
    setEqGains(prev => ({ ...prev, [inst]: { ...prev[inst], [band]: val } }));
    AudioEngine.setChannelEQ(inst, band, val);
  }, []);


  const handleSwingChange = useCallback((val: number) => {
    setSwing(val);
    AudioEngine.setSwing(val);
  }, []);

  const handleBpmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value);
    setBpm(newBpm);
    AudioEngine.setBpm(newBpm);
  }, []);

  /* Use Refs for stable access in handlers */
  const gridRef = useRef(grid);
  const velocitiesRef = useRef(velocities);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { velocitiesRef.current = velocities; }, [velocities]);

  const handleVelocityWheel = useCallback((e: WheelEvent, inst: Instrument, step: number) => {
     const currentGrid = gridRef.current;
     if (!currentGrid[inst][step]) return; 

    // Scroll DOWN (positive deltaY) => Increase Value (macOS natural scrolling)
    const d = e.deltaY > 0 ? 1 : -1;
    const amount = e.shiftKey ? 10 : 1;
    
    setVelocities(prev => {
        const current = prev[inst][step] || 100;
        let next = Math.min(127, Math.max(1, current + (d * amount)));
        if (next === current) return prev;
        
        const newRow = [...prev[inst]];
        newRow[step] = next;
        const newVelocities = { ...prev, [inst]: newRow };
        AudioEngine.updateVelocities(newVelocities);
        return newVelocities;
    });
  }, []);

  /* Per-step Bass Pitches Handlers (State moved to top) */
  const handleBassPitchChange = useCallback((stepIndex: number, val: number) => {
    const clampedVal = Math.max(24, Math.min(60, val)); // C1 to C4
    const newPitches = [...bassPitches];
    newPitches[stepIndex] = clampedVal;
    setBassPitches(newPitches);
    AudioEngine.updateBassPitches(newPitches);
  }, [bassPitches]);

  const handleNoteWheel = useCallback((e: WheelEvent, stepIndex: number) => {
    const current = bassPitches[stepIndex];
    const delta = e.deltaY > 0 ? 1 : -1;
    handleBassPitchChange(stepIndex, current + delta);
  }, [bassPitches, handleBassPitchChange]);

  const handleParamChange = useCallback((inst: keyof InstrumentParams, param: string, val: number) => {
    // Update state
    setParams(prev => ({
      ...prev,
      [inst]: {
        ...prev[inst],
        [param]: val
      }
    }));

    // Update Engine
    if (inst === 'kick') {
      if (param === 'tune') AudioEngine.setKickPitchDecay(val);
      if (param === 'decay') AudioEngine.setKickDecay(val);
      if (param === 'distortion') AudioEngine.setKickDistortion(val);
    } else if (inst === 'snare') {
      if (param === 'tone') AudioEngine.setSnareTone(val);
      if (param === 'snappy') AudioEngine.setSnareDecay(val);
    } else if (inst === 'hihat') {
      if (param === 'decay') AudioEngine.setHiHatDecay(val);
      if (param === 'tone') AudioEngine.setHiHatTone(val);
    } else if (inst === 'clap') {
      if (param === 'decay') AudioEngine.setClapDecay(val);
      if (param === 'tone') AudioEngine.setClapTone(val);
    } else if (inst === 'bass') {
      if (param === 'cutoff') AudioEngine.setBassCutoff(val);
      if (param === 'resonance') AudioEngine.setBassResonance(val);
      if (param === 'envMod') AudioEngine.setBassEnvMod(val);
      if (param === 'decay') AudioEngine.setBassDecay(val);
    } else if (inst === 'pad') {
      if (param === 'attack') AudioEngine.setPadAttack(val);
      if (param === 'release') AudioEngine.setPadRelease(val);
      if (param === 'cutoff') AudioEngine.setPadFilterCutoff(val);
      if (param === 'detune') AudioEngine.setPadDetune(val);
      if (param === 'distortion') AudioEngine.setPadDistortion(val);
    } else if (inst === 'poly') {
      if (param === 'attack') AudioEngine.setPolyAttack(val);
      if (param === 'decay') AudioEngine.setPolyDecay(val);
      if (param === 'sustain') AudioEngine.setPolySustain(val);
      if (param === 'release') AudioEngine.setPolyRelease(val);
      if (param === 'filter') AudioEngine.setPolyFilter(val);
      if (param === 'detune') AudioEngine.setPolyDetune(val);
    }
  }, []);

  /* Per-step Pad Pitches & Voicings Handlers (State moved to top) */
  const handlePadPitchChange = useCallback((stepIndex: number, val: number) => {
    const clampedVal = Math.max(36, Math.min(72, val));
    const newPitches = [...padPitches];
    newPitches[stepIndex] = clampedVal;
    setPadPitches(newPitches);
    AudioEngine.updatePadPitches(newPitches);
  }, [padPitches]);

  const handlePadNoteWheel = useCallback((e: WheelEvent, stepIndex: number) => {
    const current = padPitches[stepIndex];
    const delta = e.deltaY > 0 ? 1 : -1;
    handlePadPitchChange(stepIndex, current + delta);
  }, [padPitches, handlePadPitchChange]);

  const handlePadVoicingChange = useCallback((stepIndex: number, voicing: string) => {
     const newVoicings = [...padVoicings];
     newVoicings[stepIndex] = voicing;
     setPadVoicings(newVoicings);
     AudioEngine.updatePadVoicings(newVoicings);
  }, [padVoicings]);



  // Handler for pro mode parameter changes
  const handleProModeParamChange = (category: keyof ProModeParams, param: string, value: any) => {
    if (category === 'masterVolume') {
      setProModeParams({ ...proModeParams, masterVolume: value });
      AudioEngine.setMasterVolume(value);
    } else {
      setProModeParams({
        ...proModeParams,
        [category]: {
          ...(proModeParams[category] as any),
          [param]: value
        }
      });

      // Update AudioEngine based on category and param
      if (category === 'masterCompressor') {
        if (param === 'bypass') AudioEngine.setMasterCompressorBypass(value);
        if (param === 'threshold') AudioEngine.setMasterCompressorThreshold(value);
        if (param === 'ratio') AudioEngine.setMasterCompressorRatio(value);
        if (param === 'attack') AudioEngine.setMasterCompressorAttack(value);
        if (param === 'release') AudioEngine.setMasterCompressorRelease(value);
      } else if (category === 'tapeChain') {
        if (param === 'bypass') AudioEngine.setTapeBypass(value);
        if (param === 'compThreshold') AudioEngine.setTapeCompressorThreshold(value);
        if (param === 'compRatio') AudioEngine.setTapeCompressorRatio(value);
        if (param === 'compAttack') AudioEngine.setTapeCompressorAttack(value);
        if (param === 'compRelease') AudioEngine.setTapeCompressorRelease(value);
        if (param === 'distortion') AudioEngine.setTapeDistortion(value);
        if (param === 'filterCutoff') AudioEngine.setTapeFilterCutoff(value);
      } else if (category === 'reverb') {
        if (param === 'bypass') AudioEngine.setReverbBypass(value);
        if (param === 'decay') AudioEngine.setReverbDecay(value);
        if (param === 'preDelay') AudioEngine.setReverbPreDelay(value);
        if (param === 'toneFilter') AudioEngine.setReverbToneFilter(value);
        if (param === 'preFilter') AudioEngine.setReverbPreFilter(value);
        if (param === 'postFilter') AudioEngine.setReverbPostFilter(value);
      } else if (category === 'delay') {
        if (param === 'bypass') AudioEngine.setDelayBypass(value);
        if (param === 'time') AudioEngine.setDelayTime(value);
        if (param === 'feedback') AudioEngine.setDelayFeedback(value);
        if (param === 'preFilter') AudioEngine.setDelayPreFilter(value);
        if (param === 'postFilter') AudioEngine.setDelayPostFilter(value);
      } else if (category === 'trackEnabled') {
        setProModeParams({
          ...proModeParams,
          trackEnabled: {
            ...proModeParams.trackEnabled,
            [param]: value
          }
        });
        AudioEngine.setTrackEnabled(param as Instrument, value);
      }
    }
  };

  // Save current state to active scene whenever it changes  
  useEffect(() => {
    // Debounce save to prevent jank during rapid parameter changes (knob twists)
    const timerId = setTimeout(() => {
      const currentScene: Scene = {
        name: scenes[activeSceneIndex].name,
        grid,
        bassPitches,
        padPitches,
        padVoicings,
        polyNotes,
        volumes,
        velocities,
        reverbSends,
        delaySends,
        eqGains,
        params,
        mutes,
        solos,
        bpm,
        swing,
        proModeParams
      };

      // Only save if the current state is different from what's in the scenes array
      // to avoid unnecessary updates and potential race conditions during scene load
      const existingScene = scenes[activeSceneIndex];
      const hasChanged = JSON.stringify(currentScene) !== JSON.stringify(existingScene);

      if (hasChanged) {
        const newScenes = [...scenes];
        newScenes[activeSceneIndex] = currentScene;
        setScenes(newScenes);
        saveScenes(newScenes);
      }
    }, 1000); // Wait 1 second after last change before saving

    return () => clearTimeout(timerId);
  }, [activeSceneIndex, grid, bassPitches, padPitches, padVoicings, polyNotes, volumes, velocities, reverbSends, delaySends, eqGains, params, mutes, solos, bpm, swing, proModeParams, scenes]);

  // Scene Management Handlers
  const loadSceneState = useCallback((scene: Scene) => {
    setGrid(scene.grid);
    setBassPitches(scene.bassPitches);
    setPadPitches(scene.padPitches);
    setPadVoicings(scene.padVoicings);
    setPolyNotes(scene.polyNotes || new Array(16).fill([]));
    setVolumes(scene.volumes);
    setReverbSends(scene.reverbSends);
    setDelaySends(scene.delaySends);
    setEqGains(scene.eqGains);
    setParams(scene.params || INITIAL_PARAMS);
    setMutes(scene.mutes);
    setSolos(scene.solos);
    setBpm(scene.bpm);
    setSwing(scene.swing);

    const safeVelocities = scene.velocities || (() => {
       const v: any = {};
       const insts: Instrument[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'pad', 'poly', 'kick909', 'snare909', 'hihat909', 'clap909'];
       insts.forEach(i => v[i] = new Array(16).fill(100));
       return v;
    })();
    setVelocities(safeVelocities);

    // Load pro mode params or use defaults
    const safeProModeParams = scene.proModeParams || INITIAL_PRO_MODE_PARAMS;
    setProModeParams(safeProModeParams);

    // Sync to audio engine
    AudioEngine.setBpm(scene.bpm);
    AudioEngine.updateGrid(scene.grid);
    AudioEngine.updateBassPitches(scene.bassPitches);
    AudioEngine.updatePadPitches(scene.padPitches);
    AudioEngine.updatePadVoicings(scene.padVoicings);
    AudioEngine.updatePolyNotes(scene.polyNotes || new Array(16).fill([]));
    AudioEngine.setSwing(scene.swing);
    AudioEngine.updateVelocities(safeVelocities);

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

    const p = scene.params || INITIAL_PARAMS;
    AudioEngine.setKickPitchDecay(p.kick.tune);
    AudioEngine.setKickDecay(p.kick.decay);
    AudioEngine.setKickDistortion(p.kick.distortion || 0);
    AudioEngine.setSnareTone(p.snare.tone);
    AudioEngine.setSnareDecay(p.snare.snappy);
    AudioEngine.setHiHatDecay(p.hihat.decay);
    AudioEngine.setHiHatTone(p.hihat.tone);
    AudioEngine.setClapDecay(p.clap.decay);
    AudioEngine.setClapTone(p.clap.tone);
    AudioEngine.setBassCutoff(p.bass.cutoff);
    AudioEngine.setBassResonance(p.bass.resonance);
    AudioEngine.setBassEnvMod(p.bass.envMod);
    AudioEngine.setBassDecay(p.bass.decay);
    AudioEngine.setPadAttack(p.pad.attack);
    AudioEngine.setPadRelease(p.pad.release);
    AudioEngine.setPadFilterCutoff(p.pad.cutoff);
    AudioEngine.setPadDetune(p.pad.detune);
    AudioEngine.setPadDistortion(p.pad.distortion);

    // Poly Params
    const polyP = p.poly || INITIAL_PARAMS.poly;
    AudioEngine.setPolyAttack(polyP.attack);
    AudioEngine.setPolyDecay(polyP.decay);
    AudioEngine.setPolySustain(polyP.sustain);
    AudioEngine.setPolyRelease(polyP.release);
    AudioEngine.setPolyFilter(polyP.filter);
    AudioEngine.setPolyDetune(polyP.detune);
    AudioEngine.setPolyOscillator(polyP.oscillator || 'square');
    
    AudioEngine.setKickDistortion(p.kick.distortion || 0);

    // Sync pro mode params to AudioEngine
    AudioEngine.setMasterVolume(safeProModeParams.masterVolume);
    AudioEngine.setMasterCompressorThreshold(safeProModeParams.masterCompressor.threshold);
    AudioEngine.setMasterCompressorRatio(safeProModeParams.masterCompressor.ratio);
    AudioEngine.setMasterCompressorAttack(safeProModeParams.masterCompressor.attack);
    AudioEngine.setMasterCompressorRelease(safeProModeParams.masterCompressor.release);
    
    AudioEngine.setTapeBypass(safeProModeParams.tapeChain.bypass);
    AudioEngine.setTapeCompressorThreshold(safeProModeParams.tapeChain.compThreshold);
    AudioEngine.setTapeCompressorRatio(safeProModeParams.tapeChain.compRatio);
    AudioEngine.setTapeCompressorAttack(safeProModeParams.tapeChain.compAttack);
    AudioEngine.setTapeCompressorRelease(safeProModeParams.tapeChain.compRelease);
    AudioEngine.setTapeDistortion(safeProModeParams.tapeChain.distortion);
    AudioEngine.setTapeFilterCutoff(safeProModeParams.tapeChain.filterCutoff);
    
    AudioEngine.setMasterCompressorBypass(safeProModeParams.masterCompressor.bypass);
    AudioEngine.setReverbBypass(safeProModeParams.reverb.bypass);
    AudioEngine.setReverbDecay(safeProModeParams.reverb.decay);
    AudioEngine.setReverbPreDelay(safeProModeParams.reverb.preDelay);
    AudioEngine.setReverbToneFilter(safeProModeParams.reverb.toneFilter);
    AudioEngine.setReverbPreFilter(safeProModeParams.reverb.preFilter);
    AudioEngine.setReverbPostFilter(safeProModeParams.reverb.postFilter);
    
    AudioEngine.setDelayBypass(safeProModeParams.delay.bypass);
    AudioEngine.setDelayTime(safeProModeParams.delay.time);
    AudioEngine.setDelayFeedback(safeProModeParams.delay.feedback);
    AudioEngine.setDelayPreFilter(safeProModeParams.delay.preFilter);
    AudioEngine.setDelayPostFilter(safeProModeParams.delay.postFilter);

    // Sync track enablement
    Object.entries(safeProModeParams.trackEnabled).forEach(([inst, enabled]) => {
      AudioEngine.setTrackEnabled(inst as Instrument, enabled);
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

  const handleExportAll = useCallback(() => {
    downloadProject(scenes);
  }, [scenes]);

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
        
        // Try parsing as project file first
        const projectFile = parseProjectFile(json);
        if (projectFile) {
          setPendingImport(projectFile);
          setShowImportModal(true);
          return;
        }
        
        // Fall back to single scene import
        const scene = importScene(json);
        if (scene) {
          const newScenes = [...scenes];
          newScenes[activeSceneIndex] = scene;
          setScenes(newScenes);
          saveScenes(newScenes);
          loadSceneState(scene);
        } else {
          alert('Failed to import. Invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [scenes, activeSceneIndex, loadSceneState]);

  const handleConfirmImport = useCallback((selectedIndices: number[]) => {
    if (!pendingImport) return;
    
    const newScenes = [...scenes];
    selectedIndices.forEach(idx => {
      if (idx < pendingImport.scenes.length) {
        newScenes[idx] = pendingImport.scenes[idx];
      }
    });
    
    setScenes(newScenes);
    saveScenes(newScenes);
    
    // If active scene was imported, reload it
    if (selectedIndices.includes(activeSceneIndex)) {
      loadSceneState(newScenes[activeSceneIndex]);
    }
    
    setShowImportModal(false);
    setPendingImport(null);
  }, [pendingImport, scenes, activeSceneIndex, loadSceneState]);

  const handleCancelImport = useCallback(() => {
    setShowImportModal(false);
    setPendingImport(null);
  }, []);

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



  /* Poly Note Handlers */
  const handlePolyNotesChange = useCallback((stepIndex: number, notes: number[]) => {
    setPolyNotes(prev => {
        const newNotes = [...prev];
        newNotes[stepIndex] = notes;
        AudioEngine.updatePolyNotes(newNotes);
        return newNotes;
    });

    // Auto-enable step in sequencer grid if notes are added
    // Needs access to current Grid. 
    setGrid(prev => {
        if (notes.length > 0 && !prev.poly[stepIndex]) {
            const newRow = [...prev.poly];
            newRow[stepIndex] = true;
            const newGrid = { ...prev, poly: newRow };
            AudioEngine.updateGrid(newGrid);
            return newGrid;
        }
        return prev;
    });
  }, []);

  // -- MEMOIZED CHILD COMPONENTS --
  // Kick
  const kickControls = useMemo(() => (
    <>
      <div className="param-item">
        <label>Tune</label>
        <ScrollableSlider min={0.01} max={0.3} step={0.01} value={params.kick.tune} onChange={e => handleParamChange('kick', 'tune', Number(e.target.value))} />
      </div>
      <div className="param-item">
        <label>Decay</label>
        <ScrollableSlider min={0.1} max={2.0} step={0.1} value={params.kick.decay} onChange={e => handleParamChange('kick', 'decay', Number(e.target.value))} />
      </div>
      <div className="param-item">
        <label>Dist</label>
        <ScrollableSlider min={0} max={0.6} step={0.01} value={params.kick.distortion || 0} onChange={e => handleParamChange('kick', 'distortion', Number(e.target.value))} />
      </div>
    </>
  ), [params.kick, handleParamChange]);

  const kickSteps = useMemo(() => (
    <div className="steps-container">
    {[0, 1, 2, 3].map(groupIdx => (
        <div key={groupIdx} className="step-group">
        {[0, 1, 2, 3].map(stepInGroup => {
            const stepIndex = groupIdx * 4 + stepInGroup;
            const isActive = grid.kick[stepIndex];
            const stepVel = velocities.kick[stepIndex];
            return (
            <Step
                key={stepIndex}
                isActive={isActive}
                isCurrent={currentStep === stepIndex && isPlaying}
                velocity={stepVel}
                onMouseDown={() => handleStepMouseDown('kick', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('kick', stepIndex)}
                onWheel={(e) => handleVelocityWheel(e, 'kick', stepIndex)}
            />
            );
        })}
        </div>
    ))}
    </div>
  ), [grid.kick, velocities.kick, currentStep, isPlaying, handleStepMouseDown, handleStepMouseEnter, handleVelocityWheel]);

  // Snare
  const snareControls = useMemo(() => (
    <>
      <div className="param-item">
        <label>Tone</label>
        <ScrollableSlider min={400} max={6000} step={100} value={params.snare.tone} onChange={e => handleParamChange('snare', 'tone', Number(e.target.value))} />
      </div>
      <div className="param-item">
        <label>Snappy</label>
        <ScrollableSlider min={0.05} max={0.5} step={0.01} value={params.snare.snappy} onChange={e => handleParamChange('snare', 'snappy', Number(e.target.value))} />
      </div>
    </>
  ), [params.snare, handleParamChange]);

  const snareSteps = useMemo(() => (
    <div className="steps-container">
    {[0, 1, 2, 3].map(groupIdx => (
        <div key={groupIdx} className="step-group">
        {[0, 1, 2, 3].map(stepInGroup => {
            const stepIndex = groupIdx * 4 + stepInGroup;
            const isActive = grid.snare[stepIndex];
            const stepVel = velocities.snare[stepIndex];
            return (
            <Step
                key={stepIndex}
                isActive={isActive}
                isCurrent={currentStep === stepIndex && isPlaying}
                velocity={stepVel}
                onMouseDown={() => handleStepMouseDown('snare', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('snare', stepIndex)}
                onWheel={(e) => handleVelocityWheel(e, 'snare', stepIndex)}
            />
            );
        })}
        </div>
    ))}
    </div>
  ), [grid.snare, velocities.snare, currentStep, isPlaying, handleStepMouseDown, handleStepMouseEnter, handleVelocityWheel]);

  // Hihat
  const hihatControls = useMemo(() => (
    <>
        <div className="param-item">
        <label>Decay</label>
        <ScrollableSlider min={0.05} max={1.0} step={0.01} value={params.hihat.decay} onChange={e => handleParamChange('hihat', 'decay', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Tone</label>
        <ScrollableSlider min={500} max={10000} step={100} value={params.hihat.tone} onChange={e => handleParamChange('hihat', 'tone', Number(e.target.value))} />
        </div>
    </>
  ), [params.hihat, handleParamChange]);

  const hihatSteps = useMemo(() => (
    <div className="steps-container">
    {[0, 1, 2, 3].map(groupIdx => (
        <div key={groupIdx} className="step-group">
        {[0, 1, 2, 3].map(stepInGroup => {
            const stepIndex = groupIdx * 4 + stepInGroup;
            const isActive = grid.hihat[stepIndex];
            const stepVel = velocities.hihat[stepIndex];
            return (
            <Step
                key={stepIndex}
                isActive={isActive}
                isCurrent={currentStep === stepIndex && isPlaying}
                velocity={stepVel}
                onMouseDown={() => handleStepMouseDown('hihat', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('hihat', stepIndex)}
                onWheel={(e) => handleVelocityWheel(e, 'hihat', stepIndex)}
            />
            );
        })}
        </div>
    ))}
    </div>
  ), [grid.hihat, velocities.hihat, currentStep, isPlaying, handleStepMouseDown, handleStepMouseEnter, handleVelocityWheel]);
  
  // Clap
  const clapControls = useMemo(() => (
    <>
        <div className="param-item">
        <label>Decay</label>
        <ScrollableSlider min={0.01} max={0.5} step={0.01} value={params.clap.decay} onChange={e => handleParamChange('clap', 'decay', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Tone</label>
        <ScrollableSlider min={500} max={4000} step={100} value={params.clap.tone} onChange={e => handleParamChange('clap', 'tone', Number(e.target.value))} />
        </div>
    </>
  ), [params.clap, handleParamChange]);

  const clapSteps = useMemo(() => (
    <div className="steps-container">
    {[0, 1, 2, 3].map(groupIdx => (
        <div key={groupIdx} className="step-group">
        {[0, 1, 2, 3].map(stepInGroup => {
            const stepIndex = groupIdx * 4 + stepInGroup;
            const isActive = grid.clap[stepIndex];
            const stepVel = velocities.clap[stepIndex];
            return (
            <Step
                key={stepIndex}
                isActive={isActive}
                isCurrent={currentStep === stepIndex && isPlaying}
                velocity={stepVel}
                onMouseDown={() => handleStepMouseDown('clap', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('clap', stepIndex)}
                onWheel={(e) => handleVelocityWheel(e, 'clap', stepIndex)}
            />
            );
        })}
        </div>
    ))}
    </div>
  ), [grid.clap, velocities.clap, currentStep, isPlaying, handleStepMouseDown, handleStepMouseEnter, handleVelocityWheel]);

  // Bass
  const bassControls = useMemo(() => (
    <>
      <div className="param-item">
        <label>Cutoff</label>
        <ScrollableSlider min={50} max={5000} step={10} value={params.bass.cutoff} onChange={e => handleParamChange('bass', 'cutoff', Number(e.target.value))} />
      </div>
      <div className="param-item">
        <label>Res</label>
        <ScrollableSlider min={0} max={20} step={0.1} value={params.bass.resonance} onChange={e => handleParamChange('bass', 'resonance', Number(e.target.value))} />
      </div>
      <div className="param-item">
        <label>Env Mod</label>
        <ScrollableSlider min={0} max={8} step={0.1} value={params.bass.envMod} onChange={e => handleParamChange('bass', 'envMod', Number(e.target.value))} />
      </div>
      <div className="param-item">
        <label>Decay</label>
        <ScrollableSlider min={0.1} max={2.0} step={0.1} value={params.bass.decay} onChange={e => handleParamChange('bass', 'decay', Number(e.target.value))} />
      </div>
    </>
  ), [params.bass, handleParamChange]);

  const bassSteps = useMemo(() => (
    <div className="bass-steps-container">
    {[0, 1, 2, 3].map(groupIdx => (
        <div key={groupIdx} className="step-group bass-group">
        {[0, 1, 2, 3].map(stepInGroup => {
            const stepIndex = groupIdx * 4 + stepInGroup;
            const isActive = grid.bass[stepIndex];
            const stepVel = velocities.bass[stepIndex];
            return (
            <div key={stepIndex} className="bass-step-wrapper">
                <Step
                isActive={isActive}
                isCurrent={currentStep === stepIndex && isPlaying}
                velocity={stepVel}
                onMouseDown={() => handleStepMouseDown('bass', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('bass', stepIndex)}
                onWheel={(e) => handleVelocityWheel(e, 'bass', stepIndex)}
                />
                <ScrollableSelect 
                className="note-select"
                value={bassPitches[stepIndex]}
                onChange={(e) => handleBassPitchChange(stepIndex, Number(e.target.value))}
                onWheel={(e) => handleNoteWheel(e, stepIndex)}
                >
                {Array.from({ length: 37 }, (_, i) => {
                    const midi = 60 - i;
                    return <option key={midi} value={midi}>{midiToNoteName(midi)}</option>;
                })}
                </ScrollableSelect>
                <NoteStepper
                midi={bassPitches[stepIndex]}
                min={24}
                max={60}
                onChange={(val) => handleBassPitchChange(stepIndex, val)}
                buttonsOnly
                />
            </div>
            );
        })}
        </div>
    ))}
    </div>
  ), [grid.bass, velocities.bass, currentStep, isPlaying, bassPitches, handleStepMouseDown, handleStepMouseEnter, handleVelocityWheel, handleBassPitchChange, handleNoteWheel]);

  // Pad
  const padControls = useMemo(() => (
    <>
        <div className="param-item">
        <label>Attack</label>
        <ScrollableSlider min={0.01} max={1.0} step={0.01} value={params.pad.attack} onChange={e => handleParamChange('pad', 'attack', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Release</label>
        <ScrollableSlider min={0.1} max={3.0} step={0.1} value={params.pad.release} onChange={e => handleParamChange('pad', 'release', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Filter</label>
        <ScrollableSlider min={100} max={8000} step={50} value={params.pad.cutoff} onChange={e => handleParamChange('pad', 'cutoff', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Detune</label>
        <ScrollableSlider min={0} max={30} step={1} value={params.pad.detune} onChange={e => handleParamChange('pad', 'detune', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Distortion</label>
        <ScrollableSlider min={0} max={1} step={0.01} value={params.pad.distortion} onChange={e => handleParamChange('pad', 'distortion', Number(e.target.value))} />
        </div>
    </>
  ), [params.pad, handleParamChange]);

  const padSteps = useMemo(() => (
    <div className="pad-steps-container">
    {[0, 1, 2, 3].map(groupIdx => (
        <div key={groupIdx} className="step-group pad-group">
        {[0, 1, 2, 3].map(stepInGroup => {
            const stepIndex = groupIdx * 4 + stepInGroup;
            const isActive = grid.pad[stepIndex];
            const stepVel = velocities.pad[stepIndex];
            return (
            <div key={stepIndex} className="pad-step-wrapper">
                <Step
                isActive={isActive}
                isCurrent={currentStep === stepIndex && isPlaying}
                velocity={stepVel}
                onMouseDown={() => handleStepMouseDown('pad', stepIndex)}
                onMouseEnter={() => handleStepMouseEnter('pad', stepIndex)}
                onWheel={(e) => handleVelocityWheel(e, 'pad', stepIndex)}
                />
                <ScrollableSelect 
                className="note-select"
                value={padPitches[stepIndex]}
                onChange={(e) => handlePadPitchChange(stepIndex, Number(e.target.value))}
                onWheel={(e) => handlePadNoteWheel(e, stepIndex)}
                >
                {Array.from({ length: 37 }, (_, i) => {
                    const midi = 72 - i;
                    return <option key={midi} value={midi}>{midiToNoteName(midi)}</option>;
                })}
                </ScrollableSelect>
                <ScrollableSelect 
                className="voicing-select"
                value={padVoicings[stepIndex]}
                onChange={(e) => handlePadVoicingChange(stepIndex, e.target.value)}
                >
                {PAD_VOICING_OPTIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                ))}
                </ScrollableSelect>
                <NoteStepper
                midi={padPitches[stepIndex]}
                min={36}
                max={72}
                onChange={(val) => handlePadPitchChange(stepIndex, val)}
                buttonsOnly
                />
            </div>
            );
        })}
        </div>
    ))}
    </div>
  ), [grid.pad, velocities.pad, currentStep, isPlaying, padPitches, padVoicings, handleStepMouseDown, handleStepMouseEnter, handleVelocityWheel, handlePadPitchChange, handlePadNoteWheel, handlePadVoicingChange, PAD_VOICING_OPTIONS]);

  // Poly
  const polyControls = useMemo(() => (
    <>
        <div className="param-item">
        <label>Wave</label>
        <ScrollableSelect 
            value={params.poly.oscillator || 'square'} 
            onChange={(e) => {
                const val = e.target.value as any;
                handleParamChange('poly', 'oscillator', val);
                AudioEngine.setPolyOscillator(val);
            }}
            style={{ width: '60px' }}
        >
            <option value="square">Sqr</option>
            <option value="sawtooth">Saw</option>
            <option value="triangle">Tri</option>
        </ScrollableSelect>
        </div>
        <div className="param-item">
        <label>Attack</label>
        <ScrollableSlider min={0.01} max={1.0} step={0.01} value={params.poly.attack} onChange={e => handleParamChange('poly', 'attack', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Decay</label>
        <ScrollableSlider min={0.1} max={2.0} step={0.1} value={params.poly.decay} onChange={e => handleParamChange('poly', 'decay', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Filter</label>
        <ScrollableSlider min={100} max={5000} step={50} value={params.poly.filter} onChange={e => handleParamChange('poly', 'filter', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Sus</label>
        <ScrollableSlider min={0} max={1} step={0.01} value={params.poly.sustain} onChange={e => handleParamChange('poly', 'sustain', Number(e.target.value))} />
        </div>
        <div className="param-item">
        <label>Rel</label>
        <ScrollableSlider min={0.1} max={3.0} step={0.1} value={params.poly.release} onChange={e => handleParamChange('poly', 'release', Number(e.target.value))} />
        </div>
    </>
  ), [params.poly, handleParamChange]);

  const polySteps = useMemo(() => (
    <div style={{ padding: '4px 0' }}>
    <PianoRoll 
        currentStep={isPlaying ? currentStep : -1}
        steps={polyNotes}
        onChange={handlePolyNotesChange}
        minNote={48} // C3
        maxNote={84} // C6
    />
    </div>
  ), [isPlaying, currentStep, polyNotes, handlePolyNotesChange]);

  return (
    <div className="container">
      <div className="header">
        <h1>12 oh 12</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="help-btn" onClick={() => setShowShortcutHelp(true)} title="Keyboard Shortcuts (?)">
            ?
          </button>
          <div className="pro-mode-toggle" onClick={() => setProMode(!proMode)}>
            <span className="pro-mode-toggle-label">{proMode ? 'pro' : 'reg'}</span>
            <div className="pro-mode-toggle-track">
              <div className="pro-mode-toggle-thumb" />
            </div>
          </div>
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
          <ScrollableSlider 
            min={65}
            max={175}
            value={bpm} 
            onChange={handleBpmChange}
          />
        </div>

        <div className="control-group">
          <label>Swing: {Math.round(swing * 100)}%</label>
          <ScrollableSlider
            className="swing-slider"
            min={0}
            max={0.5}
            step={0.02}
            value={swing}
            onChange={(e) => handleSwingChange(Number(e.target.value))}
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
        onExportAll={handleExportAll}
      />

      {proMode && (
        <ProModeControls
          params={proModeParams}
          onParamChange={handleProModeParamChange}
        />
      )}



      <div className="sequencer-grid">
        {/* Kick */}
        {(proModeParams.trackEnabled?.kick ?? true) && (
        <TrackRow
          label="kick"
          instrument="kick"
          mute={mutes.kick}
          solo={solos.kick}
          volume={volumes.kick}
          reverbSend={reverbSends.kick}
          delaySend={delaySends.kick}
          eq={eqGains.kick}
          onMute={handleMute}
          onSolo={handleSolo}
          onVolumeChange={handleVolumeChange}
          onReverbSendChange={handleReverbSendChange}
          onDelaySendChange={handleDelaySendChange}
          onEQChange={handleEQChange}
          extraControls={kickControls}
        >
          {kickSteps}
        </TrackRow>
        )}

        {/* Snare */}
        {(proModeParams.trackEnabled?.snare ?? true) && (
        <TrackRow
          label="snare"
          instrument="snare"
          mute={mutes.snare}
          solo={solos.snare}
          volume={volumes.snare}
          reverbSend={reverbSends.snare}
          delaySend={delaySends.snare}
          eq={eqGains.snare}
          onMute={handleMute}
          onSolo={handleSolo}
          onVolumeChange={handleVolumeChange}
          onReverbSendChange={handleReverbSendChange}
          onDelaySendChange={handleDelaySendChange}
          onEQChange={handleEQChange}
          extraControls={snareControls}
        >
          {snareSteps}
        </TrackRow>
        )}

        {/* HiHat */}
        {(proModeParams.trackEnabled?.hihat ?? true) && (
        <TrackRow
          label="hihat"
          instrument="hihat"
          mute={mutes.hihat}
          solo={solos.hihat}
          volume={volumes.hihat}
          reverbSend={reverbSends.hihat}
          delaySend={delaySends.hihat}
          eq={eqGains.hihat}
          onMute={handleMute}
          onSolo={handleSolo}
          onVolumeChange={handleVolumeChange}
          onReverbSendChange={handleReverbSendChange}
          onDelaySendChange={handleDelaySendChange}
          onEQChange={handleEQChange}
          extraControls={hihatControls}
        >
          {hihatSteps}
        </TrackRow>
        )}

        {/* Clap */}
        {(proModeParams.trackEnabled?.clap ?? true) && (
        <TrackRow
          label="clap"
          instrument="clap"
          mute={mutes.clap}
          solo={solos.clap}
          volume={volumes.clap}
          reverbSend={reverbSends.clap}
          delaySend={delaySends.clap}
          eq={eqGains.clap}
          onMute={handleMute}
          onSolo={handleSolo}
          onVolumeChange={handleVolumeChange}
          onReverbSendChange={handleReverbSendChange}
          onDelaySendChange={handleDelaySendChange}
          onEQChange={handleEQChange}
          extraControls={clapControls}
        >
          {clapSteps}
        </TrackRow>
        )}

        {/* Bass (303) */}
        {(proModeParams.trackEnabled?.bass ?? true) && (
        <TrackRow
          label="303"
          instrument="bass"
          className="bass-container"
          mute={mutes.bass}
          solo={solos.bass}
          volume={volumes.bass}
          reverbSend={reverbSends.bass}
          delaySend={delaySends.bass}
          eq={eqGains.bass}
          onMute={handleMute}
          onSolo={handleSolo}
          onVolumeChange={handleVolumeChange}
          onReverbSendChange={handleReverbSendChange}
          onDelaySendChange={handleDelaySendChange}
          onEQChange={handleEQChange}
          extraControls={bassControls}
        >
          {bassSteps}
        </TrackRow>
        )}

        {/* Pad Synth */}
        {(proModeParams.trackEnabled?.pad ?? true) && (
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
          onMute={handleMute}
          onSolo={handleSolo}
          onVolumeChange={handleVolumeChange}
          onReverbSendChange={handleReverbSendChange}
          onDelaySendChange={handleDelaySendChange}
          onEQChange={handleEQChange}
          extraControls={padControls}
        >
          {padSteps}
        </TrackRow>
        )}

        {/* Poly Synth */}
        {(proModeParams.trackEnabled?.poly ?? true) && (
        <TrackRow
          label="Poly"
          instrument="poly"
          className="poly-container"
          mute={mutes.poly}
          solo={solos.poly}
          volume={volumes.poly}
          reverbSend={reverbSends.poly}
          delaySend={delaySends.poly}
          eq={eqGains.poly}
          onMute={handleMute}
          onSolo={handleSolo}
          onVolumeChange={handleVolumeChange}
          onReverbSendChange={handleReverbSendChange}
          onDelaySendChange={handleDelaySendChange}
          onEQChange={handleEQChange}
          extraControls={polyControls}
        >
          {polySteps}
        </TrackRow>
        )}

      </div>
      
      <Visualizer theme={theme} isPlaying={isPlaying} />

      <ShortcutHelp isOpen={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />
      
      {showImportModal && pendingImport && (
        <ImportSelectionModal
          projectFile={pendingImport!}
          currentScenes={scenes}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
      )}
    </div>
  );
}

export default App;
