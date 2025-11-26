import { CONFIG } from './map.config.js';
import { setHandler } from './mapUtils.js';
import { handleBuildingClick, handleBackgroundClick } from './onClick.js';
import mapboxgl from 'mapbox-gl';

function initMap() {
    mapboxgl.accessToken = "pk.eyJ1IjoibGF6eWRldjEwMjQiLCJhIjoiY21mdW91NnNyMTVkZDJtcHd4dHNtNHU0ayJ9.mLzbdcCPq_-BeA8DlHu1KA";
    // 맵 초기화 (기존과 동일)
    const map = new mapboxgl.Map({
        container: "map",
        style: CONFIG.map.style,
        center: CONFIG.map.center,
        zoom: CONFIG.map.zoom
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
        map.addSource("campus", { type: "geojson", data: CONFIG.campus.geojsonUrl });
        map.addLayer({
            id: CONFIG.idRules.buildings,
            type: "fill-extrusion",
            source: "campus",
            paint: {
                "fill-extrusion-color": ["coalesce", ["get", "color"], "#aaaaaa"],
                "fill-extrusion-base": ["coalesce", ["*", ["get", "base"],CONFIG.buildingDefaults.levelThick], 0],
                "fill-extrusion-height": ["*", ["get", "building:levels"],CONFIG.buildingDefaults.levelThick],
                "fill-extrusion-opacity": 1
            }
        });
        //건물, 배경 클릭시 실행할 코드 지정
        setHandler(map, "click",CONFIG.idRules.buildings, e => handleBuildingClick(map, e));
        map.on('click', (e) => handleBackgroundClick(map, e));
        // map.on('click', (e) =>{console.log(map.queryRenderedFeatures(e.point))});
    });
    return map;
}

function start() {
    const map = initMap();

    /* rerenderLists(map); // 건물 리스트 렌더링

    showMenu('nav-toggle', 'navbar', 'body-pd');
    const linkCollapse = document.getElementsByClassName('collapse__link')
    setupCollapseMenu(linkCollapse); */
}

export default start;