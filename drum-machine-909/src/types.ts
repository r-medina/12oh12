export type Instrument = "kick" | "snare" | "hihat" | "clap" | "kick909" | "snare909" | "hihat909" | "clap909" | "bass" | "pad";

export const INSTRUMENTS: Instrument[] = ["kick", "snare", "hihat", "clap", "kick909", "snare909", "hihat909", "clap909", "bass", "pad"];

export interface DrumState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  grid: Record<Instrument, boolean[]>;
}
