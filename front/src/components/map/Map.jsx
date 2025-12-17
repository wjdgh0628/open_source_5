import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { idRules } from '@shared/rules.js';
import { getMap, setMap } from '@shared/cache.js';
import { MC } from '@scripts/mapConfig.js';
import { setHandler } from '@scripts/mapUtils.js';
import { handleBuildingClick, handleBackgroundClick } from '@scripts/mapHandlers.js';

import './Map.css';
import 'mapbox-gl/dist/mapbox-gl.css';

function initMap(urls) {
	mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY;
	// 맵 초기화 (기존과 동일)
	const map = new mapboxgl.Map({
		container: "map",
		style: MC.map.style,
		center: MC.map.center,
		zoom: MC.map.zoom,
		maxBounds: MC.map.maxBounds
	});
	map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
	map.on("load", () => {
		map.addLayer({
			id: "sky", type: "sky", paint: {
				"sky-type": "atmosphere",
				"sky-atmosphere-sun": [0, 0],
				"sky-atmosphere-sun-intensity": 15
			}
		});
		map.addSource("campus", { type: "geojson", data: urls.buildingsUrl });
		map.addLayer({
			id: idRules.buildings,
			type: "fill-extrusion",
			source: "campus",
			paint: {
				"fill-extrusion-color": ["coalesce", ["get", "color"], "#aaaaaa"],
				"fill-extrusion-base": ["coalesce", ["*", ["get", "base"], MC.layerProps.levelThick], 0],
				"fill-extrusion-height": ["*", ["get", "building:levels"], MC.layerProps.levelThick],
				"fill-extrusion-opacity": 1
			}
		});
		map.addLayer({
			id: idRules.lid(idRules.buildings),
			type: 'symbol',
			source: "campus",
			filter: [
				"all",
				["==", ["get", "origin"], null],
				["has", "building:levels"]
			],
			layout: {
				'text-field': ["get", "name"],
				'text-size': 14,
				'text-anchor': "bottom",
				'text-allow-overlap': true,
				'symbol-placement': 'point',
				'symbol-z-order': "source"
			},
			paint: {
				'symbol-z-offset': ["*",
					["coalesce", ["get", "building:levels"], 0],
					 MC.layerProps.levelThick],
				'text-color': '#000000',
				'text-halo-color': '#ffffff',
				'text-halo-width': 2
			}
		});

	});
	return map;
}

function Map({ urls }) {
	const mapId = 'map';

	useEffect(() => {
		if (!getMap()) {
			setMap(initMap(urls));
			//건물, 배경 클릭시 실행할 코드 지정
			setHandler("click", idRules.buildings, e => handleBuildingClick(e));
			getMap().on('click', (e) => handleBackgroundClick(e));
			// getMap().on('click', (e) =>{console.log(getMap().queryRenderedFeatures(e.point))});
		}
	}, [urls]);

	return <div id={mapId} />;
}

export default Map;