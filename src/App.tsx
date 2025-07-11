import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import LayerPanel from './components/LayerPanel';
import ObjectEditor from './components/ObjectEditor';
import PolylineEditor from './components/PolylineEditor';
import Snackbar from './components/Snackbar';
import ConfirmationDialog from './components/ConfirmationDialog';
import ImageOverlayDialog from './components/ImageOverlayDialog';
import PolygonEditor from './components/PolygonEditor';
import { Layer, MapMarker, MapPolyline, MapPolygon } from './types';
import './index.css';

// Define DrawingMode type
type DrawingMode = 'marker' | 'polygon' | 'polyline' | 'none';

// GeoSearch result type
interface GeoSearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

function App() {
  const createNewLayer = (isBase = false): Layer => {
    const layerId = `layer-${Date.now()}`;
    return {
      id: layerId,
      name: isBase ? 'Базовий шар' : `Шар ${new Date().toLocaleTimeString()}`,
      visible: true,
      opacity: 1,
      markers: [],
      polygons: [],
      polylines: [],
      imageOverlays: [],
      drawingSettings: {
        markerColor: '#ff0000',
        polygonColor: '#ff0000',
        polygonFillColor: '#ff0000',
        polylineColor: '#0000ff',
        polylineWeight: 3,
        polylineDashArray: '', // solid line
      },
      mapType: 'plan',
      showLabels: true,
    };
  };

  const [layers, setLayers] = useState<Layer[]>(() => {
    const saved = localStorage.getItem('osr-map-layers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Перша назва завжди 'Базовий шар'
          parsed[0].name = 'Базовий шар';
          return parsed;
        }
      } catch {}
    }
    return [createNewLayer(true)];
  });
  const [activeLayerId, setActiveLayerId] = useState<string>(layers[0].id);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [selectedObject, setSelectedObject] = useState<MapMarker | import('./types').MapImageOverlay | null>(null);
  const [selectedPolyline, setSelectedPolyline] = useState<MapPolyline | null>(null);
  const [selectedPolylineLayerId, setSelectedPolylineLayerId] = useState<string | null>(null);
  const [currentPolylinePoints, setCurrentPolylinePoints] = useState<[number, number][]>([]);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState<[number, number][]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [isLayerPanelVisible, setIsLayerPanelVisible] = useState(true);
  const [layerToDelete, setLayerToDelete] = useState<string | null>(null);
  const [isImageOverlayDialogOpen, setIsImageOverlayDialogOpen] = useState(false);
  const [pendingImageOverlay, setPendingImageOverlay] = useState<string | null>(null); // base64 image
  const [imageOverlayCorners, setImageOverlayCorners] = useState<[number, number][]>([]);
  
  // GeoSearch state
  const [geoSearch, setGeoSearch] = useState('');
  const [geoResults, setGeoResults] = useState<GeoSearchResult[]>([]);
  const [mapRef, setMapRef] = useState<any>(null);

  const [showDeletePolylineDialog, setShowDeletePolylineDialog] = useState<{ show: boolean, message: string } | null>(null);

  const presetColors = ['#ff4500', '#ff8c00', '#ffd700', '#90ee90', '#00ced1', '#1e90ff', '#c71585', '#333333'];

  const mapApiKeys = {
    thunderforest: 'YOUR_THUNDERFOREST_API_KEY',
    carto: 'YOUR_CARTO_API_KEY',
  };

  const mapTypes = {
    plan: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
    },
    landscape: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> contributors'
    },
    humanitarian: {
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Humanitarian style'
    },
    transport: {
      url: `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${mapApiKeys.thunderforest}`,
      attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; OpenStreetMap contributors'
    },
    cycle: {
      url: `https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${mapApiKeys.thunderforest}`,
      attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; OpenStreetMap contributors'
    },
    cartoLight: {
      url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}${mapApiKeys.carto ? `?apikey=${mapApiKeys.carto}` : ''}.png`,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    cartoDark: {
      url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${mapApiKeys.carto ? `?apikey=${mapApiKeys.carto}` : ''}.png`,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  };

  // useState оголошення для полігонів (перенесено на початок)
  const [isPolygonEditorOpen, setPolygonEditorOpen] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState<MapPolygon | null>(null);
  const [selectedPolygonLayerId, setSelectedPolygonLayerId] = useState<string | null>(null);
  const [pendingPolygon, setPendingPolygon] = useState<null | { coordinates: [number, number][] }>(null);

  // crosshair cursor when selecting overlay corners або малюванні маркера/лінії/полігона
  useEffect(() => {
    if (drawingMode === 'marker' || drawingMode === 'polyline' || drawingMode === 'polygon' || pendingImageOverlay) {
      document.body.classList.add('osr-crosshair');
    } else {
      document.body.classList.remove('osr-crosshair');
    }
    return () => {
      document.body.classList.remove('osr-crosshair');
    };
  }, [drawingMode, pendingImageOverlay]);

  // Відкривати PolygonEditor одразу при першій точці полігону
  useEffect(() => {
    if (drawingMode === 'polygon' && currentPolygonPoints.length === 1 && !isPolygonEditorOpen) {
      setPolygonEditorOpen(true);
    }
    // Якщо малювання скасовано, закриваємо редактор
    if (drawingMode !== 'polygon' && isPolygonEditorOpen && !selectedPolygon) {
      setPolygonEditorOpen(false);
    }
  }, [drawingMode, currentPolygonPoints, isPolygonEditorOpen, selectedPolygon]);

  // Збереження layers у localStorage при кожній зміні
  useEffect(() => {
    localStorage.setItem('osr-map-layers', JSON.stringify(layers));
  }, [layers]);

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
  
  const handleSetSelectedObject = (object: MapMarker | import('./types').MapImageOverlay | null) => {
    setSelectedObject(object);
    if (object) {
      setDrawingMode('none'); // Turn off drawing mode when an object is selected
      setSelectedPolyline(null);
      setSelectedPolylineLayerId(null);
    }
  };

  const toggleDrawingMode = (mode: DrawingMode) => {
    if (mode === 'polyline' && currentPolylinePoints.length > 0) {
      return;
    }
    if (mode === 'polygon' && currentPolygonPoints.length > 0) {
      return;
    }
    setDrawingMode(prev => (prev === mode ? 'none' : mode));
    setSelectedObject(null);
    setCurrentPolylinePoints([]);
    setCurrentPolygonPoints([]);
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
      setShowDeletePolylineDialog({
        show: true,
        message: 'Лінія повинна мати принаймні 2 точки. Ви хочете видалити всю лінію?'
      });
      return;
    }

    handleUpdateSelectedPolyline({ coordinates: updatedCoordinates });
  };

  const activeLayer = layers.find(l => l.id === activeLayerId);

  const handleAddImageOverlay = () => {
    setIsImageOverlayDialogOpen(true);
  };

  const handleImageOverlaySelected = (imageUrl: string) => {
    setIsImageOverlayDialogOpen(false);
    if (activeLayer) {
      // Центр карти (Lviv за замовчуванням)
      const center: [number, number] = [49.8397, 24.0297];
      const delta = 0.005;
      const corners: [number, number][] = [
        [center[0] - delta, center[1] - delta],
        [center[0] - delta, center[1] + delta],
        [center[0] + delta, center[1] + delta],
        [center[0] + delta, center[1] - delta],
      ];
      const overlayId = `image-overlay-${Date.now()}`;
      // corners: [[minLat, minLng], [maxLat, maxLng]]
      const lats = corners.map(c => c[0]);
      const lngs = corners.map(c => c[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ];
      const newOverlay = {
        id: overlayId,
        title: 'Мапа',
        imageUrl,
        corners: bounds,
        opacity: 1,
        visible: true,
      };
      handleUpdateLayer(activeLayerId, {
        imageOverlays: [...(activeLayer.imageOverlays || []), newOverlay],
      });
    }
  };

  const handleMapClickForImageOverlay = () => {};

  const handleCancelImageOverlay = () => {
    setIsImageOverlayDialogOpen(false);
    setPendingImageOverlay(null);
    setImageOverlayCorners([]);
  };

  // GeoSearch functions
  const handleGeoSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGeoSearch(value);
    
    if (value.length > 2) {
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}`);
        const results = await resp.json();
        setGeoResults(results.slice(0, 5)); // Limit to 5 results
      } catch (error) {
        console.error('Error fetching geocoding results:', error);
        setGeoResults([]);
      }
    } else {
      setGeoResults([]);
    }
  };

  const handleGeoResultSelect = (result: GeoSearchResult) => {
    if (mapRef) {
      mapRef.setView([parseFloat(result.lat), parseFloat(result.lon)], 16);
    }
    
    // Add marker to active layer
    if (activeLayerId) {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer) {
        const newMarker = {
          id: `marker-${Date.now()}`,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          title: result.display_name,
          color: activeLayer.drawingSettings?.markerColor || '#1976d2',
          iconName: 'search',
        };
        handleUpdateLayer(activeLayerId, {
          markers: [...(activeLayer.markers || []), newMarker],
        });
        setSnackbarMessage(`Додано маркер: ${result.display_name}`);
      }
    }
    
    setGeoResults([]);
    setGeoSearch(result.display_name);
  };

  const handleMapRef = (ref: any) => {
    setMapRef(ref);
  };

  // IIIF Overlay functions
  const handleAddIIIFOverlay = async () => {
    console.log('handleAddIIIFOverlay викликано');
    const url = window.prompt('Введіть IIIF Image API info.json або manifest URL:');

    if (!url) return;
    let infoUrl = url;
    try {
      if (url.endsWith('manifest.json') || url.endsWith('info.json') || url.endsWith('manifest') || url.includes('presentation')) {
        // Це manifest, треба знайти info.json
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Не вдалося завантажити manifest');
        const manifest = await resp.json();
        console.log('manifest', manifest);
        
        // IIIF Presentation API 2.x
        const canvas = manifest.sequences?.[0]?.canvases?.[0];
        const service = canvas?.images?.[0]?.resource?.service;
        let serviceId = service?.['@id'] || service?.id;
        console.log('serviceId', serviceId);
        console.log('manifest.items', manifest.items);
        console.log('body.id', manifest.items?.[0]?.items?.[0]?.items?.[0]?.body?.id);
        
        if (!serviceId && Array.isArray(service)) serviceId = service[0]?.['@id'] || service[0]?.id;
        
        // IIIF Presentation API 3.x (canvas.items[0].items[0].body.service[0].id)
        if (!serviceId && manifest.items && manifest.items[0]?.items?.[0]?.items?.[0]?.body?.service?.[0]?.id) {
          serviceId = manifest.items[0].items[0].items[0].body.service[0].id;
        }
        
        if (serviceId) {
          infoUrl = serviceId.replace(/\/$/, '') + '/info.json';
          console.log('Додаю IIIF overlay:', infoUrl);
          setSnackbarMessage('IIIF мапу додано успішно');
          return;
        } else {
          // fallback: IIIF 2.x (canvas.images[0].resource['@id'])
          const imageUrl = canvas?.images?.[0]?.resource?.['@id'] || canvas?.images?.[0]?.resource?.id;
          const width = canvas?.width;
          const height = canvas?.height;
          if (imageUrl) {
            const center: [number, number] = [49.8397, 24.0297];
            let bounds: [[number, number], [number, number]];
            if (width && height && width > 0 && height > 0) {
              const maxSize = 0.02;
              const aspect = width / height;
              let w = maxSize, h = maxSize;
              if (aspect > 1) h = maxSize / aspect; else w = maxSize * aspect;
              bounds = [
                [center[0] - h / 2, center[1] - w / 2],
                [center[0] + h / 2, center[1] + w / 2]
              ];
            } else {
              bounds = [
                [center[0], center[1]],
                [center[0] + 0.01, center[1] + 0.01]
              ];
            }
            const newOverlay = {
              id: `img-${Date.now()}`,
              title: manifest.label?.[0]?.['@value'] || 'IIIF Image',
              imageUrl,
              corners: bounds,
              opacity: 1,
              visible: true,
            };
            handleUpdateLayer(activeLayerId, {
              imageOverlays: [
                ...((layers.find(l => l.id === activeLayerId)?.imageOverlays) || []),
                newOverlay
              ]
            });
            console.log('Додаю overlay:', newOverlay);
            setSnackbarMessage('IIIF Image API не знайдено, додано як просте зображення');
            setSelectedObject(newOverlay);
            return;
          }
          
          // fallback: IIIF 3.x (canvas.items[0].items[0].body.id)
          if (!serviceId && manifest.items && manifest.items[0]?.items?.[0]?.items?.[0]?.body?.id) {
            const canvas = manifest.items[0];
            const annotation = canvas?.items?.[0]?.items?.[0];
            const body = annotation?.body;
            const imageUrl = body?.id;
            const width = body?.width;
            const height = body?.height;
            if (imageUrl) {
              const center: [number, number] = [49.8397, 24.0297];
              let bounds: [[number, number], [number, number]];
              if (width && height && width > 0 && height > 0) {
                const maxSize = 0.02;
                const aspect = width / height;
                let w = maxSize, h = maxSize;
                if (aspect > 1) h = maxSize / aspect; else w = maxSize * aspect;
                bounds = [
                  [center[0] - h / 2, center[1] - w / 2],
                  [center[0] + h / 2, center[1] + w / 2]
                ];
              } else {
                bounds = [
                  [center[0], center[1]],
                  [center[0] + 0.01, center[1] + 0.01]
                ];
              }
              const newOverlay = {
                id: `img-${Date.now()}`,
                title: manifest.label?.en?.[0] || manifest.label?.[0]?.['@value'] || 'IIIF Image',
                imageUrl,
                corners: bounds,
                opacity: 1,
                visible: true,
              };
              handleUpdateLayer(activeLayerId, {
                imageOverlays: [
                  ...((layers.find(l => l.id === activeLayerId)?.imageOverlays) || []),
                  newOverlay
                ]
              });
              setSnackbarMessage('IIIF manifest не містить info.json, додано як просте зображення');
              setSelectedObject(newOverlay);
              return;
            }
          }
        }
        
        // Якщо це info.json, додаємо як IIIFOverlay
        if (infoUrl.includes('info.json')) {
          console.log('Додаю IIIF overlay:', infoUrl);
          setSnackbarMessage('IIIF мапу додано успішно');
        } else {
          setSnackbarMessage('URL не є IIIF info.json. Додавання IIIFOverlay неможливе.');
          alert('URL не є IIIF info.json. Додавання IIIFOverlay неможливе.');
        }
      }
    } catch (e) {
      setSnackbarMessage('Помилка підключення IIIF: ' + (e as Error).message);
      alert('Помилка підключення IIIF: ' + (e as Error).message);
    }
  };

  const handleAddPolygonPoint = (point: [number, number]) => {
    setCurrentPolygonPoints(prev => [...prev, point]);
  };

  const handleDeletePolygonPoint = (indexToDelete: number) => {
    setCurrentPolygonPoints(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  const handleFinishPolygon = () => {
    if (currentPolygonPoints.length < 3) {
      setSnackbarMessage('Полігон має містити мінімум 3 точки');
      return;
    }
    setPendingPolygon({ coordinates: currentPolygonPoints });
    setPolygonEditorOpen(true);
  };

  const handlePolygonEditorSave = (updates: Partial<MapPolygon>) => {
    // Якщо редагування існуючого полігону
    if (selectedPolygon && selectedPolygonLayerId) {
      const layer = layers.find(l => l.id === selectedPolygonLayerId);
      if (!layer) return;
      const updatedPolygons = layer.polygons.map(p =>
        p.id === selectedPolygon.id ? { ...p, ...updates } : p
      );
      handleUpdateLayer(selectedPolygonLayerId, { polygons: updatedPolygons });
      setSelectedPolygon(null);
      setSelectedPolygonLayerId(null);
      setPolygonEditorOpen(false);
      setSnackbarMessage('Полігон оновлено');
      return;
    }
    // Додаємо новий полігон (flow малювання)
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;
    const coords = updates.coordinates && updates.coordinates.length >= 3 ? updates.coordinates : currentPolygonPoints;
    if (!coords || coords.length < 3) {
      setSnackbarMessage('Полігон має містити мінімум 3 точки');
      return;
    }
    const newPolygon = {
      id: `polygon-${Date.now()}`,
      coordinates: coords,
      color: updates.color || activeLayer.drawingSettings.polygonColor,
      fillColor: updates.fillColor || activeLayer.drawingSettings.polygonFillColor,
      opacity: typeof updates.opacity === 'number' ? updates.opacity : 0.3,
      title: updates.title || `Полігон ${new Date().toLocaleTimeString()}`,
      description: updates.description || '',
    };
    handleUpdateLayer(activeLayerId, {
      polygons: [...activeLayer.polygons, newPolygon],
    });
    setCurrentPolygonPoints([]);
    setDrawingMode('none');
    setPolygonEditorOpen(false);
    setPendingPolygon(null);
    setSnackbarMessage('Полігон додано');
  };

  const handlePolygonEditorDelete = () => {
    if (selectedPolygon && selectedPolygonLayerId) {
      const layer = layers.find(l => l.id === selectedPolygonLayerId);
      if (!layer) return;
      const updatedPolygons = layer.polygons.filter(p => p.id !== selectedPolygon.id);
      handleUpdateLayer(selectedPolygonLayerId, { polygons: updatedPolygons });
      setSelectedPolygon(null);
      setSelectedPolygonLayerId(null);
      setPolygonEditorOpen(false);
      setSnackbarMessage('Полігон видалено');
    } else {
      setPolygonEditorOpen(false);
      setPendingPolygon(null);
      setCurrentPolygonPoints([]);
      setDrawingMode('none');
    }
  };

  const handlePolygonEditorCancel = () => {
    setPolygonEditorOpen(false);
    setPendingPolygon(null);
    setSelectedPolygon(null);
    setSelectedPolygonLayerId(null);
    setCurrentPolygonPoints([]);
    setDrawingMode('none');
  };

  const handleSetSelectedPolygon = (polygon: MapPolygon | null, layerId?: string) => {
    setSelectedPolygon(polygon);
    setSelectedPolygonLayerId(layerId || null);
    setPolygonEditorOpen(!!polygon);
  };

  const handleReorderLayers = (newLayers: Layer[]) => {
    setLayers(newLayers);
    // Якщо activeLayerId не існує у нових шарах, вибираємо перший
    if (!newLayers.find(l => l.id === activeLayerId)) {
      setActiveLayerId(newLayers[0]?.id || '');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <button
          className="toggle-panel-btn"
          style={{
            left: isLayerPanelVisible ? 286 : 12,
            top: 84,
            width: 28,
            height: 28,
            transition: 'background 0.18s, color 0.18s, border-color 0.18s, left 0.3s, top 0.3s, width 0.18s, height 0.18s, box-shadow 0.18s',
            position: 'absolute',
            zIndex: 1001
          }}
          onClick={() => setIsLayerPanelVisible(v => !v)}
          title={isLayerPanelVisible ? 'Сховати панель шарів' : 'Показати панель шарів'}
        >
          <span className="material-icons" style={{ fontSize: 18, color: '#1976d2', transition: 'color 0.18s, font-size 0.18s' }}>
            {isLayerPanelVisible ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>
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
          onAddImageOverlay={handleAddImageOverlay}
          baseLayerId={layers[0]?.id}
          onReorderLayers={handleReorderLayers}
        />
        <div 
          className={`map-wrapper ${drawingMode === 'polyline' ? 'drawing-polyline' : ''}`}
          style={{ flexGrow: 1, position: 'relative' }}
        >
          <div className="drawing-toolbar">
            <button 
              className="icon-btn"
              onClick={handleAddIIIFOverlay}
              title="Додати IIIF мапу (IIIF Image API або manifest)"
            >
              <img src="/iiif-logo.png" alt="IIIF logo" style={{ height: 22, width: 22, marginRight: 6, verticalAlign: 'middle' }} />
              <span style={{ verticalAlign: 'middle' }}>IIIF мапа</span>
            </button>
            
            <button 
              className={`icon-btn${drawingMode === 'marker' ? ' active' : ''}`}
              onClick={() => toggleDrawingMode('marker')}
              disabled={!!selectedObject}
              title="Малювати маркер"
              style={{ marginLeft: '5px', marginRight: '5px', paddingLeft: '5px', paddingRight: '5px' }}
            >
              <span className="material-icons" style={{ fontSize: 18, marginRight: 4, verticalAlign: 'middle' }}>place</span>
              <span style={{ verticalAlign: 'middle' }}>Маркер</span>
            </button>
            <button 
              className={`icon-btn${drawingMode === 'polyline' ? ' active' : ''}`}
              onClick={() => toggleDrawingMode('polyline')}
              disabled={!!selectedObject}
              title="Малювати лінію"
              style={{ marginLeft: '5px', marginRight: '5px', paddingLeft: '5px', paddingRight: '5px' }}
            >
              <span className="material-icons" style={{ fontSize: 18, marginRight: 4, verticalAlign: 'middle' }}>timeline</span>
              <span style={{ verticalAlign: 'middle' }}>Лінія</span>
            </button>
            <button 
              className={`icon-btn${drawingMode === 'polygon' ? ' active' : ''}`}
              onClick={() => toggleDrawingMode('polygon')}
              disabled={!!selectedObject}
              title="Малювати полігон"
              style={{ marginLeft: '5px', marginRight: '5px', paddingLeft: '5px', paddingRight: '5px' }}
            >
              <span className="material-icons" style={{ fontSize: 18, marginRight: 4, verticalAlign: 'middle' }}>crop_square</span>
              <span style={{ verticalAlign: 'middle' }}>Полігон</span>
            </button>
            
            {/* GeoSearch input */}
            <div className="geo-search-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', position: 'relative' }}>
              <input
                type="text"
                placeholder="Пошук по географічних назвах"
                value={geoSearch}
                onChange={handleGeoSearch}
                style={{ 
                  width: 240, 
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              {geoResults.length > 0 && (
                <ul style={{ 
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: 200, 
                  overflowY: 'auto', 
                  margin: 0, 
                  padding: 0, 
                  listStyle: 'none',
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 1000
                }}>
                  {geoResults.map(result => (
                    <li
                      key={result.place_id}
                      style={{ 
                        cursor: 'pointer', 
                        padding: '8px 12px', 
                        borderBottom: '1px solid #eee',
                        fontSize: '14px'
                      }}
                      onClick={() => handleGeoResultSelect(result)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      {result.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
            selectedObject={selectedObject}
            currentPolylinePoints={currentPolylinePoints}
            onAddPolylinePoint={handleAddPolylinePoint}
            onDeletePolyline={handleDeletePolyline}
            onEditPolyline={handleEditPolyline}
            onDeletePolylinePoint={handleDeletePolylinePoint}
            selectedPolyline={selectedPolyline}
            onDeleteSelectedPolylineVertex={handleDeleteSelectedPolylineVertex}
            isLayerPanelVisible={isLayerPanelVisible}
            imageOverlayMode={!!pendingImageOverlay}
            imageOverlayCorners={imageOverlayCorners}
            onMapClickForImageOverlay={handleMapClickForImageOverlay}
            mapTypes={mapTypes}
            mapApiKeys={mapApiKeys}
            onMapRef={handleMapRef}
            currentPolygonPoints={currentPolygonPoints}
            onAddPolygonPoint={handleAddPolygonPoint}
            onDeletePolygonPoint={handleDeletePolygonPoint}
            onSetSelectedPolygon={handleSetSelectedPolygon}
            selectedPolygon={selectedPolygon}
          />
          {selectedObject && !selectedPolyline && 'lat' in selectedObject && 'lng' in selectedObject && (
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
          {pendingImageOverlay && (
            <div className="image-overlay-hint">
              {imageOverlayCorners.length === 0 && 'Клікніть на мапі перший кут зображення'}
              {imageOverlayCorners.length === 1 && 'Клікніть на мапі другий кут зображення'}
              {imageOverlayCorners.length === 2 && 'Клікніть на мапі третій кут зображення'}
              {imageOverlayCorners.length === 3 && 'Клікніть на мапі четвертий кут зображення'}
            </div>
          )}
          {showDeletePolylineDialog?.show && selectedPolyline && selectedPolylineLayerId && (
            <ConfirmationDialog
              isOpen={true}
              message={showDeletePolylineDialog.message}
              onConfirm={() => {
                handleDeleteSelectedPolyline();
                setShowDeletePolylineDialog(null);
              }}
              onCancel={() => setShowDeletePolylineDialog(null)}
            />
          )}
          {/* Діалог додавання мапи (зображення) */}
          <ImageOverlayDialog
            isOpen={isImageOverlayDialogOpen}
            onImageSelected={handleImageOverlaySelected}
            onCancel={handleCancelImageOverlay}
          />
          {isPolygonEditorOpen && (selectedPolygon || drawingMode === 'polygon') && (
            <div className="modal-overlay">
              <div className="modal-content">
                <PolygonEditor
                  key={selectedPolygon ? selectedPolygon.id : `drawing-${currentPolygonPoints.length}`}
                  selectedPolygon={selectedPolygon || {
                    id: '',
                    coordinates: currentPolygonPoints,
                    color: '',
                    fillColor: '',
                    opacity: 0.3,
                    title: '',
                    description: '',
                  }}
                  onUpdate={handlePolygonEditorSave}
                  onDelete={selectedPolygon ? handlePolygonEditorDelete : handlePolygonEditorCancel}
                  onClose={handlePolygonEditorCancel}
                  isDrawing={!selectedPolygon && drawingMode === 'polygon'}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 