import { CONFIG } from './config.js';
import { setHandler } from './mapUtils.js';
import { handleBuildingClick, handleBackgroundClick } from './onClick.js';
import { rerenderLists } from './sideBar.js';
/*global mapboxgl*/

// --- ▼▼▼ 새로 올린 main.js의 함수들 추가 ▼▼▼ ---
const showMenu = (toggleId, navbarId, bodyId) => {
    const toggle = document.getElementById(toggleId),
    navbar = document.getElementById(navbarId),
    bodypadding = document.getElementById(bodyId)

    if( toggle && navbar ) {
        toggle.addEventListener('click', ()=>{
            navbar.classList.toggle('expander');
            bodypadding.classList.toggle('body-pd')
        })
    }
}

// (삭제) 'Active' 기능 관련 로직 삭제
/*
const linkColor = document.querySelectorAll('.nav__link')
function colorLink() {
    linkColor.forEach(l=> l.classList.remove('active'))
    this.classList.add('active')
}
*/

const linkCollapse = document.getElementsByClassName('collapse__link')
function setupCollapseMenu() {
    var i
    for(i=0;i<linkCollapse.length;i++) {
        linkCollapse[i].addEventListener('click', function(){
            const collapseMenu = this.nextElementSibling
            collapseMenu.classList.toggle('showCollapse')

            const rotate = collapseMenu.previousElementSibling
            rotate.classList.toggle('rotate')
        });
    }
}
// --- ▲▲▲ 새 함수 추가 끝 ▲▲▲ ---


export function initMap() {
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
        setHandler(map, "campus-3d", e => handleBuildingClick(map, e));
        map.on('click', (e) => handleBackgroundClick(map, e));
    });
    return map;
}

export function start() {
    const map = initMap();

    rerenderLists(map); // 건물 리스트 렌더링

    // --- ▼▼▼ (수정) 새 사이드바 기능 호출 ▼▼▼ ---
    showMenu('nav-toggle', 'navbar', 'body-pd');
    // (삭제) linkColor.forEach(l=> l.addEventListener('click', colorLink));
    setupCollapseMenu();
    // --- ▲▲▲ 수정 끝 ▲▲▲ ---

    // --- 모달 닫기 로직 (기존과 동일) ---
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