import { CONFIG } from './config.js';
import { setHandler } from './mapUtils.js';
import { handleBuildingClick, handleBackgroundClick } from './onClick.js';
import { rerenderLists, toggleSidebar } from './sideBar.js';
/*global mapboxgl*/ //mapboxgl 비선언 오류 숨기기
//브랜치 커밋 구분을 위한 주석
export function initMap() {
    // ... (initMap 함수 내용은 동일) ...
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
        setHandler(map, "campus-3d", e => handleBuildingClick(map, e));
        map.on('click', (e) => handleBackgroundClick(map, e));
        // map.on('click', (e) =>{console.log(map.queryRenderedFeatures(e.point))});
    });
    return map;
}

export function start() {
    const map = initMap();

    rerenderLists(map); // (수정) generateBuildingList 대신 새로고침 함수 호출

    // --- 사이드바 토글 로직 (이전과 동일) ---
    toggleSidebar();

    // --- 모달 닫기 로직 (이전과 동일) ---
    const modal = document.getElementById('modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    modalCloseBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}