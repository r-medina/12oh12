
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
      {/* Header Row: Label, M/S, Params */}
      <div className="track-header">
        <div className="track-identity">
          <div className="track-label">{label}</div>
          <div className="mute-solo-group">
            <button className={`ms-btn ${mute ? 'active' : ''}`} onClick={onMute}>M</button>
            <button className={`ms-btn ${solo ? 'active' : ''}`} onClick={onSolo}>S</button>
          </div>
        </div>
        <div className="track-params">
          {extraControls}
        </div>
      </div>

      {/* Main Row: Pads + Gain + EQ/Sends */}
      <div className="track-main-row">
        {/* Steps Grid */}
        <div className="track-grid-row">
          {children}
        </div>

        {/* Gain Slider - Full height to right of pads */}
        <div className="track-gain-column">
          <input 
            type="range" 
            className="vertical-slider gain-slider"
            min="-60" 
            max="0" 
            step="1" 
            value={volume} 
            onChange={e => onVolumeChange(Number(e.target.value))} 
            onWheel={onVolumeWheel}
          />
          <label className="gain-label">Vol {volume}</label>
        </div>

        {/* EQ above Sends */}
        <div className="track-eq-sends-column">
          {/* EQ - Top */}
          <div className="eq-row">
            <Knob label="Lo" min={-12} max={12} value={eq.low} onChange={v => onEQChange('low', v)} onDoubleClick={() => onEQChange('low', 0)} size={28} />
            <Knob label="Mid" min={-12} max={12} value={eq.mid} onChange={v => onEQChange('mid', v)} onDoubleClick={() => onEQChange('mid', 0)} size={28} />
            <Knob label="Hi" min={-12} max={12} value={eq.high} onChange={v => onEQChange('high', v)} onDoubleClick={() => onEQChange('high', 0)} size={28} />
          </div>
          {/* Sends - Bottom, centered */}
          <div className="sends-row">
            <Knob label="REV" min={-60} max={0} value={reverbSend} onChange={onReverbSendChange} onDoubleClick={() => onReverbSendChange(-60)} size={32} />
            <Knob label="DLY" min={-60} max={0} value={delaySend} onChange={onDelaySendChange} onDoubleClick={() => onDelaySendChange(-60)} size={32} />
          </div>
        </div>
      </div>
    </div>
  );
};
