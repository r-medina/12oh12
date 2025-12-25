import * as Tone from 'tone';
import type { Instrument } from '../types';
import { TapeChain } from './tape';

// -- Analyser & Master --
const analyser = new Tone.Analyser('fft', 64);
const masterVol = new Tone.Volume(0);
const tapeChain = new TapeChain();
const meter = new Tone.Meter();

// Chain: masterVol -> MasterCompressor -> TapeChain -> Analyser -> Meter -> Destination
const masterCompressor = new Tone.Compressor({
  threshold: -20,
  ratio: 2,
  attack: 0.05,
  release: 0.2
});

masterVol.connect(masterCompressor);
masterCompressor.connect(tapeChain.input);
tapeChain.output.connect(analyser);
analyser.connect(meter);
meter.toDestination();


// -- Effects --
const reverb = new Tone.Reverb({
  decay: 4.0,
  preDelay: 0.05,
  wet: 1.0 // Send effect, so full wet on the bus
});
const reverbFilter = new Tone.Filter(600, "highpass");
reverb.chain(reverbFilter, masterVol);
reverb.generate(); // Required for Reverb to start working

const delay = new Tone.FeedbackDelay({
  delayTime: "8n.",
  feedback: 0.4,
  wet: 1.0 // Send effect
}).connect(masterVol);

// -- Volume Nodes --
// Connect individual channels to masterVol instead of Destination
const kickVol = new Tone.Volume(0).connect(masterVol);
const snareVol = new Tone.Volume(0).connect(masterVol);
const hihatVol = new Tone.Volume(0).connect(masterVol);
const clapVol = new Tone.Volume(0).connect(masterVol);
const bassVol = new Tone.Volume(0).connect(masterVol);

// -- Send Nodes --
// We create a specific Gain node for each send to control the level
// Connect Channel Volume -> Send Gain -> Effect Bus
const kickReverbSend = new Tone.Gain(0).connect(reverb);
const kickDelaySend = new Tone.Gain(0).connect(delay);
kickVol.connect(kickReverbSend);
kickVol.connect(kickDelaySend);

const snareReverbSend = new Tone.Gain(0).connect(reverb);
const snareDelaySend = new Tone.Gain(0).connect(delay);
snareVol.connect(snareReverbSend);
snareVol.connect(snareDelaySend);

const hihatReverbSend = new Tone.Gain(0).connect(reverb);
const hihatDelaySend = new Tone.Gain(0).connect(delay);
hihatVol.connect(hihatReverbSend);
hihatVol.connect(hihatDelaySend);

const clapReverbSend = new Tone.Gain(0).connect(reverb);
const clapDelaySend = new Tone.Gain(0).connect(delay);
clapVol.connect(clapReverbSend);
clapVol.connect(clapDelaySend);

const bassReverbSend = new Tone.Gain(0).connect(reverb);
const bassDelaySend = new Tone.Gain(0).connect(delay);
bassVol.connect(bassReverbSend);
bassVol.connect(bassDelaySend);


// -- 909-ish Synth Setup --
const kick = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 10,
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.001,
    decay: 0.4,
    sustain: 0.01,
    release: 1.4,
    attackCurve: 'exponential'
  }
}).connect(kickVol);

const snare = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: {
    attack: 0.001,
    decay: 0.2,
    sustain: 0
  }
}).connect(snareVol);

// Filter for Snare to give it body
const snareFilter = new Tone.Filter({
  type: 'lowpass',
  frequency: 3000
}).connect(snareVol);
snare.connect(snareFilter);

const hihat = new Tone.MetalSynth({
  envelope: {
    attack: 0.001,
    decay: 0.2,
    release: 0.2
  },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5
});
hihat.frequency.value = 400;

// Hihats usually highpass - set a better frequency and connect
const hatFilter = new Tone.Filter(3000, "highpass").connect(hihatVol);
hihat.connect(hatFilter);

// Clap is trickier, simplified as noise burst with reverb
const clap = new Tone.NoiseSynth({
  noise: { type: 'pink'},
  envelope: {
    attack: 0.001,
    decay: 0.3,
    sustain: 0
  }
}).connect(clapVol);

// -- 303 Bass Synth --
const bass = new Tone.MonoSynth({
  oscillator: {
    type: "sawtooth"
  },
  envelope: {
    attack: 0.001,
    decay: 0.2,
    sustain: 0.0,
    release: 0.2
  },
  filterEnvelope: {
    attack: 0.001,
    decay: 0.2,
    sustain: 0.0,
    release: 0.2,
    baseFrequency: 200,
    octaves: 4,
    exponent: 2
  }
}).connect(bassVol);

// Keep track of per-step bass pitches (MIDI note numbers, default C2=36)
let currentBassPitches: number[] = new Array(16).fill(36);

// -- Sequencer State --
// We keep a mutable reference to the grid so the repeat loop can read it without restarts
let currentGrid: Record<Instrument, boolean[]> = {
  kick: [], snare: [], hihat: [], clap: [], 
  kick909: [], snare909: [], hihat909: [], clap909: [],
  bass: []
};
let currentMutes: Record<Instrument, boolean> = {
  kick: false, snare: false, hihat: false, clap: false,
  kick909: false, snare909: false, hihat909: false, clap909: false,
  bass: false
};
let currentSolos: Record<Instrument, boolean> = {
  kick: false, snare: false, hihat: false, clap: false,
  kick909: false, snare909: false, hihat909: false, clap909: false,
  bass: false
};
let setStepCallback: (step: number) => void = () => {};

// -- Loop --
const loop = new Tone.Sequence(
  (time, step) => {
    // Determine if any track is soloed
    const isAnySolo = Object.values(currentSolos).some(v => v);

    const shouldPlay = (inst: Instrument) => {
      if (isAnySolo) {
        return currentSolos[inst];
      }
      return !currentMutes[inst];
    };

    // 1. Trigger Sounds
    if (shouldPlay('kick') && currentGrid.kick[step]) kick.triggerAttackRelease('C1', '8n', time);
    if (shouldPlay('snare') && currentGrid.snare[step]) snare.triggerAttackRelease('8n', time);
    // Note: MetalSynth.triggerAttackRelease needs velocity as 3rd arg in some versions or just time. 
    // Typescript definition says (note, duration, time, velocity). 
    // We stick to the existing valid call: 'C6', '32n', time, 0.6
    if (shouldPlay('hihat') && currentGrid.hihat[step]) hihat.triggerAttackRelease('C6', '8n', time, 0.6);
    if (shouldPlay('clap') && currentGrid.clap[step]) clap.triggerAttackRelease('8n', time);
    
    // Trigger Bass
    if (shouldPlay('bass') && currentGrid.bass[step]) {
      const note = Tone.Frequency(currentBassPitches[step], "midi").toNote();
      bass.triggerAttackRelease(note, '16n', time);
    }

    // 2. Update UI
    Tone.Draw.schedule(() => {
      setStepCallback(step);
    }, time);
  },
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  "16n"
);

export const AudioEngine = {
  init: async () => {
    await Tone.start();
    console.log('Audio Context Started');
  },

  updateGrid: (grid: Record<Instrument, boolean[]>) => {
    currentGrid = grid;
  },
  
  updateBassPitches: (pitches: number[]) => {
    currentBassPitches = pitches;
  },

  setBpm: (bpm: number) => {
    Tone.Transport.bpm.value = bpm;
  },

  togglePlay: (isPlaying: boolean) => {
    if (isPlaying) {
      if (Tone.context.state !== 'running') Tone.start();
      Tone.Transport.start();
      loop.start(0);
    } else {
      Tone.Transport.stop();
      loop.stop();
      // Reset step visual
      setStepCallback(0); 
    }
  },

  onStep: (cb: (step: number) => void) => {
    setStepCallback = cb;
  },

  // -- Parameters --
  setSwing: (value: number) => {
    // Tone.Transport.swing = 0 to 1
    Tone.Transport.swing = value;
    Tone.Transport.swingSubdivision = '16n';
  },

  // Kick
  setKickPitchDecay: (val: number) => {
    kick.pitchDecay = val;
  },
  setKickDecay: (val: number) => {
    kick.envelope.decay = val;
  },

  // Snare
  setSnareTone: (val: number) => {
    snareFilter.frequency.value = val;
  },
  setSnareDecay: (val: number) => {
    snare.envelope.decay = val;
  },

  // HiHat
  setHiHatDecay: (val: number) => {
    hihat.envelope.decay = val;
  },
  setHiHatTone: (val: number) => {
    hatFilter.frequency.value = val;
  },

  // Clap
  setClapDecay: (val: number) => {
    clap.envelope.decay = val;
  },

  // Bass (303) Controls
  setBassCutoff: (val: number) => {
    // In MonoSynth, the filter envelope baseFrequency sets the cutoff
    bass.filterEnvelope.baseFrequency = val;
  },
  setBassResonance: (val: number) => {
    bass.filter.Q.value = val;
  },
  setBassDecay: (val: number) => {
    // Both amp and filter decay
    bass.envelope.decay = val;
    bass.filterEnvelope.decay = val;
  },
  setBassEnvMod: (val: number) => {
    bass.filterEnvelope.octaves = val;
  },
  /* Deprecated: using per-step pitch now
  setBassPitch: (val: number) => {
    // currentBassNote = Tone.Frequency(val, "hz").toNote();
  }, */

  // Mute/Solo
  setMute: (inst: Instrument, val: boolean) => {
    currentMutes[inst] = val;
  },
  setSolo: (inst: Instrument, val: boolean) => {
    currentSolos[inst] = val;
  },

  // Volume
  setVolume: (inst: Instrument, val: number) => {
    if (inst === 'kick') kickVol.volume.value = val;
    if (inst === 'snare') snareVol.volume.value = val;
    if (inst === 'hihat') hihatVol.volume.value = val;
    if (inst === 'clap') clapVol.volume.value = val;
    if (inst === 'bass') bassVol.volume.value = val;
  },

  // Rev/Delay Sends
  setReverbSend: (inst: Instrument, val: number) => {
     // val is in dB, we can set gain.value using Tone.dbToGain or similar if needed,
     // but Tone.Gain.gain is 0-1 linear usually, OR Tone.Gain has a 'gain' param which is signal-rate.
     // However, Tone.Gain does NOT wrap AudioParam in decibels by default. 
     // We can use Tone.Gain(0, "decibels") or just set volume.value if it was a Volume node.
     // I initialized them as Gain(0), which means 0 linear gain (silent). 
     // Let's assume input val is decibels like the implementation plan said (-60 to 0).
     // We need to convert db to gain.
     const linear = val <= -60 ? 0 : Tone.dbToGain(val);
     
     if (inst === 'kick') kickReverbSend.gain.rampTo(linear, 0.1);
     if (inst === 'snare') snareReverbSend.gain.rampTo(linear, 0.1);
     if (inst === 'hihat') hihatReverbSend.gain.rampTo(linear, 0.1);
     if (inst === 'clap') clapReverbSend.gain.rampTo(linear, 0.1);
     if (inst === 'bass') bassReverbSend.gain.rampTo(linear, 0.1);
  },
  setDelaySend: (inst: Instrument, val: number) => {
     const linear = val <= -60 ? 0 : Tone.dbToGain(val);
     
     if (inst === 'kick') kickDelaySend.gain.rampTo(linear, 0.1);
     if (inst === 'snare') snareDelaySend.gain.rampTo(linear, 0.1);
     if (inst === 'hihat') hihatDelaySend.gain.rampTo(linear, 0.1);
     if (inst === 'clap') clapDelaySend.gain.rampTo(linear, 0.1);
     if (inst === 'bass') bassDelaySend.gain.rampTo(linear, 0.1);
  },

  // Visualizer
  getFrequencyData: () => {
    if (!analyser) return new Uint8Array(0);
    return analyser.getValue(); // Returns Float32Array for 'waveform' or 'fft' 
    // BUT we used 'fft'. wait, Tone.Analyser.getValue() returns Float32Array of dB usually.
    // Let's verify return type. Tone.Analyser types are a bit flexible. 
    // For visualizer we often want accessible bytes or floats. 
  },
  
  // Directly expose the analyser for advanced usage if needed, 
  // or a helper method to fill a buffer to avoid GC if possible.
  // Actually Tone.js getValue returns the buffer.
  getAnalyser: () => analyser,

  getMasterLevel: () => {
    return meter.getValue(); // Returns number (decibels)
  }
};
