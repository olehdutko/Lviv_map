import React from 'react';
import { Polyline, Tooltip, Rectangle } from 'react-leaflet';
import { Layer, MapPolyline } from '../types';

interface PolylinesLayerProps {
  layers: Layer[];
  currentPolylinePoints?: [number, number][];
  onDeletePolyline: (layerId: string, polylineId: string) => void;
  onEditPolyline: (polyline: MapPolyline, layerId: string) => void;
  selectedPolyline?: MapPolyline | null;
}

const PolylinesLayer: React.FC<PolylinesLayerProps> = ({
  layers,
  currentPolylinePoints,
  onDeletePolyline,
  onEditPolyline,
  selectedPolyline,
}) => {
  return (
    <>
      {/* Render saved polylines */}
      {layers.filter(layer => layer.visible).map(layer => (
        <React.Fragment key={layer.id}>
          {layer.polylines.map(polyline => {
            const isSelected = selectedPolyline && polyline.id === selectedPolyline.id;
            const isValidPolyline = Array.isArray(polyline.coordinates) && polyline.coordinates.length >= 2 && polyline.coordinates.every(
              c => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1])
            );
            if (!isValidPolyline) {
              return null;
            }
            const rawCoords = polyline.coordinates;
            const leafletCoords = rawCoords.map(([lat, lng]) => ({ lat, lng }));
            return (
              <React.Fragment key={polyline.id}>
                {isSelected && (() => {
                  const sw = (window as any).L.latLngBounds(rawCoords).getSouthWest();
                  const ne = (window as any).L.latLngBounds(rawCoords).getNorthEast();
                  const boundsArr: [number, number, number?][] = [
                    [sw.lat, sw.lng],
                    [ne.lat, ne.lng]
                  ];
                  if (boundsArr.length !== 2) return null;
                  return (
                    <Rectangle
                      className="selection-rectangle"
                      bounds={boundsArr}
                      pathOptions={{
                        color: '#1976d2',
                        weight: 1,
                        fillColor: polyline.color || layer.drawingSettings.polylineColor,
                        fillOpacity: 0.15,
                      }}
                    />
                  );
                })()}
                <Polyline
                  positions={leafletCoords}
                  pathOptions={{
                    color: polyline.color || layer.drawingSettings.polylineColor,
                    weight: polyline.weight || layer.drawingSettings.polylineWeight,
                    dashArray: polyline.dashArray || layer.drawingSettings.polylineDashArray,
                    opacity: layer.opacity,
                  }}
                  eventHandlers={{
                    click: () => onEditPolyline(polyline, layer.id),
                  }}
                >
                  <Tooltip sticky>
                    <div className="tooltip-content">
                      <h4>{polyline.title || 'Лінія'}</h4>
                      {polyline.description && (
                        <div dangerouslySetInnerHTML={{ __html: polyline.description }} />
                      )}
                      {polyline.imageUrl && <img src={polyline.imageUrl} alt={polyline.title || 'Зображення лінії'} className="tooltip-image" />}
                    </div>
                  </Tooltip>
                </Polyline>
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}

      {/* Render the polyline currently being drawn */}
      {currentPolylinePoints && currentPolylinePoints.length > 0 && (
        <Polyline
          positions={currentPolylinePoints.map(([lat, lng]) => ({ lat, lng }))}
          pathOptions={{
            color: 'grey',
            weight: 3,
            dashArray: '5, 5',
          }}
        />
      )}
    </>
  );
};

export default PolylinesLayer; 