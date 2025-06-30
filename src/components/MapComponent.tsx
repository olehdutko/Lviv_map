import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layer, MapMarker } from '../types';
import MarkersLayer from './MarkersLayer';

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
}

// Internal component to handle map events, as it must be a child of MapContainer
const MapEventsHandler: React.FC<{
  drawingMode: 'marker' | 'polygon' | 'polyline' | 'none';
  onMarkerAdd: (latlng: L.LatLng) => void;
}> = ({ drawingMode, onMarkerAdd }) => {
  useMapEvents({
    click(e) {
      if (drawingMode === 'marker') {
        onMarkerAdd(e.latlng);
      }
    },
  });
  return null; // This component does not render anything
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

const MapComponent: React.FC<MapComponentProps> = ({ 
  layers, 
  activeLayerId, 
  onUpdateLayer,
  drawingMode,
  onSetSelectedObject
}) => {
  const lvivPosition: [number, number] = [49.8397, 24.0297];
  
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapEventsHandler drawingMode={drawingMode} onMarkerAdd={handleAddMarker} />
      <CompassControl />

      <MarkersLayer
        layers={layers}
        activeLayerId={activeLayerId}
        onUpdateLayer={onUpdateLayer}
        onSetSelectedObject={onSetSelectedObject}
      />

      {/* polygons and polylines layers will go here in the future */}
    </MapContainer>
  );
};

export default MapComponent; 