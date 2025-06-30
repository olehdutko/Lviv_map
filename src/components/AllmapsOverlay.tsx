import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { AllmapsLayer } from '../vendor/allmaps-leaflet-1.9.umd.js';

interface AllmapsOverlayProps {
  manifestUrl: string;
  opacity?: number;
  zIndex?: number;
}

const AllmapsOverlay: React.FC<AllmapsOverlayProps> = ({
  manifestUrl,
  opacity = 1,
  zIndex = 1000
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !manifestUrl) return;

    const layer = new AllmapsLayer({
      manifestUrl,
      opacity,
      zIndex
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, manifestUrl, opacity, zIndex]);

  return null;
};

export default AllmapsOverlay; 