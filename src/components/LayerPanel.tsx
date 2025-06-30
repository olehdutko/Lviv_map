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
  className?: string;
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
  className,
}) => {
  return (
    <div className={`layer-panel ${className || ''}`}>
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
            className={`layer-item ${layer.id === activeLayerId ? 'active' : ''} ${!layer.visible ? 'layer-hidden' : ''}`}
            onClick={() => onSetActiveLayer(layer.id)}
          >
            <input
              type="text"
              value={layer.name}
              onChange={(e) => onUpdateLayer(layer.id, { name: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="layer-item-controls">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateLayer(layer.id, { visible: !layer.visible });
                }}
              >
                {layer.visible ? 'Приховати' : 'Показати'}
              </button>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLayer(layer.id);
                }}
              >
                Видалити
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={layer.opacity}
              onChange={(e) => onUpdateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerPanel; 