import React, { useState } from 'react';
import MapComponent from './components/MapComponent';
import LayerPanel from './components/LayerPanel';
import ObjectEditor from './components/ObjectEditor';
import PolylineEditor from './components/PolylineEditor';
import Snackbar from './components/Snackbar';
import ConfirmationDialog from './components/ConfirmationDialog';
import { Layer, MapMarker, MapPolyline } from './types';
import './index.css';

// Define DrawingMode type
type DrawingMode = 'marker' | 'polygon' | 'polyline' | 'none';

function App() {
  const createNewLayer = (): Layer => {
    const layerId = `layer-${Date.now()}`;
    return {
      id: layerId,
      name: `Шар ${new Date().toLocaleTimeString()}`,
      visible: true,
      opacity: 1,
      markers: [],
      polygons: [],
      polylines: [],
      drawingSettings: {
        markerColor: '#ff0000',
        polygonColor: '#ff0000',
        polygonFillColor: '#ff0000',
        polylineColor: '#0000ff',
        polylineWeight: 3,
        polylineDashArray: '', // solid line
      },
    };
  };

  const [layers, setLayers] = useState<Layer[]>([createNewLayer()]);
  const [activeLayerId, setActiveLayerId] = useState<string>(layers[0].id);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [selectedObject, setSelectedObject] = useState<MapMarker | null>(null);
  const [selectedPolyline, setSelectedPolyline] = useState<MapPolyline | null>(null);
  const [selectedPolylineLayerId, setSelectedPolylineLayerId] = useState<string | null>(null);
  const [currentPolylinePoints, setCurrentPolylinePoints] = useState<[number, number][]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [isLayerPanelVisible, setIsLayerPanelVisible] = useState(true);
  const [layerToDelete, setLayerToDelete] = useState<string | null>(null);

  const presetColors = ['#ff4500', '#ff8c00', '#ffd700', '#90ee90', '#00ced1', '#1e90ff', '#c71585', '#333333'];

  const handleAddLayer = () => {
    const newLayer = createNewLayer();
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const handleUpdateLayer = (layerId: string, updates: Partial<Layer>) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    );
  };

  const handleDeleteLayer = (layerId: string) => {
    setLayerToDelete(layerId);
  };

  const confirmDeleteLayer = () => {
    if (!layerToDelete) return;
    setLayers(prev => {
      const remainingLayers = prev.filter(layer => layer.id !== layerToDelete);
      if (remainingLayers.length === 0) {
        const newLayer = createNewLayer();
        setActiveLayerId(newLayer.id);
        return [newLayer];
      }
      if (activeLayerId === layerToDelete) {
        setActiveLayerId(remainingLayers[0].id);
      }
      return remainingLayers;
    });
    setLayerToDelete(null);
  };

  const cancelDeleteLayer = () => {
    setLayerToDelete(null);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(layers, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'layers.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (!event.target.files) return;

    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const importedLayers = JSON.parse(e.target?.result as string) as Layer[];
        // Basic validation
        if (Array.isArray(importedLayers) && importedLayers.every(layer => layer.id && layer.name)) {
          setLayers(importedLayers);
          setActiveLayerId(importedLayers[0]?.id || '');
        } else {
          alert("Invalid file format.");
        }
      } catch (error) {
        alert("Error reading or parsing file.");
        console.error(error);
      }
    };
  };

  const handleUpdateSelectedObject = (updates: Partial<MapMarker>) => {
    if (!selectedObject) return;
    const layer = layers.find(l => l.markers.some(m => m.id === selectedObject.id));
    if (!layer) return;
    const updatedMarkers = layer.markers.map(m =>
      m.id === selectedObject.id ? { ...m, ...updates } : m
    );
    handleUpdateLayer(layer.id, { markers: updatedMarkers });
    const updatedObject = { ...selectedObject, ...updates };
    setSelectedObject(updatedObject);
    setSnackbarMessage(`Маркер "${updatedObject.title || 'без назви'}" оновлено.`);
  };

  const handleDeleteSelectedObject = () => {
    if (!selectedObject) return;
    const layer = layers.find(l => l.markers.some(m => m.id === selectedObject.id));
    if (!layer) return;

    const updatedMarkers = layer.markers.filter(m => m.id !== selectedObject.id);
    handleUpdateLayer(layer.id, { markers: updatedMarkers });
    setSelectedObject(null); // Deselect after deleting
  };
  
  const handleSetSelectedObject = (object: MapMarker | null) => {
    setSelectedObject(object);
    if (object) {
      setDrawingMode('none'); // Turn off drawing mode when an object is selected
      setSelectedPolyline(null);
      setSelectedPolylineLayerId(null);
    }
  };

  const toggleDrawingMode = (mode: DrawingMode) => {
    if (mode === 'polyline' && currentPolylinePoints.length > 0) {
      // Don't toggle off if currently drawing
      return;
    }
    setDrawingMode(prev => (prev === mode ? 'none' : mode));
    setSelectedObject(null); // Deselect object when changing mode
    setCurrentPolylinePoints([]); // Reset polyline points
  };

  const handleUpdateDrawingSettings = (updates: Partial<Layer['drawingSettings']>) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer) {
      handleUpdateLayer(activeLayerId, {
        drawingSettings: { ...activeLayer.drawingSettings, ...updates },
      });
    }
  };
  
  const handleAddPolylinePoint = (point: [number, number]) => {
    setCurrentPolylinePoints(prev => [...prev, point]);
  };

  const handleDeletePolylinePoint = (indexToDelete: number) => {
    setCurrentPolylinePoints(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  const handleFinishPolyline = () => {
    if (currentPolylinePoints.length < 2 || !activeLayer) return;

    const newPolyline: MapPolyline = {
      id: `polyline-${Date.now()}`,
      coordinates: currentPolylinePoints,
      color: activeLayer.drawingSettings.polylineColor,
      weight: activeLayer.drawingSettings.polylineWeight,
      dashArray: activeLayer.drawingSettings.polylineDashArray,
    };

    handleUpdateLayer(activeLayerId, {
      polylines: [...activeLayer.polylines, newPolyline],
    });

    setCurrentPolylinePoints([]);
    setDrawingMode('none');
  };

  const handleCancelPolyline = () => {
    setCurrentPolylinePoints([]);
    setDrawingMode('none');
  };

  const handleDeletePolyline = (layerId: string, polylineId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const updatedPolylines = layer.polylines.filter(p => p.id !== polylineId);
    handleUpdateLayer(layerId, { polylines: updatedPolylines });
  };

  const handleEditPolyline = (polyline: MapPolyline, layerId: string) => {
    setSelectedPolyline(polyline);
    setSelectedPolylineLayerId(layerId);
    setSelectedObject(null);
    setDrawingMode('none');
  };

  const handleUpdateSelectedPolyline = (updates: Partial<MapPolyline>) => {
    if (!selectedPolyline || !selectedPolylineLayerId) return;
    const layer = layers.find(l => l.id === selectedPolylineLayerId);
    if (!layer) return;
    const updatedPolylines = layer.polylines.map(p =>
      p.id === selectedPolyline.id ? { ...p, ...updates } : p
    );
    handleUpdateLayer(layer.id, { polylines: updatedPolylines });
    const updatedPolyline = { ...selectedPolyline, ...updates };
    setSelectedPolyline(updatedPolyline);
    setSnackbarMessage(`Лінію "${updatedPolyline.title || 'без назви'}" оновлено.`);
  };

  const handleDeleteSelectedPolyline = () => {
    if (!selectedPolyline || !selectedPolylineLayerId) return;
    const layer = layers.find(l => l.id === selectedPolylineLayerId);
    if (!layer) return;
    const updatedPolylines = layer.polylines.filter(p => p.id !== selectedPolyline.id);
    handleUpdateLayer(layer.id, { polylines: updatedPolylines });
    setSelectedPolyline(null);
    setSelectedPolylineLayerId(null);
  };

  const handleDeleteSelectedPolylineVertex = (indexToDelete: number) => {
    if (!selectedPolyline) return;

    const updatedCoordinates = selectedPolyline.coordinates.filter((_, index) => index !== indexToDelete);

    if (updatedCoordinates.length < 2) {
      alert("Лінія повинна мати принаймні 2 точки.");
      return;
    }

    handleUpdateSelectedPolyline({ coordinates: updatedCoordinates });
  };

  const activeLayer = layers.find(l => l.id === activeLayerId);

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      <button 
        className="toggle-panel-btn"
        onClick={() => setIsLayerPanelVisible(!isLayerPanelVisible)}
        style={{ left: isLayerPanelVisible ? '286px' : '10px' }}
      >
        {isLayerPanelVisible ? '«' : '»'}
      </button>
      <div style={{ display: 'flex', height: '100%' }}>
        <LayerPanel
          className={!isLayerPanelVisible ? 'panel-hidden' : ''}
          layers={layers}
          activeLayerId={activeLayerId}
          onAddLayer={handleAddLayer}
          onUpdateLayer={handleUpdateLayer}
          onDeleteLayer={handleDeleteLayer}
          onSetActiveLayer={setActiveLayerId}
          onExport={handleExport}
          onImport={handleImport}
        />
        <div 
          className={`map-wrapper ${drawingMode === 'polyline' ? 'drawing-polyline' : ''}`}
          style={{ flexGrow: 1, position: 'relative' }}
        >
          <div className="drawing-toolbar">
            <button 
              className={drawingMode === 'marker' ? 'active' : ''}
              onClick={() => toggleDrawingMode('marker')}
              disabled={!!selectedObject}
            >
              Малювати маркер
            </button>
            <button 
              className={drawingMode === 'polyline' ? 'active' : ''}
              onClick={() => toggleDrawingMode('polyline')}
              disabled={!!selectedObject}
            >
              Малювати лінію
            </button>
          </div>

          {drawingMode === 'polyline' && activeLayer && (
            <div className="polyline-settings-panel">
              <h4>Налаштування лінії</h4>
              <div className="editor-field">
                <label>Колір</label>
                <div className="color-palette">
                  {presetColors.map((presetColor) => (
                    <div
                      key={presetColor}
                      className={`color-swatch ${activeLayer.drawingSettings.polylineColor === presetColor ? 'selected' : ''}`}
                      style={{ backgroundColor: presetColor }}
                      onClick={() => handleUpdateDrawingSettings({ polylineColor: presetColor })}
                    />
                  ))}
                  <input
                    type="color"
                    value={activeLayer.drawingSettings.polylineColor}
                    onChange={(e) => handleUpdateDrawingSettings({ polylineColor: e.target.value })}
                    className="color-picker-input"
                  />
                </div>
              </div>
              <div className="editor-field">
                <label>Товщина: {activeLayer.drawingSettings.polylineWeight}px</label>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={activeLayer.drawingSettings.polylineWeight}
                  onChange={(e) => handleUpdateDrawingSettings({ polylineWeight: parseInt(e.target.value, 10) })}
                />
              </div>
              <div className="editor-field">
                <label>Стиль</label>
                <select 
                  value={activeLayer.drawingSettings.polylineDashArray} 
                  onChange={(e) => handleUpdateDrawingSettings({ polylineDashArray: e.target.value })}
                >
                  <option value="">Суцільна</option>
                  <option value="5, 10">Пунктир</option>
                  <option value="15, 10, 5, 10">Штрих-пунктир</option>
                </select>
              </div>
              <div className="polyline-actions">
                <button onClick={handleFinishPolyline} disabled={currentPolylinePoints.length < 2}>
                  Завершити
                </button>
                <button onClick={handleCancelPolyline}>
                  Скасувати
                </button>
              </div>
            </div>
          )}

          <MapComponent 
            layers={layers} 
            activeLayerId={activeLayerId} 
            onUpdateLayer={handleUpdateLayer}
            drawingMode={drawingMode}
            onSetSelectedObject={handleSetSelectedObject}
            currentPolylinePoints={currentPolylinePoints}
            onAddPolylinePoint={handleAddPolylinePoint}
            onDeletePolyline={handleDeletePolyline}
            onEditPolyline={handleEditPolyline}
            onDeletePolylinePoint={handleDeletePolylinePoint}
            selectedPolyline={selectedPolyline}
            onDeleteSelectedPolylineVertex={handleDeleteSelectedPolylineVertex}
            isLayerPanelVisible={isLayerPanelVisible}
          />
          {selectedObject && !selectedPolyline && (
            <ObjectEditor
              selectedObject={selectedObject}
              onUpdate={handleUpdateSelectedObject}
              onDelete={handleDeleteSelectedObject}
              onClose={() => setSelectedObject(null)}
            />
          )}
          {selectedPolyline && selectedPolylineLayerId && !selectedObject && (
            <PolylineEditor
              selectedPolyline={selectedPolyline}
              onUpdate={handleUpdateSelectedPolyline}
              onDelete={handleDeleteSelectedPolyline}
              onClose={() => { setSelectedPolyline(null); setSelectedPolylineLayerId(null); }}
            />
          )}
          {snackbarMessage && (
            <Snackbar 
              message={snackbarMessage} 
              onClose={() => setSnackbarMessage('')} 
            />
          )}
          {layerToDelete && (
            <ConfirmationDialog
              isOpen={!!layerToDelete}
              message={`Ви впевнені, що хочете видалити шар "${layers.find(l => l.id === layerToDelete)?.name || ''}"?`}
              onConfirm={confirmDeleteLayer}
              onCancel={cancelDeleteLayer}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 