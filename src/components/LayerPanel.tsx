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
  baseLayerId?: string;
  onReorderLayers?: (newLayers: Layer[]) => void;
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
  baseLayerId,
  onReorderLayers,
}) => {
  const [overlayToDelete, setOverlayToDelete] = useState<{layerId: string, overlayId: string, overlayTitle?: string} | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(layers.map(l => [l.id, true])));
  const [dragged, setDragged] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Drag and drop reorder logic
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragged(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOver(id);
  };
  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!dragged || dragged === id) return;
    const fromIdx = layers.findIndex(l => l.id === dragged);
    const toIdx = layers.findIndex(l => l.id === id);
    if (fromIdx === -1 || toIdx === -1) return;
    const newLayers = [...layers];
    const [removed] = newLayers.splice(fromIdx, 1);
    newLayers.splice(toIdx, 0, removed);
    setDragOver(null);
    setDragged(null);
    onReorderLayers && onReorderLayers(newLayers);
  };
  const handleDragEnd = () => {
    setDragged(null);
    setDragOver(null);
  };

  // Expand/collapse logic
  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
      <div style={{ display: 'flex', alignItems: 'center', height: '64px', gap: '16px' }}>
        <div className="panel-controls" style={{ marginTop: 0, flex: 1, justifyContent: 'center', gap: '16px' }}>
          <button
            className="icon-btn"
            onClick={onAddLayer}
            title="Додати шар"
          >
            <span className="material-icons">add</span>
          </button>
          <button
            className="icon-btn"
            onClick={onAddImageOverlay}
            title="Додати мапу/зображення"
          >
            <span className="material-icons">map</span>
          </button>
          <button
            className="icon-btn"
            onClick={onExport}
            title="Експорт"
          >
            <span className="material-icons">file_upload</span>
          </button>
          <label
            className="icon-btn"
            title="Імпорт"
            style={{ justifyContent: 'center' }}
          >
            <span className="material-icons">file_download</span>
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
          </label>
        </div>
      </div>
      <div className="layer-list">
        {layers.map((layer, idx) => (
          <div
            key={layer.id}
            className={`layer-item ${layer.id === activeLayerId ? 'active' : ''} ${!layer.visible ? 'layer-hidden' : ''}`}
            onClick={() => onSetActiveLayer(layer.id)}
            style={{ opacity: dragged === layer.id ? 0.5 : 1, border: dragOver === layer.id ? '2px dashed #1976d2' : undefined }}
            {...(layer.id !== baseLayerId ? {
              onDragOver: (e: React.DragEvent) => handleDragOver(e, layer.id),
              onDrop: (e: React.DragEvent) => handleDrop(e, layer.id),
              onDragEnd: handleDragEnd,
            } : {})}
          >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {layer.id !== baseLayerId && (
                <button
                  type="button"
                  aria-label="Перетягнути шар"
                  style={{ cursor: 'grab', marginRight: 6, color: '#888', userSelect: 'none', background: 'none', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, layer.id)}
                  tabIndex={-1}
                  onClick={e => e.stopPropagation()}
                >
                  <span className="material-icons">drag_indicator</span>
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); toggleExpand(layer.id); }}
                style={{ marginRight: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#1976d2' }}
                title={expanded[layer.id] ? 'Згорнути' : 'Розгорнути'}
              >
                <span className="material-icons">
                  {expanded[layer.id] ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              <input
                type="text"
                value={layer.name}
                onChange={(e) => onUpdateLayer(layer.id, { name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, minWidth: 0 }}
              />
              <span style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateLayer(layer.id, { visible: !layer.visible });
                  }}
                  title={layer.visible ? 'Приховати' : 'Показати'}
                  style={{ padding: 2, minWidth: 0, width: 28, height: 28, background: 'none', border: 'none', boxShadow: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <span className="material-icons" style={{ fontSize: 20, color: '#1976d2', transition: 'color 0.15s' }}>
                    {layer.visible ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                  }}
                  title="Видалити"
                  style={{ padding: 2, minWidth: 0, width: 28, height: 28, background: 'none', border: 'none', boxShadow: 'none', cursor: layer.id === baseLayerId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: layer.id === baseLayerId ? 0.4 : 1 }}
                  disabled={layer.id === baseLayerId}
                >
                  <span className="material-icons" style={{ fontSize: 20, color: '#d32f2f', transition: 'color 0.15s' }}>
                    delete
                  </span>
                </button>
              </span>
            </div>
            {expanded[layer.id] && (
              <div style={{ paddingLeft: 24 }}>
                <select
                  className="layer-maptype-select"
                  value={layer.mapType}
                  onChange={e => onUpdateLayer(layer.id, { mapType: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  style={{ marginTop: 4, marginBottom: 4 }}
                >
                  <option value="plan">🗺️ План</option>
                  <option value="satellite">🛰️ Супутник</option>
                  <option value="landscape">🌄 Ландшафт</option>
                  <option value="humanitarian">🤝 Humanitarian</option>
                  <option value="transport">🚍 Transport</option>
                  <option value="cycle">🚴 Cycle</option>
                  <option value="cartoLight">💡 Carto Light</option>
                  <option value="cartoDark">🌙 Carto Dark</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 4 }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={layer.showLabels ?? true}
                    disabled={layer.mapType === 'plan'}
                    onChange={e => onUpdateLayer(layer.id, { showLabels: e.target.checked })}
                    style={{ marginRight: 4 }}
                  />
                  Геоназви
                  {layer.mapType === 'plan' && (
                    <span style={{ color: '#888', fontSize: 12, marginLeft: 4 }} title="Для цього типу карти геоназви не можна вимкнути">
                      (неможливо вимкнути для OSM)
                    </span>
                  )}
                </label>
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
            )}
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