import React, { useState } from 'react';
import LeafletMap, { MarkerData, PolygonData } from './components/LeafletMap';

interface Layer {
  id: string;
  name: string;
  markers: MarkerData[];
  polygons: PolygonData[];
  opacity: number;
  visible: boolean;
}

const App: React.FC = () => {
  // Шари
  const [layers, setLayers] = useState<Layer[]>(() => {
    const saved = localStorage.getItem('osr-layers');
    return saved ? JSON.parse(saved) : [{ id: 'layer-1', name: 'Базовий шар', markers: [], polygons: [], opacity: 1, visible: true }];
  });
  const [activeLayerId, setActiveLayerId] = useState<string>(layers[0].id);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  React.useEffect(() => {
    localStorage.setItem('osr-layers', JSON.stringify(layers));
  }, [layers]);

  // Додати шар
  const handleAddLayer = () => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Шар ${layers.length + 1}`,
      markers: [],
      polygons: [],
      opacity: 1,
      visible: true
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };
  // Видалити шар
  const handleDeleteLayer = (id: string) => {
    if (layers.length === 1) return; // не видаляти останній
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) {
      const next = layers.find(l => l.id !== id);
      if (next) setActiveLayerId(next.id);
    }
  };
  // Перемкнути активний шар
  const handleSetActiveLayer = (id: string) => setActiveLayerId(id);

  // Змінити прозорість шару
  const handleLayerOpacity = (id: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l));
  };
  // Змінити видимість шару
  const handleLayerVisible = (id: string, visible: boolean) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible } : l));
  };
  // Перейменування шару
  const handleStartEditName = (id: string, name: string) => {
    setEditingLayerId(id);
    setEditingName(name);
  };
  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };
  const handleSaveName = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name: editingName.trim() || l.name } : l));
    setEditingLayerId(null);
    setEditingName('');
  };
  const handleEditNameKey = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') handleSaveName(id);
    if (e.key === 'Escape') { setEditingLayerId(null); setEditingName(''); }
  };

  // Додавання/видалення маркерів/полігонів тільки в активному шарі
  const handleAddMarker = (lat: number, lng: number) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, markers: [...l.markers, { id: `marker-${Date.now()}`, lat, lng }] } : l));
  };
  const handleDeleteMarker = (id: string) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, markers: l.markers.filter(m => m.id !== id) } : l));
  };
  const handleMoveMarker = (id: string, lat: number, lng: number) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, markers: l.markers.map(m => m.id === id ? { ...m, lat, lng } : m) } : l));
  };
  const handleAddPolygon = (points: [number, number][]) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, polygons: [...l.polygons, { id: `polygon-${Date.now()}`, points }] } : l));
  };
  const handleDeletePolygon = (id: string) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, polygons: l.polygons.filter(p => p.id !== id) } : l));
  };

  // Всі видимі шари для карти (з прозорістю)
  const visibleLayers = layers.filter(l => l.visible);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Панель шарів */}
      <div style={{ width: 300, background: '#f7f7f7', borderRight: '1px solid #ddd', padding: 0, boxShadow: '2px 0 6px #0001', overflowY: 'auto' }}>
        <div style={{ fontWeight: 600, fontSize: 18, padding: '16px 16px 8px 16px', borderBottom: '1px solid #e0e0e0', background: '#fff' }}>Шари</div>
        <div style={{ padding: 12 }}>
          {layers.map(layer => (
            <div key={layer.id} style={{
              border: layer.id === activeLayerId ? '2px solid #1976d2' : '1px solid #e0e0e0',
              borderRadius: 8,
              background: layer.id === activeLayerId ? '#e3f0fd' : '#fff',
              marginBottom: 14,
              boxShadow: layer.id === activeLayerId ? '0 2px 8px #1976d233' : '0 1px 3px #0001',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              {/* Назва/редагування */}
              {editingLayerId === layer.id ? (
                <input
                  value={editingName}
                  autoFocus
                  onChange={handleChangeName}
                  onBlur={() => handleSaveName(layer.id)}
                  onKeyDown={e => handleEditNameKey(e, layer.id)}
                  style={{ fontWeight: 600, fontSize: 16, minWidth: 60, maxWidth: 120, border: '1px solid #1976d2', borderRadius: 4, padding: '2px 6px' }}
                />
              ) : (
                <span
                  style={{ fontWeight: 600, fontSize: 16, minWidth: 60, maxWidth: 120, cursor: 'pointer', color: '#1976d2', textDecoration: 'underline dotted' }}
                  title="Перейменувати шар"
                  onClick={() => handleStartEditName(layer.id, layer.name)}
                >
                  {layer.name}
                </span>
              )}
              {/* Видимість */}
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: layer.visible ? '#1976d2' : '#aaa' }}
                title={layer.visible ? 'Сховати шар' : 'Показати шар'}
                onClick={() => handleLayerVisible(layer.id, !layer.visible)}
              >
                {layer.visible ? '👁️' : '🚫'}
              </button>
              {/* Прозорість */}
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.01}
                value={layer.opacity}
                onChange={e => handleLayerOpacity(layer.id, Number(e.target.value))}
                style={{ width: 70 }}
                title={`Прозорість: ${Math.round(layer.opacity * 100)}%`}
              />
              <span style={{ fontSize: 12, color: '#888', width: 28, display: 'inline-block' }}>{Math.round(layer.opacity * 100)}%</span>
              {/* Активний шар */}
              <button
                style={{
                  background: layer.id === activeLayerId ? '#1976d2' : '#fff',
                  color: layer.id === activeLayerId ? '#fff' : '#1976d2',
                  border: '1.5px solid #1976d2',
                  borderRadius: 4,
                  padding: '2px 10px',
                  fontWeight: 600,
                  marginLeft: 8,
                  cursor: 'pointer',
                  minWidth: 40
                }}
                onClick={() => handleSetActiveLayer(layer.id)}
                title="Зробити активним"
              >
                {layer.id === activeLayerId ? 'Активний' : 'Активувати'}
              </button>
              {/* Видалити */}
              {layers.length > 1 && (
                <button
                  style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, marginLeft: 6 }}
                  onClick={() => handleDeleteLayer(layer.id)}
                  title="Видалити шар"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button style={{ marginTop: 8, width: '100%', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={handleAddLayer}>+ Додати шар</button>
        </div>
      </div>
      {/* Карта */}
      <div style={{ flexGrow: 1, height: '100vh', position: 'relative' }}>
        <LeafletMap
          markers={visibleLayers.flatMap(l => l.markers.map(m => ({ ...m, _layerOpacity: l.opacity })))}
          polygons={visibleLayers.flatMap(l => l.polygons.map(p => ({ ...p, _layerOpacity: l.opacity })))}
          onAddMarker={handleAddMarker}
          onDeleteMarker={handleDeleteMarker}
          onAddPolygon={handleAddPolygon}
          onDeletePolygon={handleDeletePolygon}
          onMoveMarker={handleMoveMarker}
          activeLayerId={activeLayerId}
        />
      </div>
    </div>
  );
};

export default App; 