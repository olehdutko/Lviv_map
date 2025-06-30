import React from 'react';
import { Polyline, Tooltip, Rectangle } from 'react-leaflet';
import L from 'leaflet';
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
            return (
              <React.Fragment key={polyline.id}>
                {isSelected && polyline.coordinates.length >= 2 && (
                  <Rectangle
                    className="selection-rectangle"
                    bounds={L.polyline(polyline.coordinates).getBounds()}
                    pathOptions={{
                      color: '#1976d2',      // blue border
                      weight: 1,              // 1px thick
                      fillColor: polyline.color || layer.drawingSettings.polylineColor,
                      fillOpacity: 0.15,      // 15% opacity
                    }}
                  />
                )}
                <Polyline
                  positions={polyline.coordinates}
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
                      {polyline.imageUrl && <img src={polyline.imageUrl} alt={polyline.title || 'Зображення лінії'} className="tooltip-image" />}
                      <h4>{polyline.title || 'Лінія'}</h4>
                      {polyline.description && (
                        <div dangerouslySetInnerHTML={{ __html: polyline.description }} />
                      )}
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
          positions={currentPolylinePoints}
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