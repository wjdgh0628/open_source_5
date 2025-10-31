import { CONFIG } from './config.js';
import { handleBuildingListClick } from './onClick.js';
import { searchBasicInfoByBid } from './mapUtils.js';

// 목록 새로고침 함수
export function rerenderLists(map) {
    if (!map) return; // 데이터가 없으면 실행 중지
    const favorites = loadFavorites();
    // 저장된 GeoJSON 데이터와 map 객체를 사용해 리스트 재생성
    generateBuildingList(map, favorites);
}
// 1. 로컬 스토리지에서 즐겨찾기 목록 저장/불러오기
function saveFavorites(favsArray) { localStorage.setItem('campusFavorites', JSON.stringify(favsArray)); }
function loadFavorites() {
    const favsJSON = localStorage.getItem('campusFavorites');
    return favsJSON ? JSON.parse(favsJSON) : [];
}

// 즐겨찾기 토글 함수(DOM을 직접 조작하는 대신, 저장 후 새로고침 호출)
function toggleFavorite(bid) {
    let favorites = loadFavorites();
    const index = favorites.indexOf(bid);

    if (index > -1) { favorites.splice(index, 1); }// 이미 즐겨찾기 됨 -> 삭제
    else { favorites.push(bid); }// 새 즐겨찾기 -> 추가

    saveFavorites(favorites); // 1. 로컬스토리지에 저장
}

export function toggleSidebar() {
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
    if (sidebar.classList.contains('collapsed')) {
        toggleBtn.textContent = '>';
    } else {
        toggleBtn.textContent = '<';
    }
}

async function generateBuildingList(map, favorites) {

    const favList = document.getElementById('favorites-list');
    const allList = document.getElementById('all-buildings-list');
    favList.innerHTML = '';
    allList.innerHTML = '';

    const nameKey = CONFIG.campus.nameProp;
    const idKey = CONFIG.campus.idProp;
    for (const bid of CONFIG.bidList) {
        const info = await searchBasicInfoByBid(bid);
        const name = info.name;
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
            rerenderLists(map);
        });

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;

        nameSpan.addEventListener('click', () => {
            handleBuildingListClick(map, bid);
        });

        listItem.appendChild(favButton);
        listItem.appendChild(nameSpan);

        if (isFavorited) {
            favList.appendChild(listItem);
        } else {
            // geojson 순서대로 추가되므로 순서가 보장됨
            allList.appendChild(listItem);
        }
    };
}