# AI Codebase Guide - 909 Drum Machine + 303 Bass

This document is designed to help an AI agent (or a human developer) quickly understand the architecture of the 909 Clone + 303 project and perform common tasks like adding features, instruments, or changing logic.

## 📂 Project Structure

```
drum-machine-909/
├── src/
│   ├── audio/
│   │   └── engine.ts       # 🔊 CORE AUDIO LOGIC. Tone.js setup, synths, and the main sequencer loop.
│   ├── App.tsx             # ⚛️ UI LAYER. React state, DOM controls, and interaction handlers.
│   ├── types.ts            # 🏷️ SHARED TYPES. Instrument definitions and state interfaces.
│   ├── index.css           # 🎨 STYLING. Dark mode CSS vars and component styles.
│   └── main.tsx            # Entry point.
└── vite.config.ts          # Build config.
```

## 🧠 Core Architecture (React + Tone.js)

The app uses a **Unidirectional Data Flow** with a synchronized Audio Engine.

1.  **React (`App.tsx`)**: Holds the source of truth for the pattern (`grid`), playback state, UI toggles (Mute/Solo), and per-step parameters (e.g., `bassPitches`).
2.  **Audio Engine (`engine.ts`)**:
    - **Stateless-ish**: It receives updates via methods like `updateGrid`, `setMute`, `updateBassPitches`.
    - **The Loop**: A `Tone.Sequence` runs every 16th note.
    - **Synchronization**: The loop triggers sound _and_ calls `Tone.Draw.schedule()` to update the UI (step highlighter) in sync with the audio beat.

### The "Lookahead" Invariant

Tone.js schedules audio in the future (`time` parameter).

- **Audio**: Must use `synth.triggerAttackRelease(note, duration, time)`.
- **Visuals**: Must use `Tone.Draw.schedule(callback, time)` to align with the audio.

## 🎹 Current Instruments

### Drum Synths (Kick, Snare, HiHat, Clap)

- Built with Tone.js primitives (MembraneSynth, NoiseSynth, MetalSynth)
- Each has dedicated parameter controls (tune, decay, tone, etc.)

### 303 Bass Synth

- **Type**: `Tone.MonoSynth` with sawtooth oscillator and lowpass filter
- **Special Feature**: **Per-step pitch control** via dropdown selects
- **State**: `bassPitches` array (16 MIDI note values, default C2/36)
- **UI Pattern**: Each step has a `<select>` dropdown showing note names (C1-C4)
- **Audio**: Uses `Tone.Frequency(midiNote, "midi").toFrequency()` to convert MIDI to Hz

## 🛠️ Common Tasks

### 1. Adding a New Instrument (e.g., "Cowbell")

1.  **Update Types**: Add `'cowbell'` to `Instrument` type in `src/types.ts`.
2.  **Initialize State**: In `src/App.tsx`, add default pattern, mute, and solo entries for `cowbell`.
3.  **Create Synth**: In `src/audio/engine.ts`:
    - Create `const cowbell = new Tone.MetalSynth(...)`.
    - Connect it to destination.
4.  **Update Loop**: In `engine.ts` inside `Tone.Sequence`:
    - Add `if (shouldPlay('cowbell') && currentGrid.cowbell[step]) ...`
5.  **Add UI**: In `src/App.tsx`, copy a `.track-container` block and update the mapping/handlers to use `'cowbell'`.

### 2. Adding Per-Step Parameters (Like Bass Pitch)

**Pattern used for 303 bass pitch control:**

1.  **State in App.tsx**:

    ```tsx
    const [bassPitches, setBassPitches] = useState<number[]>(
      new Array(16).fill(36),
    );
    ```

2.  **Handler**:

    ```tsx
    const handleBassPitchChange = (stepIndex: number, val: number) => {
      const newPitches = [...bassPitches];
      newPitches[stepIndex] = val;
      setBassPitches(newPitches);
      AudioEngine.updateBassPitches(newPitches);
    };
    ```

3.  **Engine Method** (`engine.ts`):

    ```tsx
    let currentBassPitches = new Array(16).fill(36);
    export const updateBassPitches = (pitches: number[]) => {
      currentBassPitches = pitches;
    };
    ```

4.  **In Sequencer Loop**:

    ```tsx
    const freq = Tone.Frequency(currentBassPitches[step], "midi").toFrequency();
    bass.triggerAttackRelease(freq, "16n", time);
    ```

5.  **UI** (dropdown select pattern):
    ```tsx
    <div className="bass-step-wrapper">
      <div className="step" {...stepHandlers} />
      <select
        className="note-select"
        value={bassPitches[stepIndex]}
        onChange={(e) =>
          handleBassPitchChange(stepIndex, Number(e.target.value))
        }
      >
        {/* Generate options for MIDI 24-60 (C1-C4) */}
        {Array.from({ length: 37 }, (_, i) => {
          const midi = 24 + i;
          const noteNames = [
            "C",
            "C#",
            "D",
            "D#",
            "E",
            "F",
            "F#",
            "G",
            "G#",
            "A",
            "A#",
            "B",
          ];
          const octave = Math.floor(midi / 12) - 1;
          const noteName = noteNames[midi % 12];
          return (
            <option key={midi} value={midi}>
              {noteName}
              {octave}
            </option>
          );
        })}
      </select>
    </div>
    ```

### 3. Adding a New Parameter Knob

1.  **Expose Setter**: In `src/audio/engine.ts`:
    - Add a function `setCowbellPitch(val: number)`.
    - Update the synth instance inside that function.
2.  **Add Control**: In `src/App.tsx`:
    - Add an `<input type="range" ... onChange={e => AudioEngine.setCowbellPitch(Number(e.target.value))} />`.

### 4. Modifying the Sequencer Logic

- **Logic Location**: Inside `Tone.Sequence` callback in `src/audio/engine.ts`.
- **State Access**: The loop uses local variables `currentGrid`, `currentMutes`, `currentSolos`, `currentBassPitches` which are updated via exported setters. **Do not** try to read React state directly inside the loop.

## ⚠️ Gotchas

- **Browsers & AudioContext**: AudioContext only starts after a user gesture. `App.tsx` handles this in `handleStart()`.
- **React Re-renders**: The sequencer loop runs outside React's render cycle. We use `setStepCallback` to push the current step index back to React for the visualizer.
- **Tone.js Imports**: Always check if a Tone.js class needs `.toDestination()` or `.connect()`.
- **Per-Step State**: When adding per-step parameters, remember to sync them to the engine on `handleStart()` (see how `bassPitches` is synced).

## 📍 Key Locations

- **Synths**: `src/audio/engine.ts` (Lines 1-80). Includes kick, snare, hihat, clap, and bass (303).
- **Sequencer Loop**: `src/audio/engine.ts` (~Lines 100-150)
- **Track UI Rendering**: `src/App.tsx` (Look for `.sequencer-grid`)
- **Bass UI Pattern**: `src/App.tsx` (Search for `.bass-steps-container` and `.note-select`)
- **Bass Styles**: `src/index.css` (Bottom section, "Bass 303 Per-Step Pitch")

## 🎛️ 303 Bass Controls

| Control          | Range      | Description                           |
| ---------------- | ---------- | ------------------------------------- |
| Cutoff           | 50-5000 Hz | Filter cutoff frequency               |
| Res              | 0-20       | Filter resonance (Q factor)           |
| Env Mod          | 0-8        | Envelope modulation depth on filter   |
| Decay            | 0.1-2.0s   | Note and filter envelope decay time   |
| Pitch (per-step) | C1-C4      | Individual note per step via dropdown |
