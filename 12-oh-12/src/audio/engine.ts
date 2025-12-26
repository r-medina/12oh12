import * as Tone from 'tone';
import type { Instrument } from '../types';
import { TapeChain } from './tape';

// -- Analyser & Master --
const analyser = new Tone.Analyser('fft', 128);
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
// High-pass filters BEFORE sends (150Hz) - prevents low-end mud in effects
const reverbPreFilter = new Tone.Filter(150, "highpass");
const delayPreFilter = new Tone.Filter(150, "highpass");

const reverb = new Tone.Reverb({
  decay: 4.0,
  preDelay: 0.05,
  wet: 1.0 // Send effect, so full wet on the bus
});
const reverbToneFilter = new Tone.Filter(600, "highpass"); // Existing tone shaping
const reverbPostFilter = new Tone.Filter(95, "highpass"); // Post-effect HPF
reverbPreFilter.connect(reverb);
reverb.chain(reverbToneFilter, reverbPostFilter, masterVol);
reverb.generate(); // Required for Reverb to start working

const delay = new Tone.FeedbackDelay({
  delayTime: "8n.",
  feedback: 0.4,
  wet: 1.0 // Send effect
});
const delayPostFilter = new Tone.Filter(95, "highpass"); // Post-effect HPF
delayPreFilter.connect(delay);
delay.chain(delayPostFilter, masterVol);

// -- Volume Nodes --
// Connect individual channels to masterVol instead of Destination
const kickVol = new Tone.Volume(0);
const snareVol = new Tone.Volume(0);
const hihatVol = new Tone.Volume(0);
const clapVol = new Tone.Volume(0);
const bassVol = new Tone.Volume(0);
const padVol = new Tone.Volume(0);
const polyVol = new Tone.Volume(0);

// -- 3-Band EQ Per Channel --
// EQ bands: Low shelf 300Hz, Mid peaking 1kHz, High shelf 3kHz
// Each with adjustable gain (-12dB to +12dB)

interface ChannelEQ {
  low: Tone.Filter;
  mid: Tone.Filter;
  high: Tone.Filter;
  lowGain: Tone.Gain;
  midGain: Tone.Gain;
  highGain: Tone.Gain;
}

const createChannelEQ = (inputNode: Tone.Volume): ChannelEQ => {
  // Low shelf filter (300Hz)
  const low = new Tone.Filter({ type: 'lowshelf', frequency: 300, gain: 0 });
  // Mid peaking filter (1kHz)  
  const mid = new Tone.Filter({ type: 'peaking', frequency: 1000, Q: 1, gain: 0 });
  // High shelf filter (3kHz)
  const high = new Tone.Filter({ type: 'highshelf', frequency: 3000, gain: 0 });
  
  // Gains for each band (since Filter.gain may not be adjustable post-creation in all modes)
  const lowGain = new Tone.Gain(1);
  const midGain = new Tone.Gain(1);
  const highGain = new Tone.Gain(1);
  
  // Chain: inputNode -> low -> mid -> high -> masterVol
  inputNode.connect(low);
  low.connect(mid);
  mid.connect(high);
  high.connect(masterVol);
  
  return { low, mid, high, lowGain, midGain, highGain };
};

// Create EQ for each channel
const kickEQ = createChannelEQ(kickVol);
const snareEQ = createChannelEQ(snareVol);
const hihatEQ = createChannelEQ(hihatVol);
const clapEQ = createChannelEQ(clapVol);
const bassEQ = createChannelEQ(bassVol);
const padEQ = createChannelEQ(padVol);
const polyEQ = createChannelEQ(polyVol);


// -- Send Nodes --
// Connect Channel Volume -> Send Gain -> Pre-Filter (150Hz HPF) -> Effects
const kickReverbSend = new Tone.Gain(0).connect(reverbPreFilter);
const kickDelaySend = new Tone.Gain(0).connect(delayPreFilter);
kickVol.connect(kickReverbSend);
kickVol.connect(kickDelaySend);

const snareReverbSend = new Tone.Gain(0).connect(reverbPreFilter);
const snareDelaySend = new Tone.Gain(0).connect(delayPreFilter);
snareVol.connect(snareReverbSend);
snareVol.connect(snareDelaySend);

const hihatReverbSend = new Tone.Gain(0).connect(reverbPreFilter);
const hihatDelaySend = new Tone.Gain(0).connect(delayPreFilter);
hihatVol.connect(hihatReverbSend);
hihatVol.connect(hihatDelaySend);

const clapReverbSend = new Tone.Gain(0).connect(reverbPreFilter);
const clapDelaySend = new Tone.Gain(0).connect(delayPreFilter);
clapVol.connect(clapReverbSend);
clapVol.connect(clapDelaySend);

const bassReverbSend = new Tone.Gain(0).connect(reverbPreFilter);
const bassDelaySend = new Tone.Gain(0).connect(delayPreFilter);
bassVol.connect(bassReverbSend);
bassVol.connect(bassDelaySend);

const padReverbSend = new Tone.Gain(0).connect(reverbPreFilter);
const padDelaySend = new Tone.Gain(0).connect(delayPreFilter);
padVol.connect(padReverbSend);
padVol.connect(padDelaySend);

const polyReverbSend = new Tone.Gain(0).connect(reverbPreFilter);
const polyDelaySend = new Tone.Gain(0).connect(delayPreFilter);
polyVol.connect(polyReverbSend);
polyVol.connect(polyDelaySend);


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
});

const kickDistortion = new Tone.Distortion(0).connect(kickVol);
kick.connect(kickDistortion);

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
});

const clapFilter = new Tone.Filter({
  type: "bandpass",
  frequency: 1500,
  Q: 1
}).connect(clapVol);

clap.connect(clapFilter);

// -- 303 Synth --
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

// -- Pad Synth (PolySynth with Unison for chords) --
type PadVoicing = 'single' | 'octave' | 'fifth' | 'major' | 'minor' | 'sus2' | 'sus4';


const getChordNotes = (root: number, voicing: PadVoicing): string[] => {
  let midiNotes: number[];
  switch(voicing) {
    case 'single': midiNotes = [root]; break;
    case 'octave': midiNotes = [root, root + 12]; break;
    case 'fifth': midiNotes = [root, root + 7]; break;
    case 'major': midiNotes = [root, root + 4, root + 7]; break;
    case 'minor': midiNotes = [root, root + 3, root + 7]; break;
    case 'sus2': midiNotes = [root, root + 2, root + 7]; break;
    case 'sus4': midiNotes = [root, root + 5, root + 7]; break;
    default: midiNotes = [root];
  }
  return midiNotes.map(m => Tone.Frequency(m, 'midi').toNote());
};



// Distortion for Pad
const padDistortion = new Tone.Distortion({
  distortion: 0,
  wet: 1.0
});

const padFilter = new Tone.Filter({
  type: 'lowpass',
  frequency: 2000,
  Q: 1
}).connect(padVol);

// Unison: 3 detuned voices for lush sound
const padEnvelopeSettings = {
  attack: 0.3,
  decay: 0.5,
  sustain: 0.8,
  release: 1.5
};

const padVoice1 = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope: padEnvelopeSettings
}).connect(padDistortion);

const padVoice2 = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope: padEnvelopeSettings
}).connect(padDistortion);
padVoice2.set({ detune: 12 }); // +12 cents

const padVoice3 = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope: padEnvelopeSettings
}).connect(padDistortion);
padVoice3.set({ detune: -12 }); // -12 cents

// Chain: padVoices -> distortion -> filter -> volume
padDistortion.connect(padFilter);


// -- Poly Synth (Square wave for classic poly sound) --
const polyFilter = new Tone.Filter({
  type: 'lowpass',
  frequency: 2000,
  Q: 1
}).connect(polyVol);

// PolySynth with 4 voices
const poly = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'square' },
  envelope: {
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 1.0
  }
}).connect(polyFilter);

// Trigger poly voices
const triggerPoly = (notes: string[], duration: string, time: number, velocity: number) => {
  poly.triggerAttackRelease(notes, duration, time, velocity);
};


// Trigger all pad voices (unison)
const triggerPadVoices = (notes: string[], duration: string, time: number, velocity: number) => {
  padVoice1.triggerAttackRelease(notes, duration, time, velocity);
  padVoice2.triggerAttackRelease(notes, duration, time, velocity);
  padVoice3.triggerAttackRelease(notes, duration, time, velocity);
};

// Keep track of per-step bass pitches (MIDI note numbers, default C2=36)
let currentBassPitches: number[] = new Array(16).fill(36);

// Keep track of per-step pad pitches (MIDI note numbers, default C3=48) and voicings
let currentPadPitches: number[] = new Array(16).fill(48);
let currentPadVoicings: PadVoicing[] = new Array(16).fill('single');
// Cache for the calculated note names to avoid doing math in the hot loop
let currentPadNoteNames: string[][] = new Array(16).fill([]);

// Initialize cache
const updatePadCache = () => {
    for (let i = 0; i < 16; i++) {
        currentPadNoteNames[i] = getChordNotes(currentPadPitches[i], currentPadVoicings[i]);
    }
};
// Initial calculation
updatePadCache();

// Keep track of per-step poly notes (array of MIDI notes per step)
let currentPolyNotes: number[][] = new Array(16).fill([]);

// Keep track of per-step velocities (0-127)
let currentVelocities: Record<Instrument, number[]> = {
  kick: new Array(16).fill(100), snare: new Array(16).fill(100), hihat: new Array(16).fill(100), clap: new Array(16).fill(100),
  kick909: [], snare909: [], hihat909: [], clap909: [],
  bass: new Array(16).fill(100), pad: new Array(16).fill(100), poly: new Array(16).fill(100)
};

// -- Sequencer State --
// We keep a mutable reference to the grid so the repeat loop can read it without restarts
let currentGrid: Record<Instrument, boolean[]> = {
  kick: [], snare: [], hihat: [], clap: [], 
  kick909: [], snare909: [], hihat909: [], clap909: [],
  bass: [], pad: [], poly: []
};
let currentMutes: Record<Instrument, boolean> = {
  kick: false, snare: false, hihat: false, clap: false,
  kick909: false, snare909: false, hihat909: false, clap909: false,
  bass: false, pad: false, poly: false
};
let currentSolos: Record<Instrument, boolean> = {
  kick: false, snare: false, hihat: false, clap: false,
  kick909: false, snare909: false, hihat909: false, clap909: false,
  bass: false, pad: false, poly: false
};
let currentEnabledTracks: Record<Instrument, boolean> = {
  kick: true, snare: true, hihat: true, clap: true,
  kick909: true, snare909: true, hihat909: true, clap909: true,
  bass: true, pad: true, poly: true
};
let setStepCallback: (step: number) => void = () => {};

// -- Loop --
const loop = new Tone.Sequence(
  (time, step) => {
    // Determine if any track is soloed
    const isAnySolo = Object.values(currentSolos).some(v => v);

    const shouldPlay = (inst: Instrument) => {
      if (!currentEnabledTracks[inst]) return false;
      if (isAnySolo) {
        return currentSolos[inst];
      }
      return !currentMutes[inst];
    };

    // 1. Trigger Sounds
    // Velocity: 0-127 -> 0.0-1.0
    const getVel = (inst: Instrument) => (currentVelocities[inst]?.[step] ?? 100) / 127;

    if (shouldPlay('kick') && currentGrid.kick[step]) kick.triggerAttackRelease('C1', '8n', time, getVel('kick'));
    if (shouldPlay('snare') && currentGrid.snare[step]) snare.triggerAttackRelease('8n', time, getVel('snare'));
    // Hihat already used 0.6 fixed, now use dynamic
    if (shouldPlay('hihat') && currentGrid.hihat[step]) hihat.triggerAttackRelease('C6', '8n', time, getVel('hihat'));
    if (shouldPlay('clap') && currentGrid.clap[step]) clap.triggerAttackRelease('8n', time, getVel('clap'));
    
    // Trigger Bass
    if (shouldPlay('bass') && currentGrid.bass[step]) {
      const note = Tone.Frequency(currentBassPitches[step], "midi").toNote();
      bass.triggerAttackRelease(note, '16n', time, getVel('bass'));
    }

    if (shouldPlay('pad') && currentGrid.pad[step]) {
      // Use cached note names
      const chordNotes = currentPadNoteNames[step];
      triggerPadVoices(chordNotes, '8n', time, getVel('pad'));
    }

    // Trigger Poly
    if (shouldPlay('poly') && currentGrid.poly[step]) {
      const notes = currentPolyNotes[step];
      if (notes && notes.length > 0) {
        const noteNames = notes.map(n => Tone.Frequency(n, "midi").toNote());
        triggerPoly(noteNames, '8n', time, getVel('poly'));
      }
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
    // Force native AudioContext to ensure compatibility with native AudioWorkletNode
    // This avoids Tone.js / standardized-audio-context wrappers causing type mismatches
    let nativeCtx: BaseAudioContext | undefined;
    if (!Tone.context || !(Tone.context.rawContext instanceof BaseAudioContext)) {
        nativeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        Tone.setContext(nativeCtx);
    } else {
        nativeCtx = Tone.context.rawContext as BaseAudioContext;
    }

    await Tone.start();
    // Initialize WASM Tape Chain
    await tapeChain.init(nativeCtx);
    console.log('Audio Context Started');
  },

  updateGrid: (grid: Record<Instrument, boolean[]>) => {
    currentGrid = grid;
  },
  
  updateBassPitches: (pitches: number[]) => {
    currentBassPitches = pitches;
  },

  updatePadPitches: (pitches: number[]) => {
    currentPadPitches = pitches;
    updatePadCache();
  },

  updateVelocities: (velocities: Record<Instrument, number[]>) => {
    currentVelocities = velocities;
  },

  updatePadVoicings: (voicings: string[]) => {
    currentPadVoicings = voicings as PadVoicing[];
    updatePadCache();
  },

  updatePolyNotes: (notes: number[][]) => {
    currentPolyNotes = notes;
  },

  setBpm: (bpm: number) => {
    Tone.Transport.bpm.value = bpm;
  },

  togglePlay: (isPlaying: boolean) => {
    if (isPlaying) {
      if (Tone.context.state !== 'running') Tone.start();
      // Guard against double-start
      if (loop.state === 'started') return;
      
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

  resetMutesSolos: () => {
    // Reset internal engine state for mutes/solos to defaults
    // This allows a clean sync from React
    Object.keys(currentMutes).forEach(k => {
        currentMutes[k as Instrument] = false;
    });
    Object.keys(currentSolos).forEach(k => {
        currentSolos[k as Instrument] = false;
    });
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
  setKickDistortion: (val: number) => {
    kickDistortion.distortion = val;
    kickDistortion.wet.value = val > 0 ? 1 : 0;
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
  setClapTone: (val: number) => {
    clapFilter.frequency.value = val;
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

  // Pad Controls
  setPadAttack: (val: number) => {
    padVoice1.set({ envelope: { attack: val } });
    padVoice2.set({ envelope: { attack: val } });
    padVoice3.set({ envelope: { attack: val } });
  },
  setPadRelease: (val: number) => {
    padVoice1.set({ envelope: { release: val } });
    padVoice2.set({ envelope: { release: val } });
    padVoice3.set({ envelope: { release: val } });
  },
  setPadFilterCutoff: (val: number) => {
    padFilter.frequency.value = val;
  },
  setPadDistortion: (val: number) => {
    padDistortion.distortion = val;
  },
  setPadDetune: (cents: number) => {
    padVoice2.set({ detune: cents });
    padVoice3.set({ detune: -cents });
  },

  // Poly Controls
  setPolyAttack: (val: number) => {
    poly.set({ envelope: { attack: val } });
  },
  setPolyDecay: (val: number) => {
    poly.set({ envelope: { decay: val } });
  },
  setPolySustain: (val: number) => {
    poly.set({ envelope: { sustain: val } });
  },
  setPolyRelease: (val: number) => {
    poly.set({ envelope: { release: val } });
  },
  setPolyFilter: (val: number) => {
    polyFilter.frequency.value = val;
  },
  setPolyDetune: (val: number) => {
    poly.set({ detune: val });
  },
  setPolyOscillator: (type: 'sawtooth' | 'square' | 'triangle') => {
    poly.set({ oscillator: { type } });
  },

  // 3-Band EQ Per Channel
  // band: 'low' | 'mid' | 'high', val: gain in dB (-12 to +12)
  setChannelEQ: (inst: Instrument, band: 'low' | 'mid' | 'high', val: number) => {
    const eqMap: Record<string, ChannelEQ> = {
      kick: kickEQ,
      snare: snareEQ,
      hihat: hihatEQ,
      clap: clapEQ,
      bass: bassEQ,
      pad: padEQ,
      poly: polyEQ
    };
    const eq = eqMap[inst];
    if (!eq) return;
    
    // Tone.Filter with shelf/peaking types supports .gain property
    if (band === 'low') eq.low.set({ gain: val });
    if (band === 'mid') eq.mid.set({ gain: val });
    if (band === 'high') eq.high.set({ gain: val });
  },

  // Volume
  setVolume: (inst: Instrument, val: number) => {
    const volMap: Partial<Record<Instrument, Tone.Volume>> = {
      kick: kickVol,
      snare: snareVol,
      hihat: hihatVol,
      clap: clapVol,
      bass: bassVol,
      pad: padVol,
      poly: polyVol
    };
    const volNode = volMap[inst];
    if (volNode) {
      volNode.volume.value = val;
    }
  },

  // Rev/Delay Sends
  setReverbSend: (inst: Instrument, val: number) => {
     const sendMap: Partial<Record<Instrument, Tone.Gain>> = {
       kick: kickReverbSend,
       snare: snareReverbSend,
       hihat: hihatReverbSend,
       clap: clapReverbSend,
       bass: bassReverbSend,
       pad: padReverbSend,
       poly: polyReverbSend
     };
     const sendNode = sendMap[inst];
     if (!sendNode) return;

     const linear = (typeof val !== 'number' || isNaN(val) || val <= -60) ? 0 : Tone.dbToGain(val);
     sendNode.gain.rampTo(linear, 0.05);
  },
  setDelaySend: (inst: Instrument, val: number) => {
     const sendMap: Partial<Record<Instrument, Tone.Gain>> = {
       kick: kickDelaySend,
       snare: snareDelaySend,
       hihat: hihatDelaySend,
       clap: clapDelaySend,
       bass: bassDelaySend,
       pad: padDelaySend,
       poly: polyDelaySend
     };
     const sendNode = sendMap[inst];
     if (!sendNode) return;

     const linear = (typeof val !== 'number' || isNaN(val) || val <= -60) ? 0 : Tone.dbToGain(val);
     sendNode.gain.rampTo(linear, 0.05);
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
  },

  // Pro Mode Controls
  // Master Volume
  setMasterVolume: (val: number) => {
    masterVol.volume.value = val;
  },

  // Master Compressor
  setMasterCompressorThreshold: (val: number) => {
    masterCompressor.threshold.value = val;
  },
  setMasterCompressorRatio: (val: number) => {
    masterCompressor.ratio.value = val;
  },
  setMasterCompressorAttack: (val: number) => {
    masterCompressor.attack.value = val;
  },
  setMasterCompressorRelease: (val: number) => {
    masterCompressor.release.value = val;
  },

  // Tape Chain
  setTapeBypass: (bypass: boolean) => {
    tapeChain.setBypass(bypass);
  },
  setTapeCompressorThreshold: (val: number) => {
    tapeChain.setCompressorThreshold(val);
  },
  setTapeCompressorRatio: (val: number) => {
    tapeChain.setCompressorRatio(val);
  },
  setTapeCompressorAttack: (val: number) => {
    tapeChain.setCompressorAttack(val);
  },
  setTapeCompressorRelease: (val: number) => {
    tapeChain.setCompressorRelease(val);
  },
  setTapeDistortion: (val: number) => {
    tapeChain.setDistortion(val);
  },
  setTapeFilterCutoff: (val: number) => {
    tapeChain.setFilterCutoff(val);
  },

  // Reverb
  setReverbDecay: (val: number) => {
    reverb.decay = val;
  },
  setReverbPreDelay: (val: number) => {
    reverb.preDelay = val;
  },
  setReverbToneFilter: (val: number) => {
    reverbToneFilter.frequency.value = val;
  },
  setReverbPreFilter: (val: number) => {
    reverbPreFilter.frequency.value = val;
  },
  setReverbPostFilter: (val: number) => {
    reverbPostFilter.frequency.value = val;
  },

  // Delay
  setDelayTime: (val: string) => {
    delay.delayTime.value = val;
  },
  setDelayFeedback: (val: number) => {
    delay.feedback.value = val;
  },
  setDelayPreFilter: (val: number) => {
    delayPreFilter.frequency.value = val;
  },
  setDelayPostFilter: (val: number) => {
    delayPostFilter.frequency.value = val;
  },

  // Bypass controls
  setMasterCompressorBypass: (bypass: boolean) => {
    // Tone.js doesn't have a built-in bypass, so we'll use wet/dry or connect/disconnect
    // For now, we can set the threshold very high to effectively disable it
    if (bypass) {
      masterCompressor.threshold.value = 0; // No compression
      masterCompressor.ratio.value = 1; // 1:1 ratio = no compression
    }
    // When un-bypassed, the current settings will be re-applied by the handler
  },
  setReverbBypass: (bypass: boolean) => {
    reverb.wet.value = bypass ? 0 : 1;
  },
  setDelayBypass: (bypass: boolean) => {
    delay.wet.value = bypass ? 0 : 1;
  },
  setTrackEnabled: (inst: Instrument, enabled: boolean) => {
    currentEnabledTracks[inst] = enabled;
  }
};
