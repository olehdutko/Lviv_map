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
      if (iiifLayer && map.hasLayer(iiifLayer)) {
        map.removeLayer(iiifLayer);
      }
    };
  }, [url, map]);

  return null;
} 