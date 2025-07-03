import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap, Rectangle, ImageOverlay, CircleMarker, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layer, MapMarker, MapPolyline, MapImageOverlay, MapPolygon } from '../types';
import MarkersLayer from './MarkersLayer';
import PolylinesLayer from './PolylinesLayer';
import DrawingVerticesLayer from './DrawingVerticesLayer';
import IIIFOverlay from './IIIFOverlay';

// Fix for default marker icon
delete ((window as any).L.Icon.Default.prototype as any)._getIconUrl;
(window as any).L.Icon.Default.mergeOptions({
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
  onSetSelectedObject: (object: MapMarker | MapImageOverlay | null) => void;
  selectedObject: MapMarker | MapImageOverlay | null;
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
  mapTypes: {
    plan: { url: string; attribution: string };
    satellite: { url: string; attribution: string };
    landscape: { url: string; attribution: string };
    humanitarian: { url: string; attribution: string };
    transport: { url: string; attribution: string };
    cycle: { url: string; attribution: string };
    cartoLight: { url: string; attribution: string };
    cartoDark: { url: string; attribution: string };
  };
  mapApiKeys: {
    thunderforest: string;
    carto: string;
  };
  onMapRef?: (ref: any) => void;
  currentPolygonPoints: [number, number][];
  onAddPolygonPoint: (point: [number, number]) => void;
  onDeletePolygonPoint: (index: number) => void;
  onSetSelectedPolygon: (polygon: MapPolygon | null, layerId?: string) => void;
  selectedPolygon: MapPolygon | null;
}

// Internal component to handle map events, as it must be a child of MapContainer
const MapEventsHandler: React.FC<{
  drawingMode: 'marker' | 'polygon' | 'polyline' | 'none';
  onMarkerAdd: (latlng: L.LatLng) => void;
  onPolylinePointAdd: (latlng: L.LatLng) => void;
  onPolygonPointAdd: (latlng: L.LatLng) => void;
  imageOverlayMode: boolean;
  onMapClickForImageOverlay: (latlng: [number, number]) => void;
}> = ({ drawingMode, onMarkerAdd, onPolylinePointAdd, onPolygonPointAdd, imageOverlayMode, onMapClickForImageOverlay }) => {
  useMapEvents({
    click(e) {
      if (imageOverlayMode) {
        onMapClickForImageOverlay([e.latlng.lat, e.latlng.lng]);
      } else if (drawingMode === 'marker') {
        onMarkerAdd(e.latlng);
      } else if (drawingMode === 'polyline') {
        onPolylinePointAdd(e.latlng);
      } else if (drawingMode === 'polygon') {
        onPolygonPointAdd(e.latlng);
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
    if ((window as any).L.Control.Compass) {
      const compass = new (window as any).L.Control.Compass({
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

interface DraggableImageOverlayProps {
  overlay: MapImageOverlay;
  layerId: string;
  imageOverlays: MapImageOverlay[];
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  selected: boolean;
  onSetSelectedObject: (object: MapImageOverlay) => void;
}

const DraggableImageOverlay: React.FC<DraggableImageOverlayProps> = ({ overlay, layerId, imageOverlays, onUpdateLayer, selected, onSetSelectedObject }) => {
  if (!overlay.corners || overlay.corners.length !== 2) return null;

  // corners: [[minLat, minLng], [maxLat, maxLng]]
  const bounds: [[number, number], [number, number]] = overlay.corners;
  const [topLeft, bottomRight] = bounds;
  const topRight: [number, number] = [topLeft[0], bottomRight[1]];
  const bottomLeft: [number, number] = [bottomRight[0], topLeft[1]];
  const cornersArr: [number, number][] = [topLeft, topRight, bottomRight, bottomLeft];

  // 1. Обчислити центр bounds:
  const center: [number, number] = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];

  // refs для leaflet ImageOverlay
  const imageOverlayRef = useRef<any>(null);
  // refs для drag
  const dragData = useRef<{startLatLng: [number, number], startBounds: [[number, number], [number, number]], mouseStart: {x: number, y: number}} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingCenter, setDraggingCenter] = useState<[number, number] | null>(null);

  // Перетворення latlng -> точка на екрані
  const map = useMap();
  function latLngToContainerPoint(latlng: [number, number]) {
    return map.latLngToContainerPoint(latlng);
  }
  function containerPointToLatLng(point: {x: number, y: number}): [number, number] {
    const latlng = map.containerPointToLatLng([point.x, point.y]);
    return [latlng.lat, latlng.lng];
  }

  // 2. Іконка drag&drop (хрестик) — через div
  const moveIconCenter = draggingCenter || center;
  const moveIconDiv = (
    <div
      style={{
        position: 'absolute',
        left: latLngToContainerPoint(moveIconCenter).x - 11,
        top: latLngToContainerPoint(moveIconCenter).y - 11,
        width: 22,
        height: 22,
        zIndex: 1200,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        pointerEvents: 'auto',
        fontSize: 22,
        filter: 'drop-shadow(0 1px 2px #fff)'
      }}
      onMouseDown={e => {
        e.preventDefault();
        e.stopPropagation();
        map.dragging.disable();
        setIsDragging(true);
        dragData.current = {
          startLatLng: center,
          startBounds: bounds,
          mouseStart: { x: e.clientX, y: e.clientY }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }}
      title="Перетягнути мапу"
    >
      ✥
    </div>
  );

  function handleMouseMove(e: MouseEvent) {
    if (!dragData.current) return;
    const { startLatLng, startBounds, mouseStart } = dragData.current;
    const dx = e.clientX - mouseStart.x;
    const dy = e.clientY - mouseStart.y;
    // Знаходимо новий центр
    const startPoint = latLngToContainerPoint(startLatLng);
    const newPoint = { x: startPoint.x + dx, y: startPoint.y + dy };
    const newCenter = containerPointToLatLng(newPoint);
    const delta: [number, number] = [
      newCenter[0] - startLatLng[0],
      newCenter[1] - startLatLng[1],
    ];
    const newBounds: [[number, number], [number, number]] = [
      [startBounds[0][0] + delta[0], startBounds[0][1] + delta[1]],
      [startBounds[1][0] + delta[0], startBounds[1][1] + delta[1]],
    ];
    // напряму оновлюємо bounds через leaflet API
    if (imageOverlayRef.current && imageOverlayRef.current.setBounds) {
      imageOverlayRef.current.setBounds(newBounds);
    }
    setDraggingCenter(newCenter);
  }

  function handleMouseUp(e: MouseEvent) {
    setIsDragging(false);
    setDraggingCenter(null);
    map.dragging.enable();
    if (!dragData.current) return;
    const { startLatLng, startBounds, mouseStart } = dragData.current;
    const dx = e.clientX - mouseStart.x;
    const dy = e.clientY - mouseStart.y;
    const startPoint = latLngToContainerPoint(startLatLng);
    const newPoint = { x: startPoint.x + dx, y: startPoint.y + dy };
    const newCenter = containerPointToLatLng(newPoint);
    const delta: [number, number] = [
      newCenter[0] - startLatLng[0],
      newCenter[1] - startLatLng[1],
    ];
    const newBounds: [[number, number], [number, number]] = [
      [startBounds[0][0] + delta[0], startBounds[0][1] + delta[1]],
      [startBounds[1][0] + delta[0], startBounds[1][1] + delta[1]],
    ];
    onUpdateLayer(layerId, {
      imageOverlays: imageOverlays.map(o => o.id === overlay.id ? { ...o, corners: normalizeBounds(newBounds) } : o)
    });
    // знайти оновлений overlay з новими координатами
    const updatedOverlay = { ...overlay, corners: normalizeBounds(newBounds) };
    setTimeout(() => {
      onSetSelectedObject(updatedOverlay);
    }, 0);
    dragData.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  // Кастомний divIcon для поінта з курсором
  const cursors = ['nwse-resize', 'nesw-resize', 'nwse-resize', 'nesw-resize'];
  const pointIcon = (i: number) => (window as any).L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#ff4d4d;border:1px solid #d32f2f;box-shadow:0 0 1px #333;cursor:${cursors[i]}"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  // index: 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
  const handleDrag = (index: number, e: any) => {
    const marker = e.target as any;
    const newPos: [number, number] = [marker.getLatLng().lat, marker.getLatLng().lng];
    let newBounds: [[number, number], [number, number]] = [...bounds];
    switch (index) {
      case 0: // topLeft
        newBounds = [newPos, bottomRight];
        break;
      case 1: // topRight
        newBounds = [[newPos[0], bottomLeft[1]], [bottomRight[0], newPos[1]]];
        break;
      case 2: // bottomRight
        newBounds = [topLeft, newPos];
        break;
      case 3: // bottomLeft
        newBounds = [[topLeft[0], newPos[1]], [newPos[0], topRight[1]]];
        break;
    }
    onUpdateLayer(layerId, {
      imageOverlays: imageOverlays.map(o => o.id === overlay.id ? { ...o, corners: normalizeBounds(newBounds) } : o)
    });
  };

  return (
    <>
      <ImageOverlay
        ref={imageOverlayRef}
        url={overlay.imageUrl}
        bounds={bounds}
        opacity={typeof overlay.opacity === 'number' ? overlay.opacity : 1}
      />
      <Rectangle
        bounds={bounds}
        pathOptions={{
          color: selected ? 'transparent' : 'transparent',
          weight: selected ? 0 : 1,
          fillOpacity: selected ? 0.2 : 0,
          fillColor: selected ? '#1976d2' : undefined,
          interactive: true
        }}
        eventHandlers={{
          click: () => onSetSelectedObject(overlay)
        }}
      />
      {selected && cornersArr.map((corner, i) => (
        <Marker
          key={i}
          position={corner}
          icon={pointIcon(i)}
          draggable={true}
          eventHandlers={{
            dragstart: () => {
              document.body.style.cursor = cursors[i];
            },
            dragend: (e) => {
              handleDrag(i, e);
              document.body.style.cursor = '';
            },
          }}
        />
      ))}
      {/* draggable центр через кастомний div */}
      {selected && moveIconDiv}
    </>
  );
};

function normalizeBounds(bounds: [[number, number], [number, number]]): [[number, number], [number, number]] {
  const lats = [bounds[0][0], bounds[1][0]];
  const lngs = [bounds[0][1], bounds[1][1]];
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  ];
}

// Хук для зняття виділення overlay при кліку поза ним
const DeselectOverlayOnMapClick: React.FC<{
  selectedObject: MapMarker | MapImageOverlay | null;
  onSetSelectedObject: (object: MapMarker | MapImageOverlay | null) => void;
}> = ({ selectedObject, onSetSelectedObject }) => {
  useMapEvents({
    click: () => {
      if (selectedObject && 'corners' in selectedObject) {
        onSetSelectedObject(null);
      }
    }
  });
  return null;
};

// Додаю хук для збереження map-інстансу у mapRef
function MapRefSync({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map]);
  return null;
}

// Додаю компонент для інтеграції leaflet-distortableimage
const DistortableImageOverlay: React.FC<{
  overlay: MapImageOverlay;
  layerId: string;
  imageOverlays: MapImageOverlay[];
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  selected: boolean;
  onSetSelectedObject: (object: MapImageOverlay) => void;
}> = ({ overlay, layerId, imageOverlays, onUpdateLayer, selected, onSetSelectedObject }) => {
  const map = useMap();
  const overlayRef = useRef<any>(null);
  useEffect(() => {
    if (!overlay.corners || overlay.corners.length !== 2) return;
    // Якщо плагін ще не підключився — не створюємо overlay
    if (!(window as any).L || !(window as any).L.distortableImageOverlay) return;
    // Якщо overlay вже існує — не створюємо повторно
    if (overlayRef.current) return;
    // corners: [[minLat, minLng], [maxLat, maxLng]]
    const bounds = overlay.corners;
    // Створюємо DistortableImageOverlay
    const img = (window as any).L.distortableImageOverlay(overlay.imageUrl, {
      corners: [
        [bounds[0][0], bounds[0][1]], // topLeft
        [bounds[0][0], bounds[1][1]], // topRight
        [bounds[1][0], bounds[1][1]], // bottomRight
        [bounds[1][0], bounds[0][1]], // bottomLeft
      ],
      opacity: overlay.opacity ?? 1,
      selected: selected,
      suppressToolbar: false,
    }).addTo(map);
    overlayRef.current = img;
    // Синхронізуємо зміни
    img.on('edit', () => {
      const newCorners = img._corners.map((c: any) => [c.lat, c.lng]);
      // corners: [[minLat, minLng], [maxLat, maxLng]]
      const lats = newCorners.map((c: any) => c[0]);
      const lngs = newCorners.map((c: any) => c[1]);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      onUpdateLayer(layerId, {
        imageOverlays: imageOverlays.map(o => o.id === overlay.id ? {
          ...o,
          corners: [[minLat, minLng], [maxLat, maxLng]],
        } : o)
      });
    });
    img.on('click', () => onSetSelectedObject(overlay));
    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map, overlay, imageOverlays, onUpdateLayer, layerId, selected, onSetSelectedObject]);
  // Оновлюємо opacity
  useEffect(() => {
    if (overlayRef.current) overlayRef.current.setOpacity(overlay.opacity ?? 1);
  }, [overlay.opacity]);
  // Оновлюємо selected
  useEffect(() => {
    if (overlayRef.current) {
      if (selected) overlayRef.current.editing.enable();
      else overlayRef.current.editing.disable();
    }
  }, [selected]);
  // Якщо плагін ще не підключився — не рендеримо нічого
  if (!(window as any).L || !(window as any).L.distortableImageOverlay) return null;
  return null;
};

const MapComponent: React.FC<MapComponentProps & { onShowSnackbar?: (msg: string) => void }> = ({ 
  layers, 
  activeLayerId, 
  onUpdateLayer,
  drawingMode,
  onSetSelectedObject,
  selectedObject,
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
  mapTypes,
  mapApiKeys,
  onShowSnackbar,
  onMapRef,
  currentPolygonPoints,
  onAddPolygonPoint,
  onDeletePolygonPoint,
  onSetSelectedPolygon,
  selectedPolygon,
}) => {
  const lvivPosition: [number, number] = [49.8397, 24.0297];
  const mapRef = useRef<any>(null);
  const [iiifOverlays, setIiifOverlays] = React.useState<{id: string, url: string, visible?: boolean}[]>([]);
  const [showBasemap, setShowBasemap] = useState(true);

  const activeLayer = layers.find(l => l.id === activeLayerId);
  const mapType = (activeLayer?.mapType as keyof typeof mapTypes) || 'plan';
  const opacity = activeLayer?.opacity ?? 1;
  const visible = activeLayer?.visible ?? true;

  const handleAddIIIFOverlay = async () => {
    console.log('handleAddIIIFOverlay викликано');
    const url = window.prompt('Введіть IIIF Image API info.json або manifest URL:');

    if (!url) return;
    let infoUrl = url;
    try {
      if (url.endsWith('manifest.json') || url.endsWith('info.json') || url.endsWith('manifest') || url.includes('presentation')) {        // Це manifest, треба знайти info.json
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Не вдалося завантажити manifest');
        const manifest = await resp.json();
        console.log('manifest', manifest);
        // IIIF Presentation API 2.x
        const canvas = manifest.sequences?.[0]?.canvases?.[0];
        const service = canvas?.images?.[0]?.resource?.service;
        let serviceId = service?.['@id'] || service?.id;
        console.log('serviceId', serviceId);
console.log('manifest.items', manifest.items);
console.log('body.id', manifest.items?.[0]?.items?.[0]?.items?.[0]?.body?.id);
        if (!serviceId && Array.isArray(service)) serviceId = service[0]?.['@id'] || service[0]?.id;
        // IIIF Presentation API 3.x (canvas.items[0].items[0].body.service[0].id)
        if (!serviceId && manifest.items && manifest.items[0]?.items?.[0]?.items?.[0]?.body?.service?.[0]?.id) {
          serviceId = manifest.items[0].items[0].items[0].body.service[0].id;
        }
        if (serviceId) {
          infoUrl = serviceId.replace(/\/$/, '') + '/info.json';
          console.log('Додаю IIIF overlay:', infoUrl);
          setIiifOverlays(prev => [
            ...prev,
            { id: `iiif-${Date.now()}`, url: infoUrl, visible: true }
          ]);
          setShowBasemap(false);
          return;
        } else {
          // fallback: IIIF 2.x (canvas.images[0].resource['@id'])
          const imageUrl = canvas?.images?.[0]?.resource?.['@id'] || canvas?.images?.[0]?.resource?.id;
          const width = canvas?.width;
          const height = canvas?.height;
          if (imageUrl) {
            const center: [number, number] = [49.8397, 24.0297];
            let bounds: [[number, number], [number, number]];
            if (width && height && width > 0 && height > 0) {
              const maxSize = 0.02;
              const aspect = width / height;
              let w = maxSize, h = maxSize;
              if (aspect > 1) h = maxSize / aspect; else w = maxSize * aspect;
              bounds = [
                [center[0] - h / 2, center[1] - w / 2],
                [center[0] + h / 2, center[1] + w / 2]
              ];
            } else {
              bounds = [
                [center[0], center[1]],
                [center[0] + 0.01, center[1] + 0.01]
              ];
            }
            const newOverlay = {
              id: `img-${Date.now()}`,
              title: manifest.label?.[0]?.['@value'] || 'IIIF Image',
              imageUrl,
              corners: bounds,
              opacity: 1,
              visible: true,
            };
            onUpdateLayer(activeLayerId, {
              imageOverlays: [
                ...((layers.find(l => l.id === activeLayerId)?.imageOverlays) || []),
                newOverlay
              ]
            });
            console.log('Додаю overlay:', newOverlay);
            onShowSnackbar && onShowSnackbar('IIIF Image API не знайдено, додано як просте зображення');
            onSetSelectedObject && onSetSelectedObject(newOverlay);
            return;
          }
          // fallback: IIIF 3.x (canvas.items[0].items[0].body.id)
          // покращено: width/height з body, а не з canvas
          if (!serviceId && manifest.items && manifest.items[0]?.items?.[0]?.items?.[0]?.body?.id) {
            const canvas = manifest.items[0];
            const annotation = canvas?.items?.[0]?.items?.[0];
            const body = annotation?.body;
            const imageUrl = body?.id;
            const width = body?.width;
            const height = body?.height;
            if (imageUrl) {
              const center: [number, number] = [49.8397, 24.0297];
              let bounds: [[number, number], [number, number]];
              if (width && height && width > 0 && height > 0) {
                const maxSize = 0.02;
                const aspect = width / height;
                let w = maxSize, h = maxSize;
                if (aspect > 1) h = maxSize / aspect; else w = maxSize * aspect;
                bounds = [
                  [center[0] - h / 2, center[1] - w / 2],
                  [center[0] + h / 2, center[1] + w / 2]
                ];
              } else {
                bounds = [
                  [center[0], center[1]],
                  [center[0] + 0.01, center[1] + 0.01]
                ];
              }
              const newOverlay = {
                id: `img-${Date.now()}`,
                title: manifest.label?.en?.[0] || manifest.label?.[0]?.['@value'] || 'IIIF Image',
                imageUrl,
                corners: bounds,
                opacity: 1,
                visible: true,
              };
              onUpdateLayer(activeLayerId, {
                imageOverlays: [
                  ...((layers.find(l => l.id === activeLayerId)?.imageOverlays) || []),
                  newOverlay
                ]
              });
              onShowSnackbar && onShowSnackbar('IIIF manifest не містить info.json, додано як просте зображення');
              onSetSelectedObject && onSetSelectedObject(newOverlay);
              return;
            }
          }
        }
        
// Якщо це info.json, додаємо як IIIFOverlay
        if (infoUrl.includes('info.json')) {
          console.log('Додаю IIIF overlay:', infoUrl);
          setIiifOverlays(prev => [
            ...prev,
            { id: `iiif-${Date.now()}`, url: infoUrl, visible: true }
          ]);
          setShowBasemap(false);
        } else {
          onShowSnackbar && onShowSnackbar('URL не є IIIF info.json. Додавання IIIFOverlay неможливе.');
          alert('URL не є IIIF info.json. Додавання IIIFOverlay неможливе.');
        }
      }
    } catch (e) {
      alert('Помилка підключення IIIF: ' + (e as Error).message);
    }
  };

  // Додаю функцію для видалення IIIFOverlay (і повернення підложки)
  const handleRemoveIIIFOverlay = (id: string) => {
    setIiifOverlays(prev => {
      const updated = prev.filter(o => o.id !== id);
      if (updated.length === 0) setShowBasemap(true);
      return updated;
    });
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

  useEffect(() => {
    if (onMapRef) {
      onMapRef(mapRef.current);
    }
  }, [onMapRef]);

  return (
    <MapContainer
      center={lvivPosition}
      zoom={13}
      style={{ flexGrow: 1 }}
    >
      <MapRefSync mapRef={mapRef} />
      {showBasemap && layers.filter(l => l.visible).map(layer => {
        const mapType = layer.mapType as keyof typeof mapTypes;
        const opacity = layer.opacity ?? 1;
        // Carto Light/Dark підтримують no-labels/labels only
        if (mapType === 'cartoLight' || mapType === 'cartoDark') {
          const baseUrl = mapType === 'cartoLight'
            ? 'https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}.png';
          const labelsUrl = mapType === 'cartoLight'
            ? 'https://{s}.basemaps.cartocdn.com/rastertiles/light_only_labels/{z}/{x}/{y}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}.png';
          return (
            <React.Fragment key={layer.id}>
              <TileLayer
                attribution={mapTypes[mapType].attribution}
                url={baseUrl}
                opacity={opacity}
              />
              {layer.showLabels !== false && (
                <TileLayer
                  url={labelsUrl}
                  opacity={opacity}
                  attribution=""
                />
              )}
            </React.Fragment>
          );
        }
        // Для супутника додаємо labels only від ArcGIS
        if (mapType === 'satellite') {
          return (
            <React.Fragment key={layer.id}>
              <TileLayer
                attribution={mapTypes[mapType].attribution}
                url={mapTypes[mapType].url}
                opacity={opacity}
              />
              {layer.showLabels !== false && (
                <TileLayer
                  url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  opacity={opacity}
                  attribution=""
                />
              )}
            </React.Fragment>
          );
        }
        // Для інших типів просто рендеримо як є
        return (
          <TileLayer
            key={layer.id}
            attribution={mapTypes[mapType].attribution}
            url={mapTypes[mapType].url}
            opacity={opacity}
          />
        );
      })}
      
      <MapEventsHandler 
        drawingMode={drawingMode} 
        onMarkerAdd={handleAddMarker}
        onPolylinePointAdd={handleAddPolylinePoint} 
        onPolygonPointAdd={(latlng) => onAddPolygonPoint([latlng.lat, latlng.lng])}
        imageOverlayMode={imageOverlayMode}
        onMapClickForImageOverlay={onMapClickForImageOverlay}
      />
      <DeselectOverlayOnMapClick
        selectedObject={selectedObject}
        onSetSelectedObject={onSetSelectedObject}
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
          .map(overlay => {
            if (!overlay.corners || overlay.corners.length !== 2 || overlay.visible === false) return null;
            return (
              <DistortableImageOverlay
                key={overlay.id}
                overlay={overlay}
                layerId={layer.id}
                imageOverlays={layer.imageOverlays}
                onUpdateLayer={onUpdateLayer}
                selected={!!selectedObject && 'id' in selectedObject && overlay.id === selectedObject.id}
                onSetSelectedObject={onSetSelectedObject}
              />
            );
          })
      )}

      {/* IIIF overlays */}
      {iiifOverlays
        .filter(o => o.visible !== false && o.url && o.url.includes('info.json'))
        .map(overlay => {
          return (
            <React.Fragment key={overlay.id}>
              <IIIFOverlay url={overlay.url} />
              <button style={{position:'absolute',top:100,right:16,zIndex:1300}} onClick={() => handleRemoveIIIFOverlay(overlay.id)}>
                Прибрати IIIFOverlay
              </button>
            </React.Fragment>
          );
        })}

      {/* Рендер полігону під час малювання */}
      {drawingMode === 'polygon' && currentPolygonPoints.length > 0 && (
        <>
          <Polygon
            positions={currentPolygonPoints}
            pathOptions={{ color: 'grey', fillColor: 'grey', fillOpacity: 0.3, weight: 2, dashArray: '5, 5' }}
          />
          <DrawingVerticesLayer
            points={currentPolygonPoints}
            onDeletePoint={onDeletePolygonPoint}
          />
        </>
      )}

      {/* Рендер усіх полігонів з шарів */}
      {layers.filter(layer => layer.visible).flatMap(layer =>
        (layer.polygons || []).map(polygon => {
          const isSelected = selectedPolygon && polygon.id === selectedPolygon.id;
          return (
            <Polygon
              key={polygon.id}
              positions={polygon.coordinates}
              pathOptions={{
                color: isSelected ? '#1976d2' : (polygon.color || layer.drawingSettings.polygonColor),
                fillColor: polygon.fillColor || layer.drawingSettings.polygonFillColor,
                fillOpacity: typeof polygon.opacity === 'number' ? polygon.opacity : 0.3,
                weight: isSelected ? 1 : 2,
                opacity: isSelected ? 1 : undefined,
              }}
              eventHandlers={{
                click: () => onSetSelectedPolygon(polygon, layer.id)
              }}
            >
              <Tooltip sticky>
                <div className="tooltip-content">
                  <h4>{polygon.title || 'Полігон'}</h4>
                  {polygon.description && (
                    <div dangerouslySetInnerHTML={{ __html: polygon.description }} />
                  )}
                  {polygon.imageUrl && <img src={polygon.imageUrl} alt={polygon.title || 'Зображення полігону'} className="tooltip-image" />}
                </div>
              </Tooltip>
            </Polygon>
          );
        })
      )}

    </MapContainer>
  );
};

export default MapComponent; 