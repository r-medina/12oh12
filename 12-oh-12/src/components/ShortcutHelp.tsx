import React from 'react';

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const shortcuts = [
    { key: 'Space', desc: 'Play / Stop' },
    { key: '[ / ]', desc: 'Decrease / Increase BPM' },
    { key: 'A - H', desc: 'Switch to Scene' },
    { key: '1 - 7', desc: 'Solo Track (Kick, Snare, HiHat, Clap, Bass, Pad, Poly)' },
    { key: 'Shift + 1-7', desc: 'Mute Track' },
    { key: 'Cmd/Ctrl + S', desc: 'Save Pattern' },
    { key: 'Cmd/Ctrl + E', desc: 'Export Pattern' },
    { key: '?', desc: 'Show This Help' },
    { key: 'Esc', desc: 'Close Help' },
  ];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="shortcut-help-backdrop" onClick={handleBackdropClick}>
      <div className="shortcut-help-modal">
        <div className="shortcut-help-header">
          <h3>KEYBOARD SHORTCUTS</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="shortcut-help-content">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-item">
              <kbd className="shortcut-key">{shortcut.key}</kbd>
              <span className="shortcut-desc">{shortcut.desc}</span>
            </div>
          ))}
        </div>
        <div className="shortcut-help-footer">
          <span className="hint">Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};
