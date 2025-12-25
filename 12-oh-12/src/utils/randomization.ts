import type { Instrument } from '../types';

/**
 * Randomize a track with musical intelligence
 * @param instrument - The instrument to randomize
 * @param density - How filled the pattern should be (0-1)
 * @returns Array of 16 booleans representing the pattern
 */
export const randomizeTrack = (instrument: Instrument, density: number): boolean[] => {
  const pattern = new Array(16).fill(false);
  
  // Musical weights for each instrument
  const weights = getWeightsForInstrument(instrument);
  
  for (let i = 0; i < 16; i++) {
    const weight = weights[i];
    const threshold = 1 - (density * weight);
    pattern[i] = Math.random() > threshold;
  }
  
  return pattern;
};

/**
 * Get musical weights for each step based on instrument type
 */
const getWeightsForInstrument = (instrument: Instrument): number[] => {
  const weights = new Array(16).fill(0.5);
  
  switch (instrument) {
    case 'kick':
    case 'kick909':
      // Favor beats 1, 5, 9, 13 (quarter notes)
      weights[0] = 1.5;
      weights[4] = 1.3;
      weights[8] = 1.3;
      weights[12] = 1.3;
      // Secondary emphasis on beats 3, 7, 11, 15
      weights[2] = 0.8;
      weights[6] = 0.8;
      weights[10] = 0.8;
      weights[14] = 0.8;
      break;
      
    case 'snare':
    case 'snare909':
      // Favor backbeats (5, 13)
      weights[4] = 1.8;
      weights[12] = 1.8;
      // Secondary on beats 1, 9
      weights[0] = 0.7;
      weights[8] = 0.7;
      break;
      
    case 'hihat':
    case 'hihat909':
      // Even distribution, slight emphasis on off-beats
      for (let i = 0; i < 16; i++) {
        weights[i] = i % 2 === 1 ? 1.1 : 0.9;
      }
      break;
      
    case 'clap':
    case 'clap909':
      // Similar to snare but less frequent
      weights[4] = 1.5;
      weights[12] = 1.5;
      break;
      
    case 'bass':
      // Follow kick pattern tendency
      weights[0] = 1.3;
      weights[2] = 1.0;
      weights[4] = 1.1;
      weights[6] = 1.0;
      weights[8] = 1.1;
      weights[10] = 1.0;
      weights[12] = 1.1;
      weights[14] = 1.0;
      break;
      
    case 'pad':
      // Sparse, long notes
      weights[0] = 1.5;
      weights[4] = 1.2;
      weights[8] = 1.2;
      weights[12] = 1.2;
      break;
  }
  
  return weights;
};

/**
 * Generate Euclidean rhythm
 * @param steps - Total number of steps
 * @param pulses - Number of active steps
 * @param rotation - Rotate pattern by n steps
 * @returns Pattern array
 */
export const euclideanRhythm = (steps: number, pulses: number, rotation: number = 0): boolean[] => {
  if (pulses >= steps) {
    return new Array(steps).fill(true);
  }
  
  if (pulses === 0) {
    return new Array(steps).fill(false);
  }
  
  const pattern: boolean[] = [];
  const bucket: number[] = [];
  
  for (let i = 0; i < steps; i++) {
    bucket[i] = Math.floor((pulses * (i + 1)) / steps) - Math.floor((pulses * i) / steps);
  }
  
  for (let i = 0; i < steps; i++) {
    pattern[i] = bucket[i] === 1;
  }
  
  // Apply rotation
  if (rotation !== 0) {
    const rotated = [...pattern];
    for (let i = 0; i < steps; i++) {
      rotated[(i + rotation) % steps] = pattern[i];
    }
    return rotated;
  }
  
  return pattern;
};

/**
 * Generate complementary bass line from kick pattern
 * @param kickPattern - The kick drum pattern
 * @returns Bass pattern that complements the kick
 */
export const generateBassLine = (kickPattern: boolean[]): boolean[] => {
  const bassPattern = new Array(16).fill(false);
  
  // Copy kick pattern as foundation
  kickPattern.forEach((active, i) => {
    if (active) bassPattern[i] = true;
  });
  
  // Add passing notes between kicks
  for (let i = 0; i < 16; i++) {
    if (kickPattern[i]) {
      // 50% chance to add note before kick
      if (i > 0 && !bassPattern[i - 1] && Math.random() > 0.5) {
        bassPattern[i - 1] = true;
      }
      // 30% chance to add note after kick
      if (i < 15 && !bassPattern[i + 1] && Math.random() > 0.7) {
        bassPattern[i + 1] = true;
      }
    }
  }
  
  return bassPattern;
};

/**
 * Humanize pattern by adding subtle random variation
 * @param pattern - Original pattern
 * @param amount - Amount of humanization (0-1)
 * @returns New pattern with variation
 */
export const humanize = (pattern: boolean[], amount: number): boolean[] => {
  return pattern.map(active => {
    if (active) {
      // Small chance to remove note
      return Math.random() > (amount * 0.2);
    } else {
      // Very small chance to add note
      return Math.random() < (amount * 0.05);
    }
  });
};

/**
 * Clear a track pattern
 */
export const clearTrack = (): boolean[] => {
  return new Array(16).fill(false);
};

/**
 * Generate random MIDI notes for bass/pad within a scale
 * @param rootNote - Root note (MIDI number)
 * @param scale - Scale intervals (0 = root, 2 = major second, etc.)
 * @param octaveRange - How many octaves to span
 * @returns Array of 16 MIDI notes
 */
export const randomizeNotes = (
  rootNote: number,
  scale: number[] = [0, 2, 4, 5, 7, 9, 11], // Major scale
  octaveRange: number = 2
): number[] => {
  const notes = new Array(16);
  
  for (let i = 0; i < 16; i++) {
    const octaveShift = Math.floor(Math.random() * (octaveRange + 1)) * 12;
    const scaleNote = scale[Math.floor(Math.random() * scale.length)];
    notes[i] = rootNote + octaveShift + scaleNote;
  }
  
  return notes;
};

/**
 * Common scales for randomization
 */
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};
