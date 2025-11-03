import { CONFIG } from './config.js';
import { handleBuildingListClick } from './onClick.js';
import { searchBasicInfoByBid } from './mapUtils.js';

// 목록 새로고침 함수
export function rerenderLists(map) {
    if (!map) return; 
    const favorites = loadFavorites();
    generateBuildingList(map, favorites);
}
// 1. 로컬 스토리지 관련 함수
function saveFavorites(favsArray) { localStorage.setItem('campusFavorites', JSON.stringify(favsArray)); }
function loadFavorites() {
    const favsJSON = localStorage.getItem('campusFavorites');
    return favsJSON ? JSON.parse(favsJSON) : [];
}

// 2. 즐겨찾기 토글 함수
function toggleFavorite(bid) {
    let favorites = loadFavorites();
    const index = favorites.indexOf(bid);

    if (index > -1) { favorites.splice(index, 1); }
    else { favorites.push(bid); }

    saveFavorites(favorites); 
}

// ===== ▼▼▼ (삭제) toggleSidebar 함수 전체 삭제 ▼▼▼ =====
// (새 UI는 이 함수를 사용하지 않습니다)
// ===== ▲▲▲ 함수 삭제 끝 ▲▲▲ =====

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

        favButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(bid); 
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
            allList.appendChild(listItem);
        }
    };
}