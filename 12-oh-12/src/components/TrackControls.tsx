import React from 'react';
import type { Instrument } from '../types';
import { Knob } from './Knob';
import { ScrollableSlider } from './ScrollableSlider';

interface TrackControlsProps {
  instrument: Instrument;
  volume: number;
  reverbSend: number;
  delaySend: number;
  eq: { low: number; mid: number; high: number };
  onVolumeChange: (inst: Instrument, val: number) => void;
  onReverbSendChange: (inst: Instrument, val: number) => void;
  onDelaySendChange: (inst: Instrument, val: number) => void;
  onEQChange: (inst: Instrument, band: 'low' | 'mid' | 'high', val: number) => void;
}

export const TrackControls = React.memo<TrackControlsProps>(({
  instrument,
  volume,
  reverbSend,
  delaySend,
  eq,
  onVolumeChange,
  onReverbSendChange,
  onDelaySendChange,
  onEQChange
}) => {
  // Debug log to verify memoization
  // console.log(`Rendering Controls for ${instrument}`);

  return (
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
  );
});
