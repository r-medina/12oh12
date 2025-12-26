import React from 'react';
import type { Instrument } from '../types';
import { TrackHeader } from './TrackHeader';
import { TrackControls } from './TrackControls';

interface TrackRowProps {
  label: string;
  instrument: Instrument;
  mute: boolean;
  solo: boolean;
  volume: number;
  reverbSend: number;
  delaySend: number;
  eq: { low: number; mid: number; high: number };
  
  onMute: (inst: Instrument) => void;
  onSolo: (inst: Instrument) => void;
  onVolumeChange: (inst: Instrument, val: number) => void;
  onReverbSendChange: (inst: Instrument, val: number) => void;
  onDelaySendChange: (inst: Instrument, val: number) => void;
  onEQChange: (inst: Instrument, band: 'low' | 'mid' | 'high', val: number) => void;
  
  extraControls?: React.ReactNode;
  children: React.ReactNode; // For the steps grid
  
  // Optional styling classes
  className?: string;
}

export const TrackRow = React.memo<TrackRowProps>(({
  label,
  instrument,
  mute,
  solo,
  volume,
  reverbSend,
  delaySend,
  eq,
  onMute,
  onSolo,
  onVolumeChange,
  onReverbSendChange,
  onDelaySendChange,
  onEQChange,
  extraControls,
  children,
  className = ''
}) => {
  return (
    <div className={`track-container ${className}`}>
      {/* Left Section: Header + Steps (stacked vertically) */}
      <div className="track-left-section">
        {/* Header Row: Label, M/S, Params */}
        <TrackHeader
            label={label}
            instrument={instrument}
            mute={mute}
            solo={solo}
            onMute={onMute}
            onSolo={onSolo}
            extraControls={extraControls}
        />

        {/* Steps Grid */}
        <div className="track-grid-row">
          {children}
        </div>
      </div>

      {/* Right Section: Gain + EQ/Sends (full height) */}
      <TrackControls
        instrument={instrument}
        volume={volume}
        reverbSend={reverbSend}
        delaySend={delaySend}
        eq={eq}
        onVolumeChange={onVolumeChange}
        onReverbSendChange={onReverbSendChange}
        onDelaySendChange={onDelaySendChange}
        onEQChange={onEQChange}
      />
    </div>
  );
});
