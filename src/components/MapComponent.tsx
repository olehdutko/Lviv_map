import React, { useEffect, useRef, useState } from 'react';
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

// Image overlay rotation help component
const ImageOverlayRotationHelp: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div style={{ 
      position: 'absolute', 
      bottom: 10, 
      right: 10, 
      zIndex: 1000,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: 4,
      fontSize: '12px',
      cursor: 'pointer',
      userSelect: 'none'
    }}
    onMouseEnter={() => setShowHelp(true)}
    onMouseLeave={() => setShowHelp(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🔄</span>
        <span>Обертання доданих карт</span>
      </div>
      
      {showHelp && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          background: 'rgba(0,0,0,0.9)',
          padding: '8px 12px',
          borderRadius: 4,
          marginBottom: 8,
          whiteSpace: 'nowrap',
          fontSize: '11px'
        }}>
          <div>🖱️ Клікніть на 🔄 кнопку та перетягуйте для обертання</div>
          <div>🔄 Обертайте додані карти в будь-якому напрямку</div>
        </div>
      )}
    </div>
  );
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

  const handleRotationChange = (rotation: number) => {
    console.log('Rotating overlay:', overlay.id, 'to:', rotation);
    onUpdateLayer(layerId, {
      imageOverlays: imageOverlays.map(o => o.id === overlay.id ? { ...o, rotation } : o)
    });
  };

  // Calculate center point for rotation
  const centerLat = (bounds[0][0] + bounds[1][0]) / 2;
  const centerLng = (bounds[0][1] + bounds[1][1]) / 2;

  // Apply rotation to the image overlay using useEffect
  useEffect(() => {
    // Wait a bit for the image to load, then find and rotate it
    const timer = setTimeout(() => {
      // Find all image elements and check if they match our overlay
      const imageElements = document.querySelectorAll('img');
      imageElements.forEach((element) => {
        const img = element as HTMLImageElement;
        // Check if this image is part of our overlay by looking at the parent container
        if (img.src === overlay.imageUrl || img.src.includes(overlay.imageUrl.split('/').pop() || '')) {
          img.style.transform = `rotate(${overlay.rotation || 0}deg)`;
          img.style.transformOrigin = 'center';
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [overlay.rotation, overlay.imageUrl]);

  return (
    <>
      <ImageOverlay
        url={overlay.imageUrl}
        bounds={bounds}
        opacity={typeof overlay.opacity === 'number' ? overlay.opacity : 1}
      />
      
      {/* Manual rotation control marker */}
      <Marker
        position={[centerLat, centerLng]}
        draggable={false}
        icon={L.divIcon({
          className: 'rotation-control',
          html: `
            <div style="
              width: 30px; 
              height: 30px; 
              background: #1976d2; 
              border: 2px solid white; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              color: white;
              font-size: 16px;
              font-weight: bold;
            ">
              🔄
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })}
        eventHandlers={{
          mousedown: (e) => {
            const startX = e.originalEvent.clientX;
            const startRotation = overlay.rotation || 0;
            
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const newRotation = startRotation + (deltaX * 0.5); // Sensitivity factor
              handleRotationChange(newRotation);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }
        }}
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

interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
}

const Geocoder: React.FC<{ 
  onLocationSelect: (lat: number, lng: number, displayName: string) => void;
  currentMapType: 'plan' | 'satellite' | 'landscape';
  setCurrentMapType: (type: 'plan' | 'satellite' | 'landscape') => void;
}> = ({ onLocationSelect, currentMapType, setCurrentMapType }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchLocation = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=ua`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Помилка пошуку:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
    
    if (value.length > 2) {
      const timeoutId = setTimeout(() => searchLocation(value), 500);
      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  };

  const handleResultClick = (result: GeocodingResult) => {
    onLocationSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
    setQuery(result.display_name);
    setShowResults(false);
  };

  const handleCloseResults = () => {
    setShowResults(false);
  };

  // Закриття по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResults(false);
      }
    };

    if (showResults) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showResults]);

  return (
    <div style={{ position: 'absolute', top: 10, left: 50, zIndex: 1000, width: 300 }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          onFocus={() => setShowResults(true)}
          placeholder="Пошук місця..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 4,
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            boxSizing: 'border-box'
          }}
        />
        {isLoading && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            Завантаження...
          </div>
        )}
      </div>
      
      {/* Base map type buttons */}
      <div style={{ 
        marginTop: 8, 
        display: 'flex', 
        gap: 4,
        background: 'white', 
        borderRadius: 4, 
        padding: 4, 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <button
          onClick={() => setCurrentMapType('plan')}
          style={{
            padding: '4px 8px',
            border: 'none',
            borderRadius: 3,
            background: currentMapType === 'plan' ? '#1976d2' : '#f0f0f0',
            color: currentMapType === 'plan' ? 'white' : 'black',
            cursor: 'pointer',
            fontSize: '12px',
            flex: 1
          }}
        >
          План
        </button>
        <button
          onClick={() => setCurrentMapType('satellite')}
          style={{
            padding: '4px 8px',
            border: 'none',
            borderRadius: 3,
            background: currentMapType === 'satellite' ? '#1976d2' : '#f0f0f0',
            color: currentMapType === 'satellite' ? 'white' : 'black',
            cursor: 'pointer',
            fontSize: '12px',
            flex: 1
          }}
        >
          Супутник
        </button>
        <button
          onClick={() => setCurrentMapType('landscape')}
          style={{
            padding: '4px 8px',
            border: 'none',
            borderRadius: 3,
            background: currentMapType === 'landscape' ? '#1976d2' : '#f0f0f0',
            color: currentMapType === 'landscape' ? 'white' : 'black',
            cursor: 'pointer',
            fontSize: '12px',
            flex: 1
          }}
        >
          Ландшафт
        </button>
      </div>
      
      {showResults && results.length > 0 && (
        <>
          {/* Overlay для закриття по кліку поза попапом */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={handleCloseResults}
          />
          
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: 4,
            maxHeight: 200,
            overflowY: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1001
          }}>
            {/* Кнопка закриття */}
            <div style={{
              position: 'sticky',
              top: 0,
              background: 'white',
              padding: '4px 8px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Результати пошуку</span>
              <button
                onClick={handleCloseResults}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0 4px'
                }}
                title="Закрити"
              >
                ×
              </button>
            </div>
            
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() => handleResultClick(result)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  fontSize: '13px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                {result.display_name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
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
  const [currentMapType, setCurrentMapType] = useState<'plan' | 'satellite' | 'landscape'>('plan');
  
  const mapTypes = {
    plan: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
    },
    landscape: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> contributors'
    }
  };

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

  const handleLocationSelect = (lat: number, lng: number, displayName: string) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
      
      // Додаємо маркер до активного шару
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer) {
        const newMarker: MapMarker = {
          id: `search-marker-${Date.now()}`,
          lat: lat,
          lng: lng,
          title: displayName,
          color: activeLayer.drawingSettings.markerColor,
        };
        onUpdateLayer(activeLayerId, {
          markers: [...activeLayer.markers, newMarker]
        });
      }
    }
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
    <MapContainer center={lvivPosition} zoom={13} style={{ flexGrow: 1 }} ref={mapRef}>
      <TileLayer
        attribution={mapTypes[currentMapType].attribution}
        url={mapTypes[currentMapType].url}
      />
      
      {/* Geocoder search */}
      <Geocoder 
        onLocationSelect={handleLocationSelect}
        currentMapType={currentMapType}
        setCurrentMapType={setCurrentMapType}
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
      
      {/* Image overlay rotation help */}
      <ImageOverlayRotationHelp />
    </MapContainer>
  );
};

export default MapComponent; 