import { useEffect } from 'react';
import {start} from './map/mapMain.js';
import './Map.css';
import 'mapbox-gl/dist/mapbox-gl.css';

function Map() {
  const mapId = "map";
  useEffect(() =>{
    start();
  }, []);
  return (
      <div id={mapId}/>
  )
}

export default Map;