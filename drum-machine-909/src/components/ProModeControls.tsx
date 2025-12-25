import type { ProModeParams, Instrument } from '../types';
import { ScrollableSlider } from './ScrollableSlider';

interface ProModeControlsProps {
  params: ProModeParams;
  onParamChange: (category: keyof ProModeParams, param: string, value: any) => void;
}

export const ProModeControls: React.FC<ProModeControlsProps> = ({ params, onParamChange }) => {
  const DELAY_TIME_OPTIONS = ["16n", "16n.", "8n", "8n.", "4n", "4n."];
  const INSTRUMENTS: Instrument[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'pad'];

  return (
    <div className="pro-mode-panel">
      {/* Master Section */}
      <div className="pro-section">
        <h3>Master</h3>
        <div className="pro-params">
          <div className="pro-param-item">
            <label>Volume: {params.masterVolume}dB</label>
            <ScrollableSlider
              min={-12}
              max={6}
              step={0.5}
              value={params.masterVolume}
              onChange={(e) => onParamChange('masterVolume', 'value', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Master Compressor Section */}
      <div className="pro-section">
        <h3>Master Compressor</h3>
        <div className="pro-params">
          <div className="pro-param-item">
            <label className="radio-toggle">
              <input
                type="checkbox"
                checked={params.masterCompressor.bypass}
                onChange={(e) => onParamChange('masterCompressor', 'bypass', e.target.checked)}
              />
              <span className="radio-toggle-check" />
              Bypass
            </label>
          </div>
          <div className="pro-param-item">
            <label>Threshold: {params.masterCompressor.threshold}dB</label>
            <ScrollableSlider
              min={-40}
              max={0}
              step={1}
              value={params.masterCompressor.threshold}
              onChange={(e) => onParamChange('masterCompressor', 'threshold', Number(e.target.value))}
              disabled={params.masterCompressor.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Ratio: {params.masterCompressor.ratio}:1</label>
            <ScrollableSlider
              min={1}
              max={20}
              step={0.5}
              value={params.masterCompressor.ratio}
              onChange={(e) => onParamChange('masterCompressor', 'ratio', Number(e.target.value))}
              disabled={params.masterCompressor.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Attack: {(params.masterCompressor.attack * 1000).toFixed(0)}ms</label>
            <ScrollableSlider
              min={0.001}
              max={0.5}
              step={0.001}
              value={params.masterCompressor.attack}
              onChange={(e) => onParamChange('masterCompressor', 'attack', Number(e.target.value))}
              disabled={params.masterCompressor.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Release: {(params.masterCompressor.release * 1000).toFixed(0)}ms</label>
            <ScrollableSlider
              min={0.01}
              max={1}
              step={0.01}
              value={params.masterCompressor.release}
              onChange={(e) => onParamChange('masterCompressor', 'release', Number(e.target.value))}
              disabled={params.masterCompressor.bypass}
            />
          </div>
        </div>
      </div>

      {/* Tape Chain Section */}
      <div className="pro-section">
        <h3>Tape Chain</h3>
        <div className="pro-params">
          <div className="pro-param-item">
            <label className="radio-toggle">
              <input
                type="checkbox"
                checked={params.tapeChain.bypass}
                onChange={(e) => onParamChange('tapeChain', 'bypass', e.target.checked)}
              />
              <span className="radio-toggle-check" />
              Bypass
            </label>
          </div>
          <div className="pro-param-item">
            <label>Comp Thresh: {params.tapeChain.compThreshold}dB</label>
            <ScrollableSlider
              min={-40}
              max={0}
              step={1}
              value={params.tapeChain.compThreshold}
              onChange={(e) => onParamChange('tapeChain', 'compThreshold', Number(e.target.value))}
              disabled={params.tapeChain.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Comp Ratio: {params.tapeChain.compRatio}:1</label>
            <ScrollableSlider
              min={1}
              max={20}
              step={0.5}
              value={params.tapeChain.compRatio}
              onChange={(e) => onParamChange('tapeChain', 'compRatio', Number(e.target.value))}
              disabled={params.tapeChain.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Comp Attack: {(params.tapeChain.compAttack * 1000).toFixed(0)}ms</label>
            <ScrollableSlider
              min={0.001}
              max={0.5}
              step={0.001}
              value={params.tapeChain.compAttack}
              onChange={(e) => onParamChange('tapeChain', 'compAttack', Number(e.target.value))}
              disabled={params.tapeChain.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Comp Release: {(params.tapeChain.compRelease * 1000).toFixed(0)}ms</label>
            <ScrollableSlider
              min={0.01}
              max={1}
              step={0.01}
              value={params.tapeChain.compRelease}
              onChange={(e) => onParamChange('tapeChain', 'compRelease', Number(e.target.value))}
              disabled={params.tapeChain.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Saturation: {(params.tapeChain.distortion * 100).toFixed(0)}%</label>
            <ScrollableSlider
              min={0}
              max={0.3}
              step={0.01}
              value={params.tapeChain.distortion}
              onChange={(e) => onParamChange('tapeChain', 'distortion', Number(e.target.value))}
              disabled={params.tapeChain.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Warmth: {(params.tapeChain.filterCutoff / 1000).toFixed(1)}kHz</label>
            <ScrollableSlider
              min={8000}
              max={20000}
              step={100}
              value={params.tapeChain.filterCutoff}
              onChange={(e) => onParamChange('tapeChain', 'filterCutoff', Number(e.target.value))}
              disabled={params.tapeChain.bypass}
            />
          </div>
        </div>
      </div>

      {/* Reverb Section */}
      <div className="pro-section">
        <h3>Reverb</h3>
        <div className="pro-params">
          <div className="pro-param-item">
            <label className="radio-toggle">
              <input
                type="checkbox"
                checked={params.reverb.bypass}
                onChange={(e) => onParamChange('reverb', 'bypass', e.target.checked)}
              />
              <span className="radio-toggle-check" />
              Bypass
            </label>
          </div>
          <div className="pro-param-item">
            <label>Decay: {params.reverb.decay.toFixed(1)}s</label>
            <ScrollableSlider
              min={0.5}
              max={10}
              step={0.1}
              value={params.reverb.decay}
              onChange={(e) => onParamChange('reverb', 'decay', Number(e.target.value))}
              disabled={params.reverb.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Pre-Delay: {(params.reverb.preDelay * 1000).toFixed(0)}ms</label>
            <ScrollableSlider
              min={0}
              max={0.2}
              step={0.005}
              value={params.reverb.preDelay}
              onChange={(e) => onParamChange('reverb', 'preDelay', Number(e.target.value))}
              disabled={params.reverb.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Tone Filter: {params.reverb.toneFilter}Hz</label>
            <ScrollableSlider
              min={200}
              max={2000}
              step={50}
              value={params.reverb.toneFilter}
              onChange={(e) => onParamChange('reverb', 'toneFilter', Number(e.target.value))}
              disabled={params.reverb.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Pre-Filter: {params.reverb.preFilter}Hz</label>
            <ScrollableSlider
              min={20}
              max={500}
              step={10}
              value={params.reverb.preFilter}
              onChange={(e) => onParamChange('reverb', 'preFilter', Number(e.target.value))}
              disabled={params.reverb.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Post-Filter: {params.reverb.postFilter}Hz</label>
            <ScrollableSlider
              min={20}
              max={300}
              step={5}
              value={params.reverb.postFilter}
              onChange={(e) => onParamChange('reverb', 'postFilter', Number(e.target.value))}
              disabled={params.reverb.bypass}
            />
          </div>
        </div>
      </div>

      {/* Delay Section */}
      <div className="pro-section">
        <h3>Delay</h3>
        <div className="pro-params">
          <div className="pro-param-item">
            <label className="radio-toggle">
              <input
                type="checkbox"
                checked={params.delay.bypass}
                onChange={(e) => onParamChange('delay', 'bypass', e.target.checked)}
              />
              <span className="radio-toggle-check" />
              Bypass
            </label>
          </div>
          <div className="pro-param-item">
            <label>Time: {params.delay.time}</label>
            <select
              value={params.delay.time}
              onChange={(e) => onParamChange('delay', 'time', e.target.value)}
              disabled={params.delay.bypass}
            >
              {DELAY_TIME_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="pro-param-item">
            <label>Feedback: {(params.delay.feedback * 100).toFixed(0)}%</label>
            <ScrollableSlider
              min={0}
              max={0.95}
              step={0.05}
              value={params.delay.feedback}
              onChange={(e) => onParamChange('delay', 'feedback', Number(e.target.value))}
              disabled={params.delay.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Pre-Filter: {params.delay.preFilter}Hz</label>
            <ScrollableSlider
              min={20}
              max={500}
              step={10}
              value={params.delay.preFilter}
              onChange={(e) => onParamChange('delay', 'preFilter', Number(e.target.value))}
              disabled={params.delay.bypass}
            />
          </div>
          <div className="pro-param-item">
            <label>Post-Filter: {params.delay.postFilter}Hz</label>
            <ScrollableSlider
              min={20}
              max={300}
              step={5}
              value={params.delay.postFilter}
              onChange={(e) => onParamChange('delay', 'postFilter', Number(e.target.value))}
              disabled={params.delay.bypass}
            />
          </div>
        </div>
      </div>

      {/* Track Enablement Section */}
      <div className="pro-section">
        <h3>Track Enablement</h3>
        <div className="pro-params" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
          {INSTRUMENTS.map(inst => (
            <div className="pro-param-item" key={inst}>
              <label className="radio-toggle">
                <input
                  type="checkbox"
                  checked={params.trackEnabled?.[inst] ?? true}
                  onChange={(e) => onParamChange('trackEnabled', inst, e.target.checked)}
                />
                <span className="radio-toggle-check" />
                {inst}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
