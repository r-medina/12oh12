import { useEffect } from 'react';

export interface ShortcutHandlers {
  onPlayPause: () => void;
  onBpmIncrease: () => void;
  onBpmDecrease: () => void;
  onSceneSelect: (index: number) => void;
  onSolo: (index: number) => void;
  onMute: (index: number) => void;
  onSave: () => void;
  onExport: () => void;
  onRandomize?: () => void;
  onClear?: () => void;
  onHelp: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers, enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/select
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Space: Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        handlers.onPlayPause();
        return;
      }

      // [ and ]: BPM adjustment
      if (e.code === 'BracketLeft') {
        e.preventDefault();
        handlers.onBpmDecrease();
        return;
      }
      if (e.code === 'BracketRight') {
        e.preventDefault();
        handlers.onBpmIncrease();
        return;
      }

      // A-H: Scene selection
      const sceneKeys = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH'];
      const sceneIndex = sceneKeys.indexOf(e.code);
      if (sceneIndex !== -1 && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handlers.onSceneSelect(sceneIndex);
        return;
      }

      // 1-6: Solo (or Mute with Shift)
      if (e.code >= 'Digit1' && e.code <= 'Digit6') {
        const index = parseInt(e.code.replace('Digit', '')) - 1;
        e.preventDefault();
        
        if (e.shiftKey) {
          handlers.onMute(index);
        } else {
          handlers.onSolo(index);
        }
        return;
      }

      // Cmd/Ctrl+S: Save
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') {
        e.preventDefault();
        handlers.onSave();
        return;
      }

      // Cmd/Ctrl+E: Export
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyE') {
        e.preventDefault();
        handlers.onExport();
        return;
      }

      // R: Randomize (if handler provided)
      if (e.code === 'KeyR' && handlers.onRandomize) {
        e.preventDefault();
        handlers.onRandomize();
        return;
      }

      // Delete: Clear (if handler provided)
      if ((e.code === 'Delete' || e.code === 'Backspace') && handlers.onClear) {
        e.preventDefault();
        handlers.onClear();
        return;
      }

      // ?: Help
      if (e.code === 'Slash' && e.shiftKey) {
        e.preventDefault();
        handlers.onHelp();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
};
