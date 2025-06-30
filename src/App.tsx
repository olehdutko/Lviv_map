import React, { useState } from 'react';
import MapComponent from './components/MapComponent';
import LayerPanel from './components/LayerPanel';
import ObjectEditor from './components/ObjectEditor';
import { Layer, MapMarker } from './types';
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
      },
    };
  };

  const [layers, setLayers] = useState<Layer[]>([createNewLayer()]);
  const [activeLayerId, setActiveLayerId] = useState<string>(layers[0].id);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [selectedObject, setSelectedObject] = useState<MapMarker | null>(null);

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
    setLayers(prev => {
      const remainingLayers = prev.filter(layer => layer.id !== layerId);
      if (remainingLayers.length === 0) {
        const newLayer = createNewLayer();
        setActiveLayerId(newLayer.id);
        return [newLayer];
      }
      if (activeLayerId === layerId) {
        setActiveLayerId(remainingLayers[0].id);
      }
      return remainingLayers;
    });
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
    setSelectedObject(prev => prev ? { ...prev, ...updates } : null);
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
    }
  };

  const toggleDrawingMode = (mode: DrawingMode) => {
    setDrawingMode(prev => (prev === mode ? 'none' : mode));
    setSelectedObject(null); // Deselect object when changing mode
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <LayerPanel
        layers={layers}
        activeLayerId={activeLayerId}
        onAddLayer={handleAddLayer}
        onUpdateLayer={handleUpdateLayer}
        onDeleteLayer={handleDeleteLayer}
        onSetActiveLayer={setActiveLayerId}
        onExport={handleExport}
        onImport={handleImport}
      />
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <div className="drawing-toolbar">
          <button 
            className={drawingMode === 'marker' ? 'active' : ''}
            onClick={() => toggleDrawingMode('marker')}
            disabled={!!selectedObject}
          >
            Малювати маркер
          </button>
        </div>
        <MapComponent 
          layers={layers} 
          activeLayerId={activeLayerId} 
          onUpdateLayer={handleUpdateLayer}
          drawingMode={drawingMode}
          onSetSelectedObject={handleSetSelectedObject}
        />
        {selectedObject && (
          <ObjectEditor
            selectedObject={selectedObject}
            onUpdate={handleUpdateSelectedObject}
            onDelete={handleDeleteSelectedObject}
            onClose={() => setSelectedObject(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App; 