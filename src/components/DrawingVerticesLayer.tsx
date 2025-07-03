import React from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';

interface DrawingVerticesLayerProps {
  points: [number, number][];
  onDeletePoint: (index: number) => void;
}

const DrawingVerticesLayer: React.FC<DrawingVerticesLayerProps> = ({ points, onDeletePoint }) => {
  if (!points || points.length === 0) {
    return null;
  }

  return (
    <>
      {points.map((point, index) => (
        <CircleMarker
          key={index}
          center={point}
          radius={3}
          pathOptions={{ color: '#dc3545', fillColor: '#ff4d4d', fillOpacity: 1, weight: 1 }}
          eventHandlers={{
            click: (e) => {
              (window as any).L.DomEvent.stopPropagation(e.originalEvent);
              onDeletePoint(index);
            },
          }}
        >
          <Tooltip>Клік, щоб видалити</Tooltip>
        </CircleMarker>
      ))}
    </>
  );
};

export default DrawingVerticesLayer; 