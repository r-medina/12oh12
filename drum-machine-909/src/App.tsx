import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
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
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { loadScenes, saveScenes, createEmptyScene, downloadScene, importScene } from './utils/storage';
import type { Instrument, Scene, InstrumentParams, ProModeParams } from './types';

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

const INITIAL_PARAMS: InstrumentParams = {
  kick: { tune: 0.05, decay: 0.4, distortion: 0 },
  snare: { tone: 3000, snappy: 0.2 },
  hihat: { decay: 0.2, tone: 3000 },
  clap: { decay: 0.3, tone: 1500 },
  bass: { cutoff: 200, resonance: 2, envMod: 2, decay: 0.2 },
  pad: { attack: 0.3, release: 1.5, cutoff: 2000, detune: 12, distortion: 0 }
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
    pad: true
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
    const insts: Instrument[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'pad', 'kick909', 'snare909', 'hihat909', 'clap909'];
    insts.forEach(i => vels[i] = new Array(16).fill(100));
    return vels;
  });
  const [params, setParams] = useState<InstrumentParams>(INITIAL_PARAMS);
  const [proMode, setProMode] = useState(false);
  const [proModeParams, setProModeParams] = useState<ProModeParams>(INITIAL_PRO_MODE_PARAMS);

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


  const handleSwingChange = (val: number) => {
    setSwing(val);
    AudioEngine.setSwing(val);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value);
    setBpm(newBpm);
    AudioEngine.setBpm(newBpm);
  };

  const handleVelocityWheel = useCallback((e: WheelEvent, inst: Instrument, step: number) => {
    if (!grid[inst][step]) return; // Only edit velocity if step is active

    // Scroll UP (negative deltaY) => Increase Value
    const d = e.deltaY < 0 ? 1 : -1;
    const amount = e.shiftKey ? 10 : 1;
    
    const current = velocities[inst][step] || 100;
    let next = Math.min(127, Math.max(1, current + (d * amount)));
    
    if (next === current) return;
    
    const newRow = [...velocities[inst]];
    newRow[step] = next;
    const newVelocities = { ...velocities, [inst]: newRow };
    setVelocities(newVelocities);
    AudioEngine.updateVelocities(newVelocities);
  }, [grid, velocities]);

  /* Per-step Bass Pitches (MIDI notes) */
  const [bassPitches, setBassPitches] = useState<number[]>(new Array(16).fill(36)); // Default C2 (36)

  const handleBassPitchChange = (stepIndex: number, val: number) => {
    const clampedVal = Math.max(24, Math.min(60, val)); // C1 to C4
    const newPitches = [...bassPitches];
    newPitches[stepIndex] = clampedVal;
    setBassPitches(newPitches);
    AudioEngine.updateBassPitches(newPitches);
  };

  const handleNoteWheel = useCallback((e: WheelEvent, stepIndex: number) => {
    const current = bassPitches[stepIndex];
    const delta = e.deltaY > 0 ? 1 : -1;
    handleBassPitchChange(stepIndex, current + delta);
  }, [bassPitches]);

  const handleParamChange = (inst: keyof InstrumentParams, param: string, val: number) => {
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
    }
  };

  /* Per-step Pad Pitches (MIDI notes) and Voicings */
  const [padPitches, setPadPitches] = useState<number[]>(new Array(16).fill(48)); // Default C3 (48)
  const [padVoicings, setPadVoicings] = useState<string[]>(new Array(16).fill('single'));

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
    const currentScene: Scene = {
      name: scenes[activeSceneIndex].name,
      grid,
      bassPitches,
      padPitches,
      padVoicings,
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

    const newScenes = [...scenes];
    newScenes[activeSceneIndex] = currentScene;
    setScenes(newScenes);
    saveScenes(newScenes);
  }, [grid, bassPitches, padPitches, padVoicings, volumes, velocities, reverbSends, delaySends, eqGains, params, mutes, solos, bpm, swing, proModeParams]);

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
    setParams(scene.params || INITIAL_PARAMS);
    setMutes(scene.mutes);
    setSolos(scene.solos);
    setBpm(scene.bpm);
    setSwing(scene.swing);

    const safeVelocities = scene.velocities || (() => {
       const v: any = {};
       const insts: Instrument[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'pad', 'kick909', 'snare909', 'hihat909', 'clap909'];
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
    AudioEngine.setPadDetune(p.pad.detune);
    AudioEngine.setPadDistortion(p.pad.distortion);
    
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

  const handlePadNoteWheel = useCallback((e: WheelEvent, stepIndex: number) => {
    const current = padPitches[stepIndex];
    const delta = e.deltaY > 0 ? 1 : -1;
    handlePadPitchChange(stepIndex, current + delta);
  }, [padPitches]);
  
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
          onMute={() => handleMute('kick')}
          onSolo={() => handleSolo('kick')}
          onVolumeChange={(v: number) => handleVolumeChange('kick', v)}

          onReverbSendChange={(v: number) => handleReverbSendChange('kick', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('kick', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('kick', band, v)}
          extraControls={
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
          }
        >
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
          onMute={() => handleMute('snare')}
          onSolo={() => handleSolo('snare')}
          onVolumeChange={(v: number) => handleVolumeChange('snare', v)}

          onReverbSendChange={(v: number) => handleReverbSendChange('snare', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('snare', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('snare', band, v)}
          extraControls={
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
          }
        >
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
          onMute={() => handleMute('hihat')}
          onSolo={() => handleSolo('hihat')}
          onVolumeChange={(v: number) => handleVolumeChange('hihat', v)}

          onReverbSendChange={(v: number) => handleReverbSendChange('hihat', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('hihat', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('hihat', band, v)}
          extraControls={
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
          }
        >
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
          onMute={() => handleMute('clap')}
          onSolo={() => handleSolo('clap')}
          onVolumeChange={(v: number) => handleVolumeChange('clap', v)}

          onReverbSendChange={(v: number) => handleReverbSendChange('clap', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('clap', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('clap', band, v)}
          extraControls={
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
          }
        >
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
        </TrackRow>
        )}

        {/* Bass (303) */}
        {(proModeParams.trackEnabled?.bass ?? true) && (
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

          onReverbSendChange={(v: number) => handleReverbSendChange('bass', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('bass', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('bass', band, v)}
          extraControls={
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
          }
        >
          {/* Combined Step + Pitch with quarter note grouping */}
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
          onMute={() => handleMute('pad')}
          onSolo={() => handleSolo('pad')}
          onVolumeChange={(v: number) => handleVolumeChange('pad', v)}

          onReverbSendChange={(v: number) => handleReverbSendChange('pad', v)}
          onDelaySendChange={(v: number) => handleDelaySendChange('pad', v)}
          onEQChange={(band: 'low' | 'mid' | 'high', v: number) => handleEQChange('pad', band, v)}
          extraControls={
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
          }
        >
          {/* Combined Step + Pitch + Voicing with quarter note grouping */}
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
                      {/* Row 1: Note select */}
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
                      {/* Row 2: Chord select */}
                      <ScrollableSelect 
                        className="voicing-select"
                        value={padVoicings[stepIndex]}
                        onChange={(e) => handlePadVoicingChange(stepIndex, e.target.value)}
                      >
                        {PAD_VOICING_OPTIONS.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </ScrollableSelect>
                      {/* Row 3: +/- buttons */}
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
        </TrackRow>
        )}

      </div>
      
      <Visualizer theme={theme} isPlaying={isPlaying} />

      <ShortcutHelp isOpen={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />
    </div>
  );
}

export default App;
