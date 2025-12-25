import React, { useRef } from 'react';
import { usePreventScroll } from '../hooks/usePreventScroll';

interface NoteStepperProps {
  midi: number;
  min: number;
  max: number;
  onChange: (midi: number) => void;
  onWheel?: (e: React.WheelEvent) => void;
  /** If true, show only the +/- buttons (no note display) */
  buttonsOnly?: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const midiToNoteName = (midi: number): string => {
  const octave = Math.floor(midi / 12) - 1;
  const noteName = NOTE_NAMES[midi % 12];
  return `${noteName}${octave}`;
};

export const NoteStepper: React.FC<NoteStepperProps> = ({
  midi,
  min,
  max,
  onChange,
  onWheel,
  buttonsOnly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Prevent page scroll when hovering over note stepper
  usePreventScroll(containerRef);

  const handleDecrement = () => {
    if (midi > min) {
      onChange(midi - 1);
    }
  };

  const handleIncrement = () => {
    if (midi < max) {
      onChange(midi + 1);
    }
  };

  return (
    <div className="note-stepper" ref={containerRef} onWheel={onWheel}>
      <button 
        className="note-stepper-btn" 
        onClick={handleDecrement}
        disabled={midi <= min}
        type="button"
      >
        −
      </button>
      {!buttonsOnly && <span className="note-display">{midiToNoteName(midi)}</span>}
      <button 
        className="note-stepper-btn" 
        onClick={handleIncrement}
        disabled={midi >= max}
        type="button"
      >
        +
      </button>
    </div>
  );
};
