import { CONFIG } from './config.js';
import { handleBuildingListClick } from './onClick.js';
import { searchBasicInfoByBid } from './mapUtils.js';

// 목록 새로고침 함수
export function rerenderLists(map) {
    if (!map) return;  // 데이터가 없으면 실행 중지
    const favorites = loadFavorites();
    // 저장된 GeoJSON 데이터와 map 객체를 사용해 리스트 재생성
    generateBuildingList(map, favorites);
}
// 로컬 스토리지에서 즐겨찾기 목록 저장/불러오기
function saveFavorites(favsArray) { localStorage.setItem('campusFavorites', JSON.stringify(favsArray)); }
function loadFavorites() {
    const favsJSON = localStorage.getItem('campusFavorites');
    return favsJSON ? JSON.parse(favsJSON) : [];
}

// 즐겨찾기 토글 함수
function toggleFavorite(bid) {
    let favorites = loadFavorites();
    const index = favorites.indexOf(bid);

    if (index > -1) { favorites.splice(index, 1); }
    else { favorites.push(bid); }

    saveFavorites(favorites); 
}

async function generateBuildingList(map, favorites) {

    const favList = document.getElementById('favorites-list');
    const allList = document.getElementById('all-buildings-list');
    favList.innerHTML = '';
    allList.innerHTML = '';
    
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
        linkCollapse[i].addEventListener('click', function(){
            const collapseMenu = this.nextElementSibling
            collapseMenu.classList.toggle('showCollapse')

            const rotate = collapseMenu.previousElementSibling
            rotate.classList.toggle('rotate')
        });
    }
}