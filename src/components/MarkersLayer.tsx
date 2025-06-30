import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Layer, MapMarker } from '../types';

interface MarkersLayerProps {
  layers: Layer[];
  activeLayerId: string;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onSetSelectedObject: (object: MapMarker | null) => void;
}

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

const MarkersLayer: React.FC<MarkersLayerProps> = ({
  layers,
  activeLayerId,
  onUpdateLayer,
  onSetSelectedObject
}) => {
  const handleMarkerDrag = (marker: MapMarker, newLatLng: L.LatLng) => {
    const layer = layers.find(l => l.markers.some(m => m.id === marker.id));
    if (!layer) return;

    const updatedMarkers = layer.markers.map(m => 
      m.id === marker.id ? { ...m, lat: newLatLng.lat, lng: newLatLng.lng } : m
    );
    onUpdateLayer(layer.id, { markers: updatedMarkers });
  };

  return (
    <>
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
              <Tooltip offset={[0, -35]} direction="top">
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
    </>
  );
};

export default MarkersLayer; 