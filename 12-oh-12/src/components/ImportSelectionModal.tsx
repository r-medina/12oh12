import React, { useState } from 'react';
import type { ProjectFile, Scene } from '../types';

interface ImportSelectionModalProps {
  projectFile: ProjectFile;
  currentScenes: Scene[];
  onConfirm: (selectedIndices: number[], importProSettings: boolean) => void;
  onCancel: () => void;
}

export const ImportSelectionModal: React.FC<ImportSelectionModalProps> = ({
  projectFile,
  currentScenes,
  onConfirm,
  onCancel
}) => {
  const [selected, setSelected] = useState<boolean[]>(
    new Array(projectFile.scenes.length).fill(true)
  );
  const [importProSettings, setImportProSettings] = useState(!!projectFile.proModeParams);

  const toggleSelection = (index: number) => {
    setSelected(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const selectAll = () => setSelected(new Array(projectFile.scenes.length).fill(true));
  const selectNone = () => setSelected(new Array(projectFile.scenes.length).fill(false));

  const handleConfirm = () => {
    const indices = selected
      .map((isSelected, idx) => (isSelected ? idx : -1))
      .filter(idx => idx !== -1);
    onConfirm(indices, importProSettings);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const anySelected = selected.some(Boolean);

  return (
    <div className="import-modal-overlay" onClick={onCancel}>
      <div className="import-modal" onClick={e => e.stopPropagation()}>
        <h2>Import Project</h2>
        <p className="import-modal-info">
          Project saved on: {formatDate(projectFile.timestamp)}
        </p>

        {projectFile.proModeParams && (
          <div className="scene-checkbox-list" style={{ marginBottom: '12px' }}>
            <label className="scene-checkbox-item">
              <input 
                type="checkbox" 
                checked={importProSettings}
                onChange={e => setImportProSettings(e.target.checked)}
              />
              <span className="scene-slot">PRO</span>
              <span className="scene-names">
                <span className="scene-from">Global Settings (Master/Tape/Reverb)</span>
              </span>
            </label>
          </div>
        )}

        <div className="import-modal-actions-top">
          <button onClick={selectAll}>Select All</button>
          <button onClick={selectNone}>Select None</button>
        </div>

        <div className="scene-checkbox-list">
          {projectFile.scenes.map((scene, idx) => {
            const currentScene = currentScenes[idx];
            const currentName = currentScene?.name || `Scene ${String.fromCharCode(65 + idx)}`;
            const slotLabel = String.fromCharCode(65 + idx);

            return (
              <label key={idx} className="scene-checkbox-item">
                <input
                  type="checkbox"
                  checked={selected[idx]}
                  onChange={() => toggleSelection(idx)}
                />
                <span className="scene-slot">{slotLabel}</span>
                <span className="scene-names">
                  <span className="scene-from">{scene.name}</span>
                  <span className="scene-arrow">→</span>
                  <span className="scene-to">{currentName}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="import-modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!anySelected && !importProSettings}
          >
            Import Selected ({selected.filter(Boolean).length})
          </button>
        </div>
      </div>
    </div>
  );
};
