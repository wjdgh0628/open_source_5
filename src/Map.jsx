import { useEffect } from 'react';
import {start} from './map/mapMain.js';
import './Map.css';
import 'mapbox-gl/dist/mapbox-gl.css';

function Map({ onMapInit }) {
  const mapId = 'map';

  useEffect(() => {
    const map = start();
    if (onMapInit) {
      onMapInit(map);
    }
  }, [onMapInit]);

  return <div id={mapId} />;
}

export default Map;