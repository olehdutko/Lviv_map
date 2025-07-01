import React, { useState, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const INITIAL_VIEW_STATE = {
  longitude: 24.0297,
  latitude: 49.8397,
  zoom: 13,
  pitch: 0,
  bearing: 0,
};

// --- Міграція leaflet-структури у maplibre-формат ---
function migrateLeafletToMaplibre(data: any) {
  // Маркери
  const markers = (data.markers || []).map(m => ({
    longitude: m.lng,
    latitude: m.lat,
    ...m,
  }));

  // Лінії
  const linesGeojson = {
    type: 'FeatureCollection',
    features: (data.polylines || []).map(line => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: line.coordinates,
      },
      properties: { ...line },
    })),
  };

  // Полігони
  const polygonsGeojson = {
    type: 'FeatureCollection',
    features: (data.polygons || []).map(poly => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [poly.coordinates],
      },
      properties: { ...poly },
    })),
  };

  // Оверлеї
  const overlays = (data.overlays || []).map(ov => ({
    ...ov,
    // corners: [[lng, lat], ...4] у порядку: top-left, top-right, bottom-right, bottom-left
    coordinates: ov.corners,
  }));

  return { markers, linesGeojson, polygonsGeojson, overlays };
}

// --- Початкові дані (можна замінити на свої) ---
const initialData = {
  markers: [{ lat: 49.8397, lng: 24.0297, title: 'Маркер' }],
  polylines: [{ coordinates: [[24.0297, 49.8397], [24.0397, 49.8397], [24.0397, 49.8497]], color: '#1976d2' }],
  polygons: [{ coordinates: [[24.025, 49.835], [24.035, 49.835], [24.035, 49.845], [24.025, 49.845], [24.025, 49.835]], color: '#ff4d4d' }],
  overlays: [{
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Map_of_Lviv_1917.jpg',
    corners: [
      [24.025, 49.845], // top-left
      [24.035, 49.845], // top-right
      [24.035, 49.835], // bottom-right
      [24.025, 49.835], // bottom-left
    ]
  }]
};

export default function MapLibreComponent() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [data, setData] = useState(() => migrateLeafletToMaplibre(initialData));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Експорт ---
  const handleExport = () => {
    const exportData = JSON.stringify(initialData, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Імпорт ---
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        setData(migrateLeafletToMaplibre(imported));
      } catch (err) {
        alert('Некоректний файл!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Map
        mapLib={import('maplibre-gl')}
        initialViewState={viewState}
        viewState={viewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://demotiles.maplibre.org/style.json"
        onMove={evt => setViewState(evt.viewState)}
      >
        {/* Маркери */}
        {data.markers.map((m, i) => (
          <Marker key={i} longitude={m.longitude} latitude={m.latitude} />
        ))}
        {/* Лінії */}
        <Source id="lines" type="geojson" data={data.linesGeojson}>
          <Layer id="line-layer" type="line" paint={{ 'line-color': '#1976d2', 'line-width': 4 }} />
        </Source>
        {/* Полігони */}
        <Source id="polygons" type="geojson" data={data.polygonsGeojson}>
          <Layer id="polygon-layer" type="fill" paint={{ 'fill-color': '#ff4d4d', 'fill-opacity': 0.3 }} />
        </Source>
        {/* Оверлеї */}
        {data.overlays.map((ov, i) => (
          <Source
            key={i}
            id={`overlay-${i}`}
            type="image"
            url={ov.imageUrl}
            coordinates={ov.coordinates}
          >
            <Layer id={`overlay-layer-${i}`} type="raster" />
          </Source>
        ))}
      </Map>
      {/* UI для обертання */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px #0002' }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>Обертання: {Math.round(viewState.bearing)}°</label>
        <input
          type="range"
          min="0"
          max="360"
          value={viewState.bearing}
          style={{ width: 120, margin: '0 8px' }}
          onChange={e => setViewState(v => ({ ...v, bearing: Number(e.target.value) }))}
        />
        <button style={{ marginLeft: 8 }} onClick={() => setViewState(v => ({ ...v, bearing: 0 }))}>Скинути</button>
      </div>
      {/* Кнопки імпорт/експорт */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px #0002' }}>
        <button onClick={handleExport}>Експорт</button>
        <label style={{ marginLeft: 12 }}>
          Імпорт
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <span
            style={{ marginLeft: 8, cursor: 'pointer', color: '#1976d2', textDecoration: 'underline' }}
            onClick={() => fileInputRef.current?.click()}
          >Вибрати файл</span>
        </label>
      </div>
    </div>
  );
} 