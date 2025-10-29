import { CONFIG } from './config.js';
import {currentState, generateFloors} from './mapUtils.js';
import {handleBuildingClick, handleBackgroundClick, handleBuildingListClick} from './onClick.js';

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
        map.on("click", "campus-3d", e => handleBuildingClick(map, e));
        map.on("click", e => handleBackgroundClick(map, e));
    });
    currentState.mode = 0;
    return map;
}
export function start()
{
        const map = initMap();
        fetch(CONFIG.campus.geojsonUrl)
            .then(res => res.json())
            .then(geojsonData => {
                generateBuildingList(map, geojsonData);
            })
            .catch(err => console.error("GeoJSON 불러오기 오류:", err));

        //건물 리스트 생성 함수
        function generateBuildingList(mapInstance, geojsonData) {
            const listContent = document.getElementById('building-list-content');
            listContent.innerHTML = ''; 
            
            const ul = document.createElement('ul');
            ul.classList.add('building-list'); 
            
            const nameKey = CONFIG.campus.nameProp; 
            
            // GeoJSON의 각 건물 feature 반복
            geojsonData.features.forEach(feature => {
                const name = feature.properties?.[nameKey];
                if (!name) return; 

                const listItem = document.createElement('li');
                listItem.textContent = name;
                listItem.classList.add('building-list-item');
                listItem.addEventListener('click', () => {
                    console.log(`[${name}] 클릭됨.`);
                    handleBuildingListClick(mapInstance, feature.properties?.["@id"]);
                });
                
                ul.appendChild(listItem);
            });
            listContent.appendChild(ul);
        }

        //사이드바 토글 기능
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle-btn');
        const icon = toggleBtn.querySelector('i');

        toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        } else {
            icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
        }
    });
}