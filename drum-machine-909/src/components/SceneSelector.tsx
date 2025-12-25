import React from 'react';
import type { Scene } from '../types';

interface SceneSelectorProps {
  scenes: Scene[];
  activeIndex: number;
  onSceneSelect: (index: number) => void;
  onSceneCopy: (index: number) => void;
  onScenePaste: (index: number) => void;
  onSceneClear: (index: number) => void;
}

export const SceneSelector: React.FC<SceneSelectorProps> = ({
  scenes,
  activeIndex,
  onSceneSelect,
  onSceneCopy,
  onScenePaste,
  onSceneClear,
}) => {
  const sceneLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  const hasData = (scene: Scene): boolean => {
    // Check if scene has any active steps
    return Object.values(scene.grid).some(pattern => pattern.some(step => step));
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    // For now, just show a simple context menu using browser prompt
    // In a production app, you'd use a custom context menu component
    const action = window.prompt(
      `Scene ${sceneLabels[index]} Actions:\n1 - Copy\n2 - Paste\n3 - Clear\n\nEnter number:`,
      '1'
    );
    
    if (action === '1') onSceneCopy(index);
    else if (action === '2') onScenePaste(index);
    else if (action === '3') {
      if (window.confirm(`Clear Scene ${sceneLabels[index]}?`)) {
        onSceneClear(index);
      }
    }
  };

  return (
    <div className="scene-selector">
      <div className="scene-label">SCENES</div>
      <div className="scene-buttons">
        {sceneLabels.map((label, index) => (
          <button
            key={label}
            className={`scene-btn ${activeIndex === index ? 'active' : ''} ${hasData(scenes[index]) ? 'has-data' : ''}`}
            onClick={() => onSceneSelect(index)}
            onContextMenu={(e) => handleContextMenu(e, index)}
            title={`Scene ${label}${hasData(scenes[index]) ? ' (has data)' : ''}\nRight-click for options`}
          >
            <span className="scene-btn-label">{label}</span>
            {hasData(scenes[index]) && <span className="scene-indicator">•</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
