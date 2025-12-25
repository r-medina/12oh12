import type { Scene, Instrument, InstrumentParams } from '../types';

const STORAGE_KEY = 'drum-machine-scenes';
const AUTO_SAVE_KEY = 'drum-machine-autosave';

/**
 * Create a single empty scene
 */
export const createEmptyScene = (name: string): Scene => {
  const instruments: Instrument[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'pad', 'kick909', 'snare909', 'hihat909', 'clap909'];
  
  const emptyGrid: Record<Instrument, boolean[]> = {} as Record<Instrument, boolean[]>;
  const emptyVolumes: Record<Instrument, number> = {} as Record<Instrument, number>;
  const emptyReverbSends: Record<Instrument, number> = {} as Record<Instrument, number>;
  const emptyDelaySends: Record<Instrument, number> = {} as Record<Instrument, number>;
  const emptyEqGains: Record<Instrument, { low: number; mid: number; high: number }> = {} as Record<Instrument, { low: number; mid: number; high: number }>;
  const emptyVelocities: Record<Instrument, number[]> = {} as Record<Instrument, number[]>;
  const emptyMutes: Record<Instrument, boolean> = {} as Record<Instrument, boolean>;
  const emptySolos: Record<Instrument, boolean> = {} as Record<Instrument, boolean>;
  
  instruments.forEach(inst => {
    emptyGrid[inst] = new Array(16).fill(false);
    emptyVolumes[inst] = -12;
    emptyReverbSends[inst] = -60;
    emptyDelaySends[inst] = -60;
    emptyEqGains[inst] = { low: 0, mid: 0, high: 0 };
    emptyVelocities[inst] = new Array(16).fill(100); // Default velocity 100/127
    emptyMutes[inst] = false;
    emptySolos[inst] = false;
  });
  
  const defaultParams: InstrumentParams = {
    kick: { tune: 0.05, decay: 0.4, distortion: 0 },
    snare: { tone: 3000, snappy: 0.2 },
    hihat: { decay: 0.2, tone: 3000 },
    clap: { decay: 0.3, tone: 1500 },
    bass: { cutoff: 200, resonance: 2, envMod: 2, decay: 0.2 },
    pad: { attack: 0.3, release: 1.5, cutoff: 2000, detune: 12, distortion: 0 }
  };

  const defaultProModeParams = {
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
  
  return {
    name,
    grid: emptyGrid,
    bassPitches: new Array(16).fill(36),
    padPitches: new Array(16).fill(48),
    padVoicings: new Array(16).fill('single'),
    volumes: emptyVolumes,
    reverbSends: emptyReverbSends,
    delaySends: emptyDelaySends,
    eqGains: emptyEqGains,
    velocities: emptyVelocities,
    params: defaultParams,
    mutes: emptyMutes,
    solos: emptySolos,
    bpm: 120,
    swing: 0,
    proModeParams: defaultProModeParams
  };
};

/**
 * Create 8 empty scenes with default names
 */
export const createDefaultScenes = (): Scene[] => {
  const sceneLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return sceneLabels.map(label => createEmptyScene(`Scene ${label}`));
};

/**
 * Migrate a partial/old scene object to a full Scene object with defaults
 */
const migrateScene = (scene: any): Scene => {
  const defaultScene = createEmptyScene(scene.name || 'Untitled');
  return {
    ...defaultScene,
    ...scene,
    grid: { ...defaultScene.grid, ...(scene.grid || {}) },
    volumes: { ...defaultScene.volumes, ...(scene.volumes || {}) },
    reverbSends: { ...defaultScene.reverbSends, ...(scene.reverbSends || {}) },
    delaySends: { ...defaultScene.delaySends, ...(scene.delaySends || {}) },
    eqGains: { ...defaultScene.eqGains, ...(scene.eqGains || {}) },
    velocities: { ...defaultScene.velocities, ...(scene.velocities || {}) },
    params: { ...defaultScene.params, ...(scene.params || {}) },
    mutes: { ...defaultScene.mutes, ...(scene.mutes || {}) },
    solos: { ...defaultScene.solos, ...(scene.solos || {}) },
    bassPitches: scene.bassPitches || defaultScene.bassPitches,
    padPitches: scene.padPitches || defaultScene.padPitches,
    padVoicings: scene.padVoicings || defaultScene.padVoicings,
    proModeParams: scene.proModeParams ? {
      ...defaultScene.proModeParams!,
      ...scene.proModeParams,
      masterCompressor: { ...defaultScene.proModeParams!.masterCompressor, ...(scene.proModeParams.masterCompressor || {}) },
      tapeChain: { ...defaultScene.proModeParams!.tapeChain, ...(scene.proModeParams.tapeChain || {}) },
      reverb: { ...defaultScene.proModeParams!.reverb, ...(scene.proModeParams.reverb || {}) },
      delay: { ...defaultScene.proModeParams!.delay, ...(scene.proModeParams.delay || {}) },
      trackEnabled: { ...defaultScene.proModeParams!.trackEnabled, ...(scene.proModeParams.trackEnabled || scene.proModeParams.trackVisibility || {}) }
    } : defaultScene.proModeParams
  };
};

/**
 * Save all scenes to localStorage
 */
export const saveScenes = (scenes: Scene[]): void => {
  try {
    const data = JSON.stringify(scenes);
    localStorage.setItem(STORAGE_KEY, data);
  } catch (error) {
    console.error('Failed to save scenes:', error);
  }
};

/**
 * Load scenes from localStorage
 * Returns default empty scenes if none exist
 */
export const loadScenes = (): Scene[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return createDefaultScenes();
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return createDefaultScenes();
    }
    
    // Migrate each scene to ensure all fields are present
    return parsed.map(s => migrateScene(s));
  } catch (error) {
    console.error('Failed to load scenes:', error);
    return createDefaultScenes();
  }
};

/**
 * Export a scene as JSON string
 */
export const exportScene = (scene: Scene): string => {
  return JSON.stringify(scene, null, 2);
};

/**
 * Import a scene from JSON string
 */
export const importScene = (jsonString: string): Scene | null => {
  try {
    const parsed = JSON.parse(jsonString);
    // Basic validation
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid scene format');
    }
    return migrateScene(parsed);
  } catch (error) {
    console.error('Failed to import scene:', error);
    return null;
  }
};

/**
 * Auto-save current scene (debounced in component)
 */
export const autoSave = (scene: Scene): void => {
  try {
    const data = JSON.stringify(scene);
    localStorage.setItem(AUTO_SAVE_KEY, data);
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
};

/**
 * Load auto-saved scene
 */
export const loadAutoSave = (): Scene | null => {
  try {
    const data = localStorage.getItem(AUTO_SAVE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return migrateScene(parsed);
  } catch (error) {
    console.error('Failed to load auto-save:', error);
    return null;
  }
};

/**
 * Download scene as JSON file
 */
export const downloadScene = (scene: Scene): void => {
  const json = exportScene(scene);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${scene.name.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
