import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-iiif';

export default function IIIFOverlay({ url }: { url: string }) {
  const map = useMap();

  useEffect(() => {
    let iiifLayer: any;
    let removed = false;

    function addLayer() {
      try {
        // Перевіряємо, чи контейнер мапи існує і має розміри
        const container = map.getContainer && map.getContainer();
        if (!container || !container.offsetWidth || !container.offsetHeight) {
          setTimeout(addLayer, 200); // спробувати пізніше
          return;
        }
        // @ts-ignore
        iiifLayer = (L as any).tileLayer.iiif(url);
        console.log('Додаю IIIFOverlay на мапу', url);
        iiifLayer.on('error', (e: any) => {
          alert('IIIF: Bounds are not valid або не вдалося завантажити тайли');
        });
        iiifLayer.addTo(map);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('IIIFOverlay error:', e);
        alert('IIIFOverlay error: ' + (e as Error).message);
      }
    }

    if (map && map.whenReady) {
      map.whenReady(() => {
        if (!removed) setTimeout(addLayer, 100);
      });
    } else {
      setTimeout(addLayer, 100);
    }

    return () => {
      removed = true;
      if (iiifLayer) {
        map.removeLayer(iiifLayer);
      }
      // Додатково: видаляємо всі IIIF tileLayer
      map.eachLayer(layer => {
        // @ts-ignore
        if (layer instanceof L.TileLayer && layer._url && (layer._url.includes('iiif') || layer._url.includes('wellcomecollection'))) {
          map.removeLayer(layer);
        }
      });
      // Примусово очищаємо DOM-контейнер тайлів
      const container = map.getContainer && map.getContainer();
      if (container) {
        const tiles = container.querySelectorAll('.leaflet-tile-container, .leaflet-layer, .leaflet-tile');
        tiles.forEach(el => {
          // @ts-ignore
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      }
      map.invalidateSize();
    };
  }, [url, map]);

  return null;
} 