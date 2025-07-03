import React, { useEffect, useRef, useState } from 'react';

export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
}

export interface PolygonData {
  id: string;
  points: [number, number][];
}

interface LeafletMapProps {
  markers: (MarkerData & { _layerOpacity?: number })[];
  polygons: (PolygonData & { _layerOpacity?: number })[];
  onAddMarker: (lat: number, lng: number) => void;
  onDeleteMarker: (id: string) => void;
  onAddPolygon: (points: [number, number][]) => void;
  onDeletePolygon: (id: string) => void;
  onMoveMarker?: (id: string, lat: number, lng: number) => void;
  activeLayerId?: string;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  markers,
  polygons,
  onAddMarker,
  onDeleteMarker,
  onAddPolygon,
  onDeletePolygon,
  onMoveMarker,
  activeLayerId
}) => {
  const mapRef = useRef<any>(null);
  const [polygonMode, setPolygonMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const polygonLayerRef = useRef<any>(null);
  const markerLayerRefs = useRef<Record<string, any>>({});
  const polygonLayerRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = (window as any).L.map('map').setView([49.8397, 24.0297], 13);
      (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);

      mapRef.current.on('click', (e: any) => {
        if (polygonMode) {
          setPolygonPoints(points => [...points, [e.latlng.lat, e.latlng.lng]]);
        } else {
          onAddMarker(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    const onDblClick = () => {
      if (polygonPoints.length >= 3) {
        if (polygonLayerRef.current) {
          mapRef.current.removeLayer(polygonLayerRef.current);
        }
        onAddPolygon(polygonPoints);
        setPolygonPoints([]);
        setPolygonMode(false);
      }
    };
    mapRef.current.on('dblclick', onDblClick);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('dblclick', onDblClick);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [polygonMode, polygonPoints, onAddMarker, onAddPolygon]);

  // Рендеримо поточний полігон (під час малювання)
  useEffect(() => {
    if (!mapRef.current) return;
    if (polygonLayerRef.current) {
      mapRef.current.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    if (polygonPoints.length > 1) {
      polygonLayerRef.current = (window as any).L.polygon(polygonPoints, { color: 'blue', dashArray: '5,5' }).addTo(mapRef.current);
    }
  }, [polygonPoints]);

  // Синхронізуємо маркери
  useEffect(() => {
    if (!mapRef.current) return;
    Object.values(markerLayerRefs.current).forEach(layer => mapRef.current.removeLayer(layer));
    markerLayerRefs.current = {};
    markers.forEach(marker => {
      const m = (window as any).L.marker([marker.lat, marker.lng], { draggable: true })
        .addTo(mapRef.current)
        .bindPopup(`<button id="del-marker-${marker.id}">Видалити</button>`);
      if (typeof marker._layerOpacity === 'number') {
        m.setOpacity(marker._layerOpacity);
      }
      m.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`del-marker-${marker.id}`);
          if (btn) btn.onclick = () => onDeleteMarker(marker.id);
        }, 0);
      });
      if (onMoveMarker) {
        m.on('dragend', (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          onMoveMarker(marker.id, lat, lng);
        });
      }
      markerLayerRefs.current[marker.id] = m;
    });
  }, [markers, onDeleteMarker, onMoveMarker]);

  // Синхронізуємо полігони
  useEffect(() => {
    if (!mapRef.current) return;
    Object.values(polygonLayerRefs.current).forEach(layer => mapRef.current.removeLayer(layer));
    polygonLayerRefs.current = {};
    polygons.forEach(polygon => {
      const opts: any = { color: 'red' };
      if (typeof polygon._layerOpacity === 'number') opts.opacity = polygon._layerOpacity;
      const p = (window as any).L.polygon(polygon.points, opts)
        .addTo(mapRef.current)
        .bindPopup(`<button id="del-polygon-${polygon.id}">Видалити</button>`);
      polygonLayerRefs.current[polygon.id] = p;
      p.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`del-polygon-${polygon.id}`);
          if (btn) btn.onclick = () => onDeletePolygon(polygon.id);
        }, 0);
      });
    });
  }, [polygons, onDeletePolygon]);

  // Додати overlay через distortableimage (залишаємо як у попередньому прикладі)
  const handleAddOverlay = () => {
    const corners = [
      [49.84, 24.02],
      [49.84, 24.04],
      [49.82, 24.04],
      [49.82, 24.02]
    ];
    (window as any).L.distortableImageOverlay('https://upload.wikimedia.org/wikipedia/commons/6/6e/Golde33443.jpg', {
      corners
    }).addTo(mapRef.current);
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ position: 'absolute', zIndex: 1000, left: 10, top: 10 }}>
        <button onClick={() => setPolygonMode(m => !m)} style={{ marginRight: 8 }}>
          {polygonMode ? 'Малюю полігон...' : 'Додати полігон'}
        </button>
        <button onClick={handleAddOverlay}>Додати overlay</button>
        {polygonMode && <span style={{ marginLeft: 10, color: 'blue' }}>Клацай точки, подвійний клік — завершити</span>}
      </div>
      <div id="map" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default LeafletMap; 