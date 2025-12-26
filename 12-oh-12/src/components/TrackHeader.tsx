import React from 'react';
import type { Instrument } from '../types';

interface TrackHeaderProps {
  label: string;
  instrument: Instrument;
  mute: boolean;
  solo: boolean;
  onMute: (inst: Instrument) => void;
  onSolo: (inst: Instrument) => void;
  extraControls?: React.ReactNode;
}

export const TrackHeader = React.memo<TrackHeaderProps>(({
  label,
  instrument,
  mute,
  solo,
  onMute,
  onSolo,
  extraControls
}) => {
  return (
    <div className="track-header">
      <div className="track-identity">
        <div className="track-label">{label}</div>
        <div className="mute-solo-group">
          <button className={`ms-btn ${mute ? 'active' : ''}`} onClick={() => onMute(instrument)}>M</button>
          <button className={`ms-btn ${solo ? 'active' : ''}`} onClick={() => onSolo(instrument)}>S</button>
        </div>
      </div>
      <div className="track-params">
        {extraControls}
      </div>
    </div>
  );
});
