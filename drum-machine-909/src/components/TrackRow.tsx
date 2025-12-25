
import React from 'react';
import type { Instrument } from '../types';
import { Knob } from './Knob';

interface TrackRowProps {
  label: string;
  instrument: Instrument;
  mute: boolean;
  solo: boolean;
  volume: number;
  reverbSend: number;
  delaySend: number;
  eq: { low: number; mid: number; high: number };
  
  onMute: () => void;
  onSolo: () => void;
  onVolumeChange: (val: number) => void;
  onVolumeWheel?: (e: React.WheelEvent) => void;
  onReverbSendChange: (val: number) => void;
  onDelaySendChange: (val: number) => void;
  onEQChange: (band: 'low' | 'mid' | 'high', val: number) => void;
  
  extraControls?: React.ReactNode;
  children: React.ReactNode; // For the steps grid
  
  // Optional styling classes
  className?: string;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  label,
  mute,
  solo,
  volume,
  reverbSend,
  delaySend,
  eq,
  onMute,
  onSolo,
  onVolumeChange,
  onVolumeWheel,
  onReverbSendChange,
  onDelaySendChange,
  onEQChange,
  extraControls,
  children,
  className = ''
}) => {
  return (
    <div className={`track-container ${className}`}>
      {/* Header Row: Controls */}
      <div className="track-header">
        
        {/* Left Group: Label & Mute/Solo */}
        <div className="track-identity">
          <div className="track-label">{label}</div>
          <div className="mute-solo-group">
            <button className={`ms-btn ${mute ? 'active' : ''}`} onClick={onMute}>M</button>
            <button className={`ms-btn ${solo ? 'active' : ''}`} onClick={onSolo}>S</button>
          </div>
        </div>

        {/* Middle Group: Channel Strip (Vol + Params) */}
        <div className="track-params">
          <div className="param-item">
            <label>Vol {volume}dB</label>
            <input 
              type="range" 
              min="-60" 
              max="0" 
              step="1" 
              value={volume} 
              onChange={e => onVolumeChange(Number(e.target.value))} 
              onWheel={onVolumeWheel}
            />
          </div>
          {extraControls}
        </div>

        {/* Right Group: Sends & EQ */}
        <div className="track-sends-eq">
          <div className="control-pill-group sends-group">
            <Knob label="REV" min={-60} max={0} value={reverbSend} onChange={onReverbSendChange} size={28} />
            <Knob label="DLY" min={-60} max={0} value={delaySend} onChange={onDelaySendChange} size={28} />
          </div>
          
          <div className="control-pill-group eq-group">
            <Knob label="Lo" min={-12} max={12} value={eq.low} onChange={v => onEQChange('low', v)} onDoubleClick={() => onEQChange('low', 0)} size={24} />
            <Knob label="Mid" min={-12} max={12} value={eq.mid} onChange={v => onEQChange('mid', v)} onDoubleClick={() => onEQChange('mid', 0)} size={24} />
            <Knob label="Hi" min={-12} max={12} value={eq.high} onChange={v => onEQChange('high', v)} onDoubleClick={() => onEQChange('high', 0)} size={24} />
          </div>
        </div>

      </div>

      {/* Grid Row */}
      <div className="track-grid-row">
        {children}
      </div>
    </div>
  );
};
