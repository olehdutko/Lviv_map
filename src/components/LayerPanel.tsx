import React, { useState } from 'react';
import { Layer, MapImageOverlay } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onAddLayer: () => void;
  onAddImageOverlay: () => void;
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
  onAddImageOverlay,
  onUpdateLayer,
  onDeleteLayer,
  onSetActiveLayer,
  onExport,
  onImport,
  className,
}) => {
  const [overlayToDelete, setOverlayToDelete] = useState<{layerId: string, overlayId: string, overlayTitle?: string} | null>(null);

  const handleOverlayVisibility = (layer: Layer, overlay: MapImageOverlay, visible: boolean) => {
    onUpdateLayer(layer.id, {
      imageOverlays: layer.imageOverlays.map(o => o.id === overlay.id ? { ...o, visible } : o)
    });
  };
  const handleOverlayOpacity = (layer: Layer, overlay: MapImageOverlay, opacity: number) => {
    onUpdateLayer(layer.id, {
      imageOverlays: layer.imageOverlays.map(o => o.id === overlay.id ? { ...o, opacity } : o)
    });
  };
  const handleOverlayTitle = (layer: Layer, overlay: MapImageOverlay, title: string) => {
    onUpdateLayer(layer.id, {
      imageOverlays: layer.imageOverlays.map(o => o.id === overlay.id ? { ...o, title } : o)
    });
  };
  const handleDeleteOverlay = (layer: Layer, overlayId: string) => {
    onUpdateLayer(layer.id, {
      imageOverlays: layer.imageOverlays.filter(o => o.id !== overlayId)
    });
  };
  return (
    <div className={`layer-panel ${className || ''}`}>
      <h2>Шари</h2>
      <div className="panel-controls">
        <button onClick={onAddLayer}>Додати шар</button>
        <button onClick={onAddImageOverlay}>Додати мапу</button>
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
            {(layer.imageOverlays || []).length > 0 && (
              <div style={{ margin: '0.5rem 0 0.5rem 0.5rem', paddingLeft: 4, borderLeft: '2px solid #eee' }}>
                <div style={{ fontSize: '0.95em', fontWeight: 500, marginBottom: 4 }}>Зображення:</div>
                {layer.imageOverlays.map(overlay => (
                  <div key={overlay.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setOverlayToDelete({layerId: layer.id, overlayId: overlay.id, overlayTitle: overlay.title}); }}
                      title="Видалити мапу"
                      style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: 18, cursor: 'pointer', padding: 0, marginRight: 2, display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4L12 12M12 4L4 12" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <input
                      type="checkbox"
                      checked={overlay.visible !== false}
                      onChange={e => handleOverlayVisibility(layer, overlay, e.target.checked)}
                      title="Показати/приховати зображення"
                      style={{ marginRight: 4 }}
                      onClick={e => e.stopPropagation()}
                    />
                    <input
                      type="text"
                      value={overlay.title || ''}
                      onChange={e => handleOverlayTitle(layer, overlay, e.target.value)}
                      placeholder="Назва мапи"
                      style={{ flex: 1, fontSize: '0.93em', minWidth: 0, maxWidth: 120 }}
                      onClick={e => e.stopPropagation()}
                    />
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.01}
                      value={typeof overlay.opacity === 'number' ? overlay.opacity : 1}
                      onChange={e => handleOverlayOpacity(layer, overlay, parseFloat(e.target.value))}
                      title="Прозорість"
                      style={{ width: 60 }}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                ))}
              </div>
            )}
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
      {overlayToDelete && (
        <ConfirmationDialog
          isOpen={!!overlayToDelete}
          message={`Ви впевнені, що хочете видалити мапу "${overlayToDelete.overlayTitle || ''}"?`}
          onConfirm={() => {
            handleDeleteOverlay(
              layers.find(l => l.id === overlayToDelete.layerId)!,
              overlayToDelete.overlayId
            );
            setOverlayToDelete(null);
          }}
          onCancel={() => setOverlayToDelete(null)}
        />
      )}
    </div>
  );
};

export default LayerPanel; 