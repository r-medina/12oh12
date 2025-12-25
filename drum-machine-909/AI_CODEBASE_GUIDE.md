# AI Codebase Guide - 909 Drum Machine + 303 Bass

This document is designed to help an AI agent (or a human developer) quickly understand the architecture of the 909 Clone + 303 project and perform common tasks like adding features, instruments, or changing logic.

## 📂 Project Structure

```
drum-machine-909/
├── src/
│   ├── audio/
│   │   ├── engine.ts       # 🔊 CORE AUDIO LOGIC. Tone.js setup, synths, effects chain (Tape, Compressor), and the main sequencer loop.
│   │   └── tape.ts         # 📼 Tape saturation and compression chain implementation.
│   ├── components/         # 🧱 UI Components (Visualizer, TrackRow, ProModeControls, PianoRoll, etc.)
│   ├── utils/
│   │   └── storage.ts      # 💾 Persistence logic (localStorage, import/export scenes).
│   ├── App.tsx             # ⚛️ UI LAYER. React state, DOM controls, and interaction handlers.
│   ├── types.ts            # 🏷️ SHARED TYPES. Instrument definitions, Scene interfaces, and state interfaces.
│   ├── index.css           # 🎨 STYLING. Dark mode CSS vars and component styles.
│   └── main.tsx            # Entry point.
└── vite.config.ts          # Build config.
```

## 🧠 Core Architecture (React + Tone.js)

The app uses a **Unidirectional Data Flow** with a synchronized Audio Engine, organized around a **Scene** data model.

1.  **React (`App.tsx`)**: Holds the `Scene[]` state. The active `Scene` object is the source of truth for the pattern (`grid`), playback state, UI toggles (Mute/Solo), parameters (Params), and Pro Mode settings.
2.  **Audio Engine (`engine.ts`)**:
    - **Stateless-ish**: It receives updates via methods like `updateGrid`, `setMute`, `updateBassPitches`, `setProModeParams`.
    - **The Loop**: A `Tone.Sequence` runs every 16th note.
    - **Synchronization**: The loop triggers sound _and_ calls `Tone.Draw.schedule()` to update the UI (step highlighter) in sync with the audio beat.

### The "Lookahead" Invariant

Tone.js schedules audio in the future (`time` parameter).

- **Audio**: Must use `synth.triggerAttackRelease(note, duration, time)`.
- **Visuals**: Must use `Tone.Draw.schedule(callback, time)` to align with the audio.

## 💾 Data Model: The `Scene` Object

All persistent state is grouped into the `Scene` interface (`src/types.ts`). When adding new global or per-step state, it **must** be added here.

```typescript
export interface Scene {
  name: string;
  grid: Record<Instrument, boolean[]>; // Patterns
  bassPitches: number[]; // 303 Per-step pitch
  padPitches: number[]; // Pad Per-step pitch
  padVoicings: string[]; // Pad Per-step voicing
  polyNotes: number[][]; // Poly Per-step notes (Piano Roll)
  velocities: Record<Instrument, number[]>; // Per-step velocity (0-127)
  volumes: Record<Instrument, number>;
  reverbSends: Record<Instrument, number>;
  delaySends: Record<Instrument, number>;
  eqGains: Record<Instrument, { low: number; mid: number; high: number }>;
  params: InstrumentParams; // Synth parameters (ADSR, Filter, etc.)
  mutes: Record<Instrument, boolean>;
  solos: Record<Instrument, boolean>;
  bpm: number;
  swing: number;
  proModeParams?: ProModeParams; // Master FX, Tape, Enablement
}
```

## 🎹 Current Instruments

| Instrument                           | Type                      | Key Features                                                                              |
| :----------------------------------- | :------------------------ | :---------------------------------------------------------------------------------------- |
| **Drums** (Kick, Snare, HiHat, Clap) | Tone.js Primitives        | Dedicated params (tune, decay, tone, snappy). Kick 909 has **Distortion**.                |
| **Bass (303)**                       | `Tone.MonoSynth`          | Sawtooth, Lowpass Filter. **Per-step pitch** (C1-C4) via dropdowns.                       |
| **Pad**                              | `Tone.PolySynth` (Unison) | Lush 3-voice unison. **Per-step pitch** & **Voicing** (chord types like 'minor', 'sus4'). |
| **Poly**                             | `Tone.PolySynth`          | Square wave. **Piano Roll** interface for chords/melodies.                                |

## 🎛️ Audio Chain & Pro Mode

The audio path includes a sophisticated effects chain managed via "Pro Mode":

1.  **Channel Strips**: Volume -> 3-Band EQ -> Sends (Reverb/Delay).
2.  **Sends**: Post-fader user-controllable sends to global Reverb and Delay.
3.  **Master Bus**:
    - `MasterCompressor` (Glue) ->
    - `TapeChain` (Saturation + Compression + Lowpass) ->
    - `Limiter` (Safety)

**Pro Mode Features**:

- **Track Enablement**: Disable tracks entirely to save CPU.
- **Master FX**: detailed controls for Compressor, Reverb, Delay, and Tape Saturation.

## 🛠️ Common Tasks

### 1. Adding a New Instrument (e.g., "Cowbell")

1.  **Update Types**: Add `'cowbell'` to `Instrument` type in `src/types.ts`. Update `Scene` and `InstrumentParams` if needed.
2.  **Initialize State**: In `src/App.tsx`, add default grid, mute, solo, and volume constants.
3.  **Create Synth**: In `src/audio/engine.ts`:
    - Create `const cowbell = new Tone.MetalSynth(...)`.
    - Setup volume node, EQ, and sends (`createChannelEQ`, `connect(reverbPreFilter)`).
4.  **Update Loop**: In `engine.ts` inside `Tone.Sequence`:
    - Add `if (shouldPlay('cowbell') && currentGrid.cowbell[step]) ...`
    - Handle velocity: `getVel('cowbell')`.
5.  **Expose Setters**: Add methods to `AudioEngine` object (e.g., `setCowbellDecay`).
6.  **Add UI**: In `src/App.tsx`, add a `<TrackRow inst="cowbell" ... />`.

### 2. Adding a New Synth Parameter

1.  **Update Types**: Add field to `InstrumentParams` in `src/types.ts`.
2.  **Update Initial State**: Add default value in `INITIAL_PARAMS` in `src/App.tsx`.
3.  **Engine Logic**:
    - Create setter in `AudioEngine` (e.g., `setKickDistortion`).
    - Wire it to the Tone.js node.
4.  **UI Control**:
    - Add `<ScrollableSlider>` or `<Knob>` in the instrument's controls section in `App.tsx`.
    - Wire `onChange` to `handleParamChange`.

### 3. Adding Per-Step Data (e.g., Filter Cutoff Automation)

1.  **Scene Update**: Add `filterAutomation: number[]` to `Scene` interface in `types.ts`.
2.  **App State**: Add `const [filterAutomation, setFilterAutomation] = useState(...)` in `App.tsx`.
3.  **Engine Sync**:
    - Add global `let currentFilterAutomation = ...` in `engine.ts`.
    - Add `updateFilterAutomation(data)` export.
    - Call it in `handleStart` and inside `loadSceneState`.
4.  **Sequencer Loop**:
    - Inside `loop`, access `currentFilterAutomation[step]`.
    - Apply to synth: `synth.filter.frequency.setValueAtTime(val, time)`.

## ⚠️ Gotchas

- **Context Start**: AudioContext only starts after user gesture. `handleStart()` handles this.
- **React Re-renders**: The sequencer loop runs outside React. Do not read React state in the loop; use the synced variables in `engine.ts`.
- **Performance**: Avoid heavy computations in the loop. Pre-calculate values if possible.
- **Lookahead**: Always use `time` passed to the loop callback for scheduling audio, not `Tone.now()`.
- **State Persistence**: If you add new state, you **MUST** add it to the `Scene` object and update `loadSceneState`/`saveScenes` or it will be lost on reload/scene switch.

## 📍 Key Locations

- **Synths & Audio Graph**: `src/audio/engine.ts`
- **Scene Data Structure**: `src/types.ts`
- **Main UI**: `src/App.tsx`
- **Track UI**: `src/components/TrackRow.tsx`
- **Piano Roll**: `src/components/PianoRoll.tsx`
- **Pro Mode Controls**: `src/components/ProModeControls.tsx`
