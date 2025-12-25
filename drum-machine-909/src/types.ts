export type Instrument = "kick" | "snare" | "hihat" | "clap" | "kick909" | "snare909" | "hihat909" | "clap909" | "bass" | "pad";

export const INSTRUMENTS: Instrument[] = ["kick", "snare", "hihat", "clap", "kick909", "snare909", "hihat909", "clap909", "bass", "pad"];

export interface DrumState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  grid: Record<Instrument, boolean[]>;
}

export interface InstrumentParams {
  kick: {
    tune: number;
    decay: number;
  };
  snare: {
    tone: number;
    snappy: number;
  };
  hihat: {
    decay: number;
    tone: number;
  };
  clap: {
    decay: number;
    tone: number;
  };
  bass: {
    cutoff: number;
    resonance: number;
    envMod: number;
    decay: number;
  };
  pad: {
    attack: number;
    release: number;
    cutoff: number;
    detune: number;
    distortion: number;
  };
}

export interface Scene {
  name: string;
  grid: Record<Instrument, boolean[]>;
  bassPitches: number[];
  padPitches: number[];
  padVoicings: string[];
  volumes: Record<Instrument, number>;
  reverbSends: Record<Instrument, number>;
  delaySends: Record<Instrument, number>;
  eqGains: Record<Instrument, { low: number; mid: number; high: number }>;
  params: InstrumentParams;
  mutes: Record<Instrument, boolean>;
  solos: Record<Instrument, boolean>;
  bpm: number;
  swing: number;
}


export interface SceneBank {
  scenes: Scene[];
  activeSceneIndex: number;
}
