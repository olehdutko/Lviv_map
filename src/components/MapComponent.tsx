import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layer, MapMarker } from '../types';

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

// Helper to create colored markers
const createColoredMarkerIcon = (color: string, iconName?: string) => {
  const iconHtml = iconName 
    ? `<i class="material-icons" style="font-size: 18px; color: white;">${iconName}</i>` 
    : '';

  const html = `
    <div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      border: 1px solid #FFFFFF;
      transform: rotate(-45deg);
      display: flex;
      justify-content: center;
      align-items: center;
    ">
      <div style="transform: rotate(45deg);">
        ${iconHtml}
      </div>
    </div>`;

  return L.divIcon({
    html: html,
    className: 'custom-marker-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};


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

      {layers.filter(layer => layer.visible).map(layer => (
        <React.Fragment key={layer.id}>
          {layer.markers.map(marker => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              opacity={layer.opacity}
              icon={createColoredMarkerIcon(marker.color || layer.drawingSettings.markerColor, marker.iconName)}
              draggable={true}
              eventHandlers={{
                dragend: (e) => handleMarkerDrag(marker, e.target.getLatLng()),
                click: () => onSetSelectedObject(marker),
              }}
            >
              <Tooltip>
                <div className="tooltip-content">
                  {marker.imageUrl && <img src={marker.imageUrl} alt={marker.title || 'Зображення маркера'} className="tooltip-image" />}
                  <h4>{marker.title || 'Маркер'}</h4>
                  {marker.description && (
                    <div dangerouslySetInnerHTML={{ __html: marker.description }} />
                  )}
                </div>
              </Tooltip>
            </Marker>
          ))}
        </React.Fragment>
      ))}
    </MapContainer>
  );
};

export default MapComponent; 