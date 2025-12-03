import mapboxgl from 'mapbox-gl';

import { idRules, setApiUrl } from '@shared/rules.js';
import { MC } from './mapConfig.js';
import { setHandler } from './mapUtils.js';
import { handleBuildingClick, handleBackgroundClick } from './mapHandlers.js';

export const current = {
	mapInstance: null,
	mode: 0,
	bid: null,
	lvI: null
};

const url = setApiUrl(__API_BASE__);

function initMap() {
	mapboxgl.accessToken = MC.map.key;
	// 맵 초기화 (기존과 동일)
	const map = new mapboxgl.Map({
		container: "map",
		style: MC.map.style,
		center: MC.map.center,
		zoom: MC.map.zoom
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
		map.addSource("campus", { type: "geojson", data: url.buildingsUrl });
		map.addLayer({
			id: idRules.buildings,
			type: "fill-extrusion",
			source: "campus",
			paint: {
				"fill-extrusion-color": ["coalesce", ["get", "color"], "#aaaaaa"],
				"fill-extrusion-base": ["coalesce", ["*", ["get", "base"],MC.layerProps.levelThick], 0],
				"fill-extrusion-height": ["*", ["get", "building:levels"],MC.layerProps.levelThick],
				"fill-extrusion-opacity": 1
			}
		});
		//건물, 배경 클릭시 실행할 코드 지정
		setHandler(map, "click",idRules.buildings, e => handleBuildingClick(map, e));
		map.on('click', (e) => handleBackgroundClick(map, e));
		// map.on('click', (e) =>{console.log(map.queryRenderedFeatures(e.point))});
	});
	return map;
}

export function start() {
	const map =  current.mapInstance ? current.mapInstance : current.mapInstance = initMap();

	return map;
}