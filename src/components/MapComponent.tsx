import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap, Rectangle, ImageOverlay, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layer, MapMarker, MapPolyline, MapImageOverlay } from '../types';
import MarkersLayer from './MarkersLayer';
import PolylinesLayer from './PolylinesLayer';
import DrawingVerticesLayer from './DrawingVerticesLayer';

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
  currentMapType: 'plan' | 'satellite' | 'landscape' | 'humanitarian' | 'transport' | 'cycle' | 'cartoLight' | 'cartoDark';
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

const MapComponent: React.FC<MapComponentProps> = ({ 
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
  currentMapType,
  mapTypes,
  mapApiKeys,
}) => {
  const lvivPosition: [number, number] = [49.8397, 24.0297];
  const mapRef = useRef<L.Map | null>(null);
  
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
      <TileLayer
        attribution={mapTypes[currentMapType].attribution}
        url={mapTypes[currentMapType].url}
      />
      
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
    </MapContainer>
  );
};

export default MapComponent; 