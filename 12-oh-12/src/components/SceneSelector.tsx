import React, { useState, useEffect, useRef } from 'react';
import type { Scene } from '../types';

interface SceneSelectorProps {
  scenes: Scene[];
  activeIndex: number;
  onSceneSelect: (index: number) => void;
  onSceneCopy: (index: number) => void;
  onScenePaste: (index: number) => void;
  onSceneClear: (index: number) => void;
  onRandomizeActive: () => void;
  onImport: () => void;
  onExport: () => void;
  onExportAll: () => void;
}

export const SceneSelector: React.FC<SceneSelectorProps> = ({
  scenes,
  activeIndex,
  onSceneSelect,
  onSceneCopy,
  onScenePaste,
  onSceneClear,
  onRandomizeActive,
  onImport,
  onExport,
  onExportAll,
}) => {
  const sceneLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    sceneIndex: number | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    sceneIndex: null,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressThreshold = 500; // ms

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.visible]);

  const hasData = (scene: Scene): boolean => {
    // Check if scene has any active steps
    return Object.values(scene.grid).some(pattern => pattern.some(step => step));
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      sceneIndex: index,
    });
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    // Start long-press timer
    longPressTimer.current = window.setTimeout(() => {
      const touch = e.touches[0];
      setContextMenu({
        visible: true,
        x: touch.pageX,
        y: touch.pageY,
        sceneIndex: index,
      });
    }, longPressThreshold);
  };

  const handleTouchEnd = () => {
    // Cancel long-press timer if touch ends
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    // Cancel long-press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleAction = (action: 'copy' | 'paste' | 'clear') => {
    if (contextMenu.sceneIndex === null) return;
    
    switch (action) {
      case 'copy':
        onSceneCopy(contextMenu.sceneIndex);
        break;
      case 'paste':
        onScenePaste(contextMenu.sceneIndex);
        break;
      case 'clear':
        if (window.confirm(`Clear Scene ${sceneLabels[contextMenu.sceneIndex]}?`)) {
          onSceneClear(contextMenu.sceneIndex);
        }
        break;
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="scene-selector">
      <div className="scene-selector-top">
        <div className="scene-label">SCENES</div>
        <div className="scene-global-actions">
          <button className="scene-action-btn" onClick={() => onSceneClear(activeIndex)} title="Clear Active Scene">
            Clear
          </button>
          <button className="scene-action-btn" onClick={onRandomizeActive} title="Randomize Active Scene">
            Random
          </button>
          <div className="scene-divider" />
          <button className="scene-action-btn" onClick={onImport} title="Import Scene (.json)">
            Import
          </button>
          <button className="scene-action-btn" onClick={onExport} title="Export Scene (.json)">
            Export
          </button>
          <button className="scene-action-btn" onClick={onExportAll} title="Export All Scenes (.json)">
            Export All
          </button>
        </div>
      </div>
      <div className="scene-buttons">
        {sceneLabels.map((label, index) => (
          <button
            key={label}
            className={`scene-btn ${activeIndex === index ? 'active' : ''} ${hasData(scenes[index]) ? 'has-data' : ''}`}
            onClick={() => onSceneSelect(index)}
            onContextMenu={(e) => handleContextMenu(e, index)}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            title={`Scene ${label}${hasData(scenes[index]) ? ' (has data)' : ''}\nRight-click or long-press for options`}
          >
            <span className="scene-btn-label">{label}</span>
            {hasData(scenes[index]) && <span className="scene-indicator">•</span>}
          </button>
        ))}
      </div>

      {contextMenu.visible && (
        <div 
          className="context-menu" 
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="context-menu-item" onClick={() => handleAction('copy')}>
            <span>Copy</span>
          </div>
          <div className="context-menu-item" onClick={() => handleAction('paste')}>
            <span>Paste</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => handleAction('clear')}>
            <span>Clear</span>
          </div>
        </div>
      )}
    </div>
  );
};
