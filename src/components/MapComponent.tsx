import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap, Rectangle, ImageOverlay } from 'react-leaflet';
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
  onSetSelectedObject: (object: MapMarker | null) => void;
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

type DraggableImageOverlayProps = {
  overlay: MapImageOverlay;
  layerId: string;
  imageOverlays: MapImageOverlay[];
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
};

const DraggableImageOverlay: React.FC<DraggableImageOverlayProps> = ({ overlay, layerId, imageOverlays, onUpdateLayer }) => {
  if (!overlay.corners || overlay.corners.length !== 4) return null;

  // Сортуємо кути для bounds: [topLeft, bottomRight]
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...overlay.corners.map(c => c[0])), Math.min(...overlay.corners.map(c => c[1]))],
    [Math.max(...overlay.corners.map(c => c[0])), Math.max(...overlay.corners.map(c => c[1]))],
  ];

  const handleDrag = (index: number, e: L.LeafletEvent) => {
    const marker = e.target as L.Marker;
    const newPos: [number, number] = [marker.getLatLng().lat, marker.getLatLng().lng];
    let newCorners = [...(overlay.corners as [number, number][])];
    newCorners[index] = newPos;
    onUpdateLayer(layerId, {
      imageOverlays: imageOverlays.map(o => o.id === overlay.id ? { ...o, corners: newCorners } : o)
    });
  };

  return (
    <>
      <ImageOverlay
        url={overlay.imageUrl}
        bounds={bounds}
        opacity={typeof overlay.opacity === 'number' ? overlay.opacity : 1}
      />
      {overlay.corners.map((corner, i) => (
        <Marker
          key={i}
          position={corner}
          draggable={true}
          eventHandlers={{
            dragend: (e: L.LeafletEvent) => handleDrag(i, e)
          }}
        />
      ))}
    </>
  );
};

const MapComponent: React.FC<MapComponentProps> = ({ 
  layers, 
  activeLayerId, 
  onUpdateLayer,
  drawingMode,
  onSetSelectedObject,
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

  useEffect(() => {
    console.log('imageOverlays:', layers.flatMap(l => l.imageOverlays));
    const map = mapRef.current;
    // @ts-ignore
    if (!map || !window.L || !window.L.georeferenced) return;
    // @ts-ignore
    if (!map._osrGeoOverlays) map._osrGeoOverlays = {};
    layers.filter(l => l.visible).forEach(layer => {
      (layer.imageOverlays || []).forEach(overlay => {
        // @ts-ignore
        if (map._osrGeoOverlays[overlay.id]) return;
        if (!overlay.corners) return;
        // @ts-ignore
        const geo = window.L.georeferenced(
          overlay.imageUrl,
          overlay.corners
        ).addTo(map);
        // @ts-ignore
        map._osrGeoOverlays[overlay.id] = geo;
      });
    });
    // @ts-ignore
    Object.keys(map._osrGeoOverlays).forEach(id => {
      const stillExists = layers.some(l => l.visible && (l.imageOverlays || []).some(o => o.id === id));
      if (!stillExists) {
        // @ts-ignore
        map.removeLayer(map._osrGeoOverlays[id]);
        // @ts-ignore
        delete map._osrGeoOverlays[id];
      }
    });
  }, [layers]);

  return (
    <MapContainer center={lvivPosition} zoom={13} style={{ flexGrow: 1 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapEventsHandler 
        drawingMode={drawingMode} 
        onMarkerAdd={handleAddMarker}
        onPolylinePointAdd={handleAddPolylinePoint} 
        imageOverlayMode={imageOverlayMode}
        onMapClickForImageOverlay={onMapClickForImageOverlay}
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
          .filter(overlay => overlay.corners && overlay.corners.length === 4 && overlay.visible !== false)
          .map(overlay => (
            <DraggableImageOverlay
              key={overlay.id}
              overlay={overlay}
              layerId={layer.id}
              imageOverlays={layer.imageOverlays}
              onUpdateLayer={onUpdateLayer}
            />
          ))
      )}
    </MapContainer>
  );
};

export default MapComponent; 