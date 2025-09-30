import { CONFIG } from './config.js';
import {currentState, searchRoom} from './mapUtils.js';
import {handleBuildingClick, handleBackgroundClick} from './onClick.js';

export function initMap() {
    // map 객체(맵박스) 생성
    const map = new mapboxgl.Map({
        container: "map",
        style: CONFIG.map.style,
        center: CONFIG.map.center,
        zoom: CONFIG.map.zoom
    });
    // 카메라 조작 코드인듯
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    //맵이 로드됐을때 실행할 코드?
    map.on("load", () => {
        // 하늘 생성
        map.addLayer({
            id: "sky", type: "sky", paint: {
                "sky-type": "atmosphere",
                "sky-atmosphere-sun": [0, 0],
                "sky-atmosphere-sun-intensity": 15
            }
        });
        // geojson 추가
        map.addSource("campus", { type: "geojson", data: CONFIG.campus.geojsonUrl });
        // 3d 건물들 생성
        map.addLayer({
            id: "campus-3d",
            type: "fill-extrusion",
            source: "campus",
            paint: {
                "fill-extrusion-color": ["coalesce", ["get", "color"], "#aaaaaa"],
                "fill-extrusion-base": ["coalesce", ["to-number", ["get", "min_height"]], 0],
                "fill-extrusion-height": [
                    "case",
                    ["has", "height"], ["to-number", ["get", "height"]],
                    ["has", "building:levels"], ["*", ["to-number", ["get", "building:levels"]],
                        CONFIG.buildingDefaults.floorThickness + CONFIG.buildingDefaults.floorGap],
                    10
                ],
                "fill-extrusion-opacity": 0.9
            }
        });
        //건물, 배경 클릭시 실행할 코드 지정
        // map.on("click", "campus-3d", e => handleBuildingClick(map, e));
        map.on("click", "campus-3d", e => searchRoom());
        map.on("click", e => handleBackgroundClick(map, e));
    });

    currentState.mode = 0;
}