import React from 'react';
import { Layer } from '../types';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onAddLayer: () => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onDeleteLayer: (layerId: string) => void;
  onSetActiveLayer: (layerId: string) => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onAddLayer,
  onUpdateLayer,
  onDeleteLayer,
  onSetActiveLayer,
  onExport,
  onImport,
}) => {
  return (
    <div className="layer-panel">
      <h2>Шари</h2>
      <div className="panel-controls">
        <button onClick={onAddLayer}>Додати шар</button>
        <button onClick={onExport}>Експорт</button>
        <label>
          Імпорт
          <input type="file" accept=".json" onChange={onImport} style={{ display: 'none' }} />
        </label>
      </div>
      <div className="layer-list">
        {layers.map(layer => (
          <div
            key={layer.id}
            className={`layer-item ${layer.id === activeLayerId ? 'active' : ''}`}
            onClick={() => onSetActiveLayer(layer.id)}
          >
            <input
              type="text"
              value={layer.name}
              onChange={(e) => onUpdateLayer(layer.id, { name: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
            <input
              type="checkbox"
              checked={layer.visible}
              onChange={(e) => onUpdateLayer(layer.id, { visible: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={layer.opacity}
              onChange={(e) => onUpdateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLayer(layer.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerPanel; 