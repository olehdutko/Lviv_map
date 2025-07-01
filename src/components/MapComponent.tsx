import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap, Rectangle, ImageOverlay, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layer, MapMarker, MapPolyline, MapImageOverlay } from '../types';
import MarkersLayer from './MarkersLayer';
import PolylinesLayer from './PolylinesLayer';
import DrawingVerticesLayer from './DrawingVerticesLayer';
import IIIFOverlay from './IIIFOverlay';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Extend Leaflet's L namespace to include the Compass control
declare module 'leaflet' {
  namespace Control {
    class Compass extends Control {
      constructor(options?: any);
    }
    function compass(options?: any): Compass;
  }
}

interface MapComponentProps {
  layers: Layer[];
  activeLayerId: string;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  drawingMode: 'marker' | 'polygon' | 'polyline' | 'none';
  onSetSelectedObject: (object: MapMarker | MapImageOverlay | null) => void;
  selectedObject: MapMarker | MapImageOverlay | null;
  currentPolylinePoints: [number, number][];
  onAddPolylinePoint: (point: [number, number]) => void;
  onDeletePolyline: (layerId: string, polylineId: string) => void;
  onEditPolyline: (polyline: MapPolyline, layerId: string) => void;
  onDeletePolylinePoint: (index: number) => void;
  selectedPolyline: MapPolyline | null;
  onDeleteSelectedPolylineVertex: (index: number) => void;
  isLayerPanelVisible: boolean;
  imageOverlayMode: boolean;
  imageOverlayCorners: [number, number][];
  onMapClickForImageOverlay: (latlng: [number, number]) => void;
  mapTypes: {
    plan: { url: string; attribution: string };
    satellite: { url: string; attribution: string };
    landscape: { url: string; attribution: string };
    humanitarian: { url: string; attribution: string };
    transport: { url: string; attribution: string };
    cycle: { url: string; attribution: string };
    cartoLight: { url: string; attribution: string };
    cartoDark: { url: string; attribution: string };
  };
  mapApiKeys: {
    thunderforest: string;
    carto: string;
  };
}

// Internal component to handle map events, as it must be a child of MapContainer
const MapEventsHandler: React.FC<{
  drawingMode: 'marker' | 'polygon' | 'polyline' | 'none';
  onMarkerAdd: (latlng: L.LatLng) => void;
  onPolylinePointAdd: (latlng: L.LatLng) => void;
  imageOverlayMode: boolean;
  onMapClickForImageOverlay: (latlng: [number, number]) => void;
}> = ({ drawingMode, onMarkerAdd, onPolylinePointAdd, imageOverlayMode, onMapClickForImageOverlay }) => {
  useMapEvents({
    click(e) {
      if (imageOverlayMode) {
        onMapClickForImageOverlay([e.latlng.lat, e.latlng.lng]);
      } else if (drawingMode === 'marker') {
        onMarkerAdd(e.latlng);
      } else if (drawingMode === 'polyline') {
        onPolylinePointAdd(e.latlng);
      }
    },
  });
  return null; // This component does not render anything
};

const MapResizer: React.FC<{ isPanelVisible: boolean }> = ({ isPanelVisible }) => {
  const map = useMap();
  useEffect(() => {
    // We wait 300ms to match the CSS transition duration of the panel
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => clearTimeout(timer);
  }, [isPanelVisible, map]);

  return null;
};

const CompassControl = () => {
  const map = useMap();

  useEffect(() => {
    // Check if the plugin is loaded
    if (L.Control.Compass) {
      const compass = new L.Control.Compass({
        autoActive: true,
        showDigit: false,
        position: 'topleft'
      });
      map.addControl(compass);

      return () => {
        // Cleanup: remove control when component unmounts
        map.removeControl(compass);
      };
    }
  }, [map]);

  return null;
};

interface DraggableImageOverlayProps {
  overlay: MapImageOverlay;
  layerId: string;
  imageOverlays: MapImageOverlay[];
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  selected: boolean;
  onSetSelectedObject: (object: MapImageOverlay) => void;
}

const DraggableImageOverlay: React.FC<DraggableImageOverlayProps> = ({ overlay, layerId, imageOverlays, onUpdateLayer, selected, onSetSelectedObject }) => {
  if (!overlay.corners || overlay.corners.length !== 2) return null;

  // corners: [[minLat, minLng], [maxLat, maxLng]]
  const bounds: [[number, number], [number, number]] = overlay.corners;
  const [topLeft, bottomRight] = bounds;
  const topRight: [number, number] = [topLeft[0], bottomRight[1]];
  const bottomLeft: [number, number] = [bottomRight[0], topLeft[1]];
  const cornersArr: [number, number][] = [topLeft, topRight, bottomRight, bottomLeft];

  // Debug: лог bounds
  console.log('Overlay bounds:', bounds);
  if (
    bounds.some(([lat, lng]) => isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng))
  ) {
    return <div style={{color: 'red', background: 'white'}}>Некоректні bounds overlay: {JSON.stringify(bounds)}</div>;
  }

  // index: 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
  const handleDrag = (index: number, e: L.LeafletEvent) => {
    const marker = e.target as L.Marker;
    const newPos: [number, number] = [marker.getLatLng().lat, marker.getLatLng().lng];
    let newBounds: [[number, number], [number, number]] = [...bounds];
    switch (index) {
      case 0: // topLeft
        newBounds = [newPos, bottomRight];
        break;
      case 1: // topRight
        newBounds = [[newPos[0], bottomLeft[1]], [bottomRight[0], newPos[1]]];
        break;
      case 2: // bottomRight
        newBounds = [topLeft, newPos];
        break;
      case 3: // bottomLeft
        newBounds = [[topLeft[0], newPos[1]], [newPos[0], topRight[1]]];
        break;
    }
    onUpdateLayer(layerId, {
      imageOverlays: imageOverlays.map(o => o.id === overlay.id ? { ...o, corners: normalizeBounds(newBounds) } : o)
    });
  };

  // Кастомний divIcon для поінта
  const pointIcon = L.divIcon({
    className: '',
    html: '<div style="width:6px;height:6px;border-radius:50%;background:#ff4d4d;border:1px solid #d32f2f;box-shadow:0 0 1px #333;"></div>',
    iconSize: [6, 6],
    iconAnchor: [3, 3],
  });

  return (
    <>
      <ImageOverlay
        url={overlay.imageUrl}
        bounds={bounds}
        opacity={typeof overlay.opacity === 'number' ? overlay.opacity : 1}
      />
      <Rectangle
        bounds={bounds}
        pathOptions={{ color: 'transparent', weight: 1, fillOpacity: 0, interactive: true }}
        eventHandlers={{
          click: () => onSetSelectedObject(overlay)
        }}
      />
      {selected && cornersArr.map((corner, i) => (
        <Marker
          key={i}
          position={corner}
          icon={pointIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e: L.LeafletEvent) => handleDrag(i, e)
          }}
        />
      ))}
    </>
  );
};

function normalizeBounds(bounds: [[number, number], [number, number]]): [[number, number], [number, number]] {
  const lats = [bounds[0][0], bounds[1][0]];
  const lngs = [bounds[0][1], bounds[1][1]];
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  ];
}

// Хук для зняття виділення overlay при кліку поза ним
const DeselectOverlayOnMapClick: React.FC<{
  selectedObject: MapMarker | MapImageOverlay | null;
  onSetSelectedObject: (object: MapMarker | MapImageOverlay | null) => void;
}> = ({ selectedObject, onSetSelectedObject }) => {
  useMapEvents({
    click: () => {
      if (selectedObject && 'corners' in selectedObject) {
        onSetSelectedObject(null);
      }
    }
  });
  return null;
};

const MapComponent: React.FC<MapComponentProps & { onShowSnackbar?: (msg: string) => void }> = ({ 
  layers, 
  activeLayerId, 
  onUpdateLayer,
  drawingMode,
  onSetSelectedObject,
  selectedObject,
  currentPolylinePoints,
  onAddPolylinePoint,
  onDeletePolyline,
  onEditPolyline,
  onDeletePolylinePoint,
  selectedPolyline,
  onDeleteSelectedPolylineVertex,
  isLayerPanelVisible,
  imageOverlayMode,
  imageOverlayCorners,
  onMapClickForImageOverlay,
  mapTypes,
  mapApiKeys,
  onShowSnackbar,
}) => {
  const lvivPosition: [number, number] = [49.8397, 24.0297];
  const mapRef = useRef<L.Map | null>(null);
  const [iiifOverlays, setIiifOverlays] = React.useState<{id: string, url: string, visible?: boolean}[]>([]);

  const activeLayer = layers.find(l => l.id === activeLayerId);
  const mapType = (activeLayer?.mapType as keyof typeof mapTypes) || 'plan';
  const opacity = activeLayer?.opacity ?? 1;
  const visible = activeLayer?.visible ?? true;

  const handleAddIIIFOverlay = async () => {
    const url = window.prompt('Введіть IIIF Image API info.json або manifest URL:');
    if (!url) return;
    let infoUrl = url;
    try {
      if (url.endsWith('manifest') || url.includes('presentation')) {
        // Це manifest, треба знайти info.json
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Не вдалося завантажити manifest');
        const manifest = await resp.json();
        // IIIF Presentation API 2.x
        const canvas = manifest.sequences?.[0]?.canvases?.[0];
        const service = canvas?.images?.[0]?.resource?.service;
        let serviceId = service?.['@id'] || service?.id;
        if (!serviceId && Array.isArray(service)) serviceId = service[0]?.['@id'] || service[0]?.id;
        if (serviceId) {
          infoUrl = serviceId.replace(/\/$/, '') + '/info.json';
          setIiifOverlays(prev => [
            ...prev,
            { id: `iiif-${Date.now()}`, url: infoUrl, visible: true }
          ]);
          return;
        } else {
          // fallback: додаємо тільки у imageOverlays активного шару, НЕ у iiifOverlays
          const imageUrl = canvas?.images?.[0]?.resource?.['@id'] || canvas?.images?.[0]?.resource?.id;
          const width = canvas?.width;
          const height = canvas?.height;
          if (imageUrl) {
            let bounds: [[number, number], [number, number]];
            const center: [number, number] = [49.8397, 24.0297];
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
            onUpdateLayer(activeLayerId, {
              imageOverlays: [
                ...((layers.find(l => l.id === activeLayerId)?.imageOverlays) || []),
                newOverlay
              ]
            });
            onShowSnackbar && onShowSnackbar('IIIF Image API не знайдено, додано як просте зображення');
            onSetSelectedObject && onSetSelectedObject(newOverlay);
            return;
          }
          throw new Error('Не знайдено IIIF Image API у manifest і немає прямого зображення');
        }
      }
      // Якщо це info.json, додаємо як IIIFOverlay
      setIiifOverlays(prev => [
        ...prev,
        { id: `iiif-${Date.now()}`, url: infoUrl, visible: true }
      ]);
    } catch (e) {
      alert('Помилка підключення IIIF: ' + (e as Error).message);
    }
  };

  const handleAddMarker = (latlng: L.LatLng) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) {
      alert("Активний шар не знайдено!");
      return;
    }
    const newMarker: MapMarker = {
      id: `marker-${Date.now()}`,
      lat: latlng.lat,
      lng: latlng.lng,
      title: `Маркер ${new Date().toLocaleTimeString()}`,
      color: activeLayer.drawingSettings.markerColor,
    };
    onUpdateLayer(activeLayerId, {
      markers: [...activeLayer.markers, newMarker]
    });
  };

  const handleAddPolylinePoint = (latlng: L.LatLng) => {
    onAddPolylinePoint([latlng.lat, latlng.lng]);
  };

  const handleMarkerDrag = (marker: MapMarker, newLatLng: L.LatLng) => {
    const layer = layers.find(l => l.markers.some(m => m.id === marker.id));
    if (!layer) return;

    const updatedMarkers = layer.markers.map(m => 
      m.id === marker.id ? { ...m, lat: newLatLng.lat, lng: newLatLng.lng } : m
    );
    onUpdateLayer(layer.id, { markers: updatedMarkers });
  };

  return (
    <MapContainer center={lvivPosition} zoom={13} style={{ flexGrow: 1 }}>
      {layers.filter(l => l.visible).map(layer => (
        <TileLayer
          key={layer.id}
          attribution={mapTypes[layer.mapType as keyof typeof mapTypes].attribution}
          url={mapTypes[layer.mapType as keyof typeof mapTypes].url}
          opacity={layer.opacity ?? 1}
        />
      ))}
      
      <MapEventsHandler 
        drawingMode={drawingMode} 
        onMarkerAdd={handleAddMarker}
        onPolylinePointAdd={handleAddPolylinePoint} 
        imageOverlayMode={imageOverlayMode}
        onMapClickForImageOverlay={onMapClickForImageOverlay}
      />
      <DeselectOverlayOnMapClick
        selectedObject={selectedObject}
        onSetSelectedObject={onSetSelectedObject}
      />
      <CompassControl />
      <MapResizer isPanelVisible={isLayerPanelVisible} />

      <MarkersLayer
        layers={layers}
        activeLayerId={activeLayerId}
        onUpdateLayer={onUpdateLayer}
        onSetSelectedObject={onSetSelectedObject}
      />
      
      <PolylinesLayer
        layers={layers}
        currentPolylinePoints={currentPolylinePoints}
        onDeletePolyline={onDeletePolyline}
        onEditPolyline={onEditPolyline}
        selectedPolyline={selectedPolyline}
      />

      <DrawingVerticesLayer
        points={currentPolylinePoints}
        onDeletePoint={onDeletePolylinePoint}
      />

      {selectedPolyline && (
        <DrawingVerticesLayer
          points={selectedPolyline.coordinates}
          onDeletePoint={onDeleteSelectedPolylineVertex}
        />
      )}

      {/* Preview rectangle for image overlay selection (тільки для вибору кутів) */}
      {imageOverlayMode && imageOverlayCorners.length > 0 && (
        <Rectangle
          bounds={
            imageOverlayCorners.length === 1
              ? [imageOverlayCorners[0], imageOverlayCorners[0]]
              : [imageOverlayCorners[0], imageOverlayCorners[imageOverlayCorners.length - 1]]
          }
          pathOptions={{ color: '#1976d2', weight: 2, dashArray: '4 4', fillOpacity: 0.1 }}
        />
      )}

      {/* Image overlays with draggable bounds */}
      {layers.filter(layer => layer.visible).flatMap(layer =>
        (layer.imageOverlays || [])
          .map(overlay => {
            console.log('Overlay in render:', overlay);
            if (!overlay.corners || overlay.corners.length !== 2 || overlay.visible === false) return null;
            return (
              <DraggableImageOverlay
                key={overlay.id}
                overlay={overlay}
                layerId={layer.id}
                imageOverlays={layer.imageOverlays}
                onUpdateLayer={onUpdateLayer}
                selected={!!selectedObject && 'id' in selectedObject && overlay.id === selectedObject.id}
                onSetSelectedObject={onSetSelectedObject}
              />
            );
          })
      )}

      {/* IIIF overlays */}
      {iiifOverlays
        .filter(o => o.visible !== false && o.url && o.url.endsWith('info.json'))
        .map(overlay => (
          <IIIFOverlay key={overlay.id} url={overlay.url} />
      ))}
      <button style={{ position: 'absolute', top: 70, right: 16, zIndex: 1200 }} onClick={handleAddIIIFOverlay}>
        Додати IIIF мапу
      </button>
    </MapContainer>
  );
};

export default MapComponent; 