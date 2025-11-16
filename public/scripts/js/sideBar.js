import { CONFIG } from './config.js';
// ===== ▼▼▼ (수정) handleFavoriteRoomClick 임포트 ▼▼▼ =====
import { handleFavoriteRoomClick, handleBuildingListClick } from './onClick.js';
// ===== ▲▲▲ 수정 완료 ▲▲▲ =====
import { searchBasicInfoByBid } from './mapUtils.js';

// 목록 새로고침 함수 (수정됨)
export function rerenderLists(map) {
    if (!map) return;
    const favorites = loadFavorites();
    generateFavoriteList(map, favorites);
    generateBuildingList(map); 
}

// 1. 로컬 스토리지 관련 함수 (수정됨)
function saveFavorites(favsArray) {
    localStorage.setItem('campusRoomFavorites', JSON.stringify(favsArray));
}
function loadFavorites() {
    const favsJSON = localStorage.getItem('campusRoomFavorites');
    return favsJSON ? JSON.parse(favsJSON) : []; 
}

// 2. 즐겨찾기 토글 함수 (수정됨)
export function toggleFavorite(roomInfo) {
    let favorites = loadFavorites();
    const index = favorites.findIndex(fav => fav.id === roomInfo.id);

    if (index > -1) {
        console.log("즐겨찾기 삭제:", roomInfo.id);
        favorites.splice(index, 1); 
    } else {
        console.log("즐겨찾기 추가:", roomInfo.id);
        favorites.push(roomInfo); 
    }

    saveFavorites(favorites); 
}

// ===== ▼▼▼ (신규) 즐겨찾기 리스트 생성 함수 ▼▼▼ =====
async function generateFavoriteList(map, favorites) {
    const favList = document.getElementById('favorites-list');
    favList.innerHTML = ''; 

    for (const fav of favorites) {
        const listItem = document.createElement('li');
        listItem.classList.add('building-list-item'); 

        const favButton = document.createElement('button');
        favButton.classList.add('favorite-btn');
        favButton.textContent = '★'; 
        favButton.classList.add('favorited');

        favButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(fav); 
            rerenderLists(map);
        });

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${fav.buildingName} - ${fav.roomName}`;

        nameSpan.addEventListener('click', () => {
            handleFavoriteRoomClick(map, fav);
        });

        listItem.appendChild(favButton);
        listItem.appendChild(nameSpan);
        favList.appendChild(listItem);
    };
}
// ===== ▲▲▲ 신규 함수 끝 ▲▲▲ =====

// (수정) 전체 건물 리스트 생성 함수
async function generateBuildingList(map) {
    const allList = document.getElementById('all-buildings-list');
    allList.innerHTML = '';

    const nameKey = CONFIG.campus.nameProp;
    const idKey = CONFIG.campus.idProp;
    for (const bid of CONFIG.bidList) {
        const info = await searchBasicInfoByBid(bid);
        const name = info.name;
        if (!name || !bid) return;

        const listItem = document.createElement('li');
        listItem.classList.add('building-list-item'); 

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;

        nameSpan.addEventListener('click', () => {
            handleBuildingListClick(map, bid);
        });

        const icon = document.createElement('div');
        icon.style.width = '28px'; 
        
        listItem.appendChild(icon); 
        listItem.appendChild(nameSpan);
        allList.appendChild(listItem);
    };
}

export const showMenu = (toggleId, navbarId, bodyId) => {
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


export function setupCollapseMenu(linkCollapse) {
    var i
    for(i=0;i<linkCollapse.length;i++) {
        linkCollapse[i].addEventListener('click', function(e){
            e.stopPropagation();
            const collapseMenu = this.nextElementSibling
            collapseMenu.classList.toggle('showCollapse')

            const rotate = collapseMenu.previousElementSibling
            rotate.classList.toggle('rotate')
        });
    }
}