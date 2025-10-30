import { CONFIG } from './config.js';
import { setHandler } from './mapUtils.js';
import { handleBuildingClick, handleBackgroundClick, handleBuildingListClick } from './onClick.js';
/*global mapboxgl*/ //mapboxgl 비선언 오류 숨기기

// --- ▼▼▼ (수정) 전역 변수 추가 ▼▼▼ ---
let allGeojsonData = null; // 불러온 GeoJSON 데이터를 저장할 변수
let currentMapInstance = null; // map 객체를 저장할 변수
// --- ▲▲▲ (수정) 전역 변수 추가 ▲▲▲ ---


// 1. 로컬 스토리지에서 즐겨찾기 목록 불러오기
function loadFavorites() {
    const favsJSON = localStorage.getItem('campusFavorites');
    return favsJSON ? JSON.parse(favsJSON) : []; 
}

// 2. 로컬 스토리지에 즐겨찾기 목록 저장하기
function saveFavorites(favsArray) {
    localStorage.setItem('campusFavorites', JSON.stringify(favsArray));
}

// --- ▼▼▼ (신규) 목록 새로고침 함수 ▼▼▼ ---
// 3. 목록을 통째로 다시 그리는 함수
function rerenderLists() {
    if (!allGeojsonData || !currentMapInstance) return; // 데이터가 없으면 실행 중지
    const favorites = loadFavorites();
    // 저장된 GeoJSON 데이터와 map 객체를 사용해 리스트 재생성
    generateBuildingList(currentMapInstance, allGeojsonData, favorites);
}
// --- ▲▲▲ (신규) 목록 새로고침 함수 ▲▲▲ ---


// --- ▼▼▼ (수정) 즐겨찾기 토글 함수 ▼▼▼ ---
// (DOM을 직접 조작하는 대신, 저장 후 새로고침 호출)
function toggleFavorite(bid) {
    let favorites = loadFavorites();
    const index = favorites.indexOf(bid);

    if (index > -1) {
        // 이미 즐겨찾기 됨 -> 삭제
        favorites.splice(index, 1);
    } else {
        // 새 즐겨찾기 -> 추가
        favorites.push(bid);
    }
    
    saveFavorites(favorites); // 1. 로컬스토리지에 저장
    rerenderLists(); // 2. 목록 전체를 새로고침 (순서 보장)
}
// --- ▲▲▲ (수정) 즐겨찾기 토글 함수 ▲▲▲ ---


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

// --- ▼▼▼ (수정) 건물 리스트 생성 함수 ▼▼▼ ---
// (generateBuildingList를 start 함수 밖으로 이동시킴)
function generateBuildingList(mapInstance, geojsonData, favorites) {
    const favList = document.getElementById('favorites-list');
    const allList = document.getElementById('all-buildings-list');
    favList.innerHTML = ''; 
    allList.innerHTML = ''; 
    
    const nameKey = CONFIG.campus.nameProp; 
    const idKey = CONFIG.campus.idProp; 
    
    geojsonData.features.forEach(feature => {
        const name = feature.properties?.[nameKey];
        const bid = feature.properties?.[idKey];
        if (!name || !bid) return; 

        const isFavorited = favorites.includes(bid);

        const listItem = document.createElement('li');
        listItem.classList.add('building-list-item');

        const favButton = document.createElement('button');
        favButton.classList.add('favorite-btn');
        if (isFavorited) {
            favButton.textContent = '★';
            favButton.classList.add('favorited');
        } else {
            favButton.textContent = '☆';
        }
        
        // (수정) 클릭 시 DOM 조작 대신 toggleFavorite(bid)만 호출
        favButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(bid); // buttonElement를 넘길 필요 없음
        });

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        
        nameSpan.addEventListener('click', () => {
            console.log(`[${name}] 클릭됨.`);
            handleBuildingListClick(mapInstance, bid);
        });

        listItem.appendChild(favButton);
        listItem.appendChild(nameSpan);
        
        if (isFavorited) {
            favList.appendChild(listItem);
        } else {
            // geojson 순서대로 추가되므로 순서가 보장됨
            allList.appendChild(listItem);
        }
    });
}
// --- ▲▲▲ (수정) 건물 리스트 생성 함수 ▲▲▲ ---


export function start()
{
        const map = initMap();
        currentMapInstance = map; // (수정) map 객체를 전역 변수에 저장

        fetch(CONFIG.campus.geojsonUrl)
            .then(res => res.json())
            .then(geojsonData => {
                allGeojsonData = geojsonData; // (수정) geojson 데이터를 전역 변수에 저장
                rerenderLists(); // (수정) generateBuildingList 대신 새로고침 함수 호출
            })
            .catch(err => console.error("GeoJSON 불러오기 오류:", err));

        // (수정) generateBuildingList 함수가 밖으로 이동함

        // --- 사이드바 토글 로직 (이전과 동일) ---
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle-btn');
        
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            
            if (sidebar.classList.contains('collapsed')) {
                toggleBtn.textContent = '>';
            } else {
                toggleBtn.textContent = '<';
            }
        });
        
        if (sidebar.classList.contains('collapsed')) {
             toggleBtn.textContent = '>';
        } else {
             toggleBtn.textContent = '<';
        }

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