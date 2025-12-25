
import React, { useRef, useEffect, useState } from 'react';
import { midiToNoteName } from './NoteStepper';

interface PianoRollProps {
  stepCount: number;
  currentStep: number;
  steps: number[][]; // Array of steps, each containing MIDI notes (0-127)
  onChange: (stepIndex: number, notes: number[]) => void;
  minNote?: number; // Lowest MIDI note to show (default 36 C2)
  maxNote?: number; // Highest MIDI note to show (default 84 C6)
  rowHeight?: number;
  stepWidth?: number;
}

export const PianoRoll: React.FC<PianoRollProps> = ({
  stepCount = 16,
  currentStep,
  steps,
  onChange,
  minNote = 36,
  maxNote = 84,
  rowHeight = 20,
  stepWidth = 40
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<boolean>(true); // true = adding, false = removing

  // Generate note range (descending order for display)
  const notes = Array.from({ length: maxNote - minNote + 1 }, (_, i) => maxNote - i);

  // Auto-scroll to center of range initially
  useEffect(() => {
    if (scrollRef.current) {
        // Center scroll
        scrollRef.current.scrollTop = (scrollRef.current.scrollHeight - scrollRef.current.clientHeight) / 2;
    }
  }, []);

  const toggleNote = (stepIndex: number, note: number) => {
    const currentNotes = steps[stepIndex] || [];
    const hasNote = currentNotes.includes(note);
    
    let newNotes: number[];
    if (hasNote) {
      newNotes = currentNotes.filter(n => n !== note);
    } else {
      newNotes = [...currentNotes, note];
    }
    onChange(stepIndex, newNotes);
  };

  const handleMouseDown = (stepIndex: number, note: number) => {
    setIsDrawing(true);
    const currentNotes = steps[stepIndex] || [];
    const hasNote = currentNotes.includes(note);
    setDrawMode(!hasNote);
    
    // Apply immediate change
    toggleNote(stepIndex, note);
  };

  const handleMouseEnter = (stepIndex: number, note: number) => {
    if (!isDrawing) return;
    
    const currentNotes = steps[stepIndex] || [];
    const hasNote = currentNotes.includes(note);
    
    if (drawMode && !hasNote) {
        onChange(stepIndex, [...currentNotes, note]);
    } else if (!drawMode && hasNote) {
        onChange(stepIndex, currentNotes.filter(n => n !== note));
    }
  };

  useEffect(() => {
    const handleUp = () => setIsDrawing(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, []);

  /* 
     Match Drum Machine Spacing:
     --step-size: 44px
     --gap: 6px
     Step Group Padding: 4px 6px (we implement the horizontal 6px)
     Steps Container Gap: 8px
  */
  // Constants now handled in CSS mostly, but layout width calculation still needs them or CSS Grid
  const STEP_width = 44;
  const STEP_GAP = 6;
  const GROUP_PADDING_X = 6;
  const GROUP_GAP = 8;

  return (
    <div className="piano-roll-container">
      {/* Keyboard Keys Column */}
      <div className="piano-keys">
        <div style={{ transform: `translateY(-${scrollRef.current?.scrollTop || 0}px)` }}>
            {notes.map(note => {
            const isBlack = [1, 3, 6, 8, 10].includes(note % 12);
            return (
                <div 
                  key={note} 
                  className={`piano-key ${isBlack ? 'black' : 'white'}`}
                >
                {midiToNoteName(note)}
                </div>
            );
            })}
        </div>
      </div>

      {/* Grid */}
      <div 
        ref={scrollRef}
        className="piano-grid-scroll"
        onScroll={(e) => {
             const keysCol = e.currentTarget.previousElementSibling?.firstChild as HTMLElement;
             if (keysCol) keysCol.style.transform = `translateY(-${e.currentTarget.scrollTop}px)`;
        }}
      >
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            // Calculate total width explicitly to ensure scrolling matches structure
            width: 4 * ( (4 * STEP_width) + (3 * STEP_GAP) + (2 * GROUP_PADDING_X) ) + (3 * GROUP_GAP)
        }}>
            {notes.map(note => {
                const isBlack = [1, 3, 6, 8, 10].includes(note % 12);
                
                return (
                    <div 
                        key={note} 
                        className={`piano-row ${isBlack ? 'black' : 'white'}`}
                    >
                        {/* Render 4 Groups */}
                        {[0, 1, 2, 3].map(groupIdx => (
                            <div 
                                key={groupIdx} 
                                className={`piano-group ${groupIdx % 2 === 0 ? 'alternate' : ''}`}
                            >
                                { [0, 1, 2, 3].map(stepInGroup => {
                                    const stepIndex = (groupIdx * 4) + stepInGroup;
                                    const active = steps[stepIndex]?.includes(note);
                                    const current = currentStep === stepIndex;
                                    
                                    return (
                                        <div
                                            key={stepIndex}
                                            onMouseDown={() => handleMouseDown(stepIndex, note)}
                                            onMouseEnter={() => handleMouseEnter(stepIndex, note)}
                                            className={`piano-cell ${active ? 'active' : ''} ${current ? 'current' : ''}`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};
