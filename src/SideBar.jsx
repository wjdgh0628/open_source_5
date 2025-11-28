// src/SideBar.jsx (파일 이름/경로는 원하는 대로 바꿔도 됨)
import React, { useEffect, useState } from 'react';
import './SideBar.css';
import LogoImg from './assets/logo2.png';

import { loadFavorites, saveFavorites, fetchBuildings, toggleFavoriteInList } from './map/sideBarUtils.js';
import { handleBuildingListClick } from './map/events.js';

export default function SideBar({ map }) {
  const [isExpanded, setIsExpanded] = useState(false);          // 메뉴 펼침/접힘
  const [favOpen, setFavOpen] = useState(true);                 // 즐겨찾기 섹션 열림 여부
  const [buildingOpen, setBuildingOpen] = useState(true);       // 건물 명칭 섹션 열림 여부
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [buildings, setBuildings] = useState([]);               // [{ bid, name }]

  // body padding 클래스 동기화 (기존 showMenu 기능)
  useEffect(() => {
    if (isExpanded) {
      document.body.classList.add('body-pd');
    } else {
      document.body.classList.remove('body-pd');
    }
  }, [isExpanded]);

  // 건물 목록(이름) 로딩
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const list = await fetchBuildings();
        if (!cancelled) {
          setBuildings(list);
        }
      } catch (e) {
        console.error('Failed to load building list', e);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = (bid) => {
    setFavorites((prev) => {
      const next = toggleFavoriteInList(prev, bid);
      saveFavorites(next);
      return next;
    });
  };

  // 즐겨찾기/전체 리스트 분리
  const favoriteBuildings = buildings.filter(b => favorites.includes(b.bid));
  const normalBuildings = buildings.filter(b => !favorites.includes(b.bid));

  const onMenuToggleClick = () => {
    setIsExpanded(prev => !prev);
  };

  const onFavoriteItemClick = (bid) => {
    if (!map) return;
    handleBuildingListClick(map, bid);
  };

  return (
    <div className={`l-navbar ${isExpanded ? 'expander' : ''}`} id="navbar">
      <nav className="nav">
        <div>
          <div className="nav__brand">
            {/* 메뉴 열기/닫기 버튼 */}
            <ion-icon
              name="menu-outline"
              class="nav__toggle"
              id="nav-toggle"
              onClick={onMenuToggleClick}
            />
            <a href="#" className="nav__logo">
              <img
                src={LogoImg}
                alt="로고"
                style={{ width: '150px', height: '50px', borderRadius: '50%' }}
              />
            </a>
          </div>

          <div className="nav__list">
            {/* 즐겨찾기 섹션 */}
            <div
              className="nav__link collapse showCollapse"
              onClick={() => setFavOpen(prev => !prev)}
            >
              <ion-icon name="star-outline" class="nav__icon" />
              <span className="nav_name">즐겨찾기</span>
              <ion-icon
                name="chevron-down-outline"
                class={`collapse__link ${favOpen ? 'rotate' : ''}`}
              />
            </div>
            <ul className={`collapse__menu ${favOpen ? 'showCollapse' : ''}`} id="favorites-list">
              {favoriteBuildings.map(({ bid, name }) => (
                <li
                  key={bid}
                  className="building-list-item"
                  onClick={() => onFavoriteItemClick(bid)}
                >
                  <button
                    className={`favorite-btn favorited`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(bid);
                    }}
                  >
                    ★
                  </button>
                  <span>{name}</span>
                </li>
              ))}
              {favoriteBuildings.length === 0 && (
                <li style={{ padding: '8px', fontSize: '0.9rem', color: '#888' }}>
                  즐겨찾기가 없습니다.
                </li>
              )}
            </ul>

            {/* 건물 명칭 섹션 */}
            <div
              className="nav__link collapse showCollapse"
              onClick={() => setBuildingOpen(prev => !prev)}
            >
              <ion-icon name="business-outline" class="nav__icon" />
              <span className="nav_name">건물 명칭</span>
              <ion-icon
                name="chevron-down-outline"
                class={`collapse__link ${buildingOpen ? 'rotate' : ''}`}
              />
            </div>
            <ul className={`collapse__menu ${buildingOpen ? 'showCollapse' : ''}`} id="all-buildings-list">
              {normalBuildings.map(({ bid, name }) => (
                <li
                  key={bid}
                  className="building-list-item"
                  onClick={() => onFavoriteItemClick(bid)}
                >
                  <button
                    className={`favorite-btn ${favorites.includes(bid) ? 'favorited' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(bid);
                    }}
                  >
                    {favorites.includes(bid) ? '★' : '☆'}
                  </button>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}