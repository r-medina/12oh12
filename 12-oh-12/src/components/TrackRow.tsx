
import React from 'react';
import type { Instrument } from '../types';
import { Knob } from './Knob';
import { ScrollableSlider } from './ScrollableSlider';

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

        {/* Steps Grid */}
        <div className="track-grid-row">
          {children}
        </div>
      </div>

      {/* Right Section: Gain + EQ/Sends (full height) */}
      <div className="track-right-section">
        {/* Gain Slider - Full height */}
        <div className="track-gain-column">
          <ScrollableSlider 
            className="vertical-slider gain-slider"
            min={-60}
            max={0}
            step={1}
            value={volume} 
            onChange={e => onVolumeChange(instrument, Number(e.target.value))} 
          />
          <label className="gain-label">Vol {volume}</label>
        </div>

        {/* EQ above Sends */}
        <div className="track-eq-sends-column">
          {/* EQ - Top */}
          <div className="eq-row">
            <Knob label="Lo" min={-12} max={12} value={eq.low} onChange={v => onEQChange(instrument, 'low', v)} onDoubleClick={() => onEQChange(instrument, 'low', 0)} size={28} />
            <Knob label="Mid" min={-12} max={12} value={eq.mid} onChange={v => onEQChange(instrument, 'mid', v)} onDoubleClick={() => onEQChange(instrument, 'mid', 0)} size={28} />
            <Knob label="Hi" min={-12} max={12} value={eq.high} onChange={v => onEQChange(instrument, 'high', v)} onDoubleClick={() => onEQChange(instrument, 'high', 0)} size={28} />
          </div>
          {/* Sends - Bottom, centered */}
          <div className="sends-row">
            <Knob label="REV" min={-60} max={0} value={reverbSend} onChange={v => onReverbSendChange(instrument, v)} onDoubleClick={() => onReverbSendChange(instrument, -60)} size={32} />
            <Knob label="DLY" min={-60} max={0} value={delaySend} onChange={v => onDelaySendChange(instrument, v)} onDoubleClick={() => onDelaySendChange(instrument, -60)} size={32} />
          </div>
        </div>
      </div>
    </div>
  );
});
