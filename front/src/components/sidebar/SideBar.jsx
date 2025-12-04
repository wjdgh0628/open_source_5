// src/SideBar.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { handleRoomListClick } from '@scripts/mapHandlers.js';
import { loadRoomFavorites, saveRoomFavorites, toggleRoomFavoriteInList, indexRoomList } from '@scripts/sideBarUtils.js';

import './SideBar.css';
import LogoImg from '@assets/logo2.png';
import BuildingList from './BuildingList.jsx';
import Favorites from './Favorites.jsx';

export default function SideBar({ map, buildingsInfo }) {
	// UI 상태
	const [isExpanded, setIsExpanded] = useState(false);
	const [favOpen, setFavOpen] = useState(true);
	const [allOpen, setAllOpen] = useState(true);

	// 데이터 상태
	const [favorites, setFavorites] = useState(() => loadRoomFavorites()); // [rid, rid, ...]

	// 사이드바 몸통 패딩 동기화 (사이드바가 확장 상태일 때만 패딩 적용)
	useEffect(() => {
		if (isExpanded) {
			document.body.classList.add('body-pd');
		} else {
			document.body.classList.remove('body-pd');
		}
	}, [isExpanded]);

	const roomsList = useMemo(() => indexRoomList(buildingsInfo), [buildingsInfo]);

	// 즐겨찾기 토글(방 rid 기준)
	const toggleFavoriteRoom = (rid) => {
		setFavorites((prev) => {
			const next = toggleRoomFavoriteInList(prev, rid);
			saveRoomFavorites(next);
			return next;
		});
	};

	// 방 클릭 핸들러
	const onRoomClick = (bid, floorIndex, rid) => {
		if (!map) return;
		handleRoomListClick(map, bid, floorIndex, rid);
	};


	// const ensureExpanded = () => setIsExpanded(true);
	return (
		<div className={`l-navbar ${isExpanded ? 'expander' : ''}`} id="navbar">
			<nav className="nav">
				<div>
					<div className="nav__brand">
						<ion-icon
							name="menu-outline"
							class="nav__toggle"
							id="nav-toggle"
							onClick={() => setIsExpanded((v) => !v)}
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
						{/* 즐겨찾기 (방 전용) */}
						<div
							className="nav__link collapse showCollapse"
							onClick={() => {
								setIsExpanded(true);
								setFavOpen((v) => !v);
							}}
						>
							<ion-icon name="star-outline" class="nav__icon" />
							<span className="nav_name">즐겨찾기</span>
							<span className={`collapse__link ${favOpen ? 'rotate' : ''}`}>▼</span>
						</div>
						<ul className={`collapse__menu ${favOpen ? 'showCollapse' : ''}`} id="favorites-list">
							<Favorites
								favorites={favorites}
								roomList={roomsList}
								onToggleFavorite={toggleFavoriteRoom}
								onRoomClick={onRoomClick}
							/>
						</ul>

						{/* 전체 리스트 (건물/층/방) */}
						<div
							className="nav__link collapse showCollapse"
							onClick={() => {
								setIsExpanded(true);
								setAllOpen((v) => !v);
							}}
						>
							<ion-icon name="business-outline" class="nav__icon" />
							<span className="nav_name">전체 리스트</span>
							<span className={`collapse__link ${allOpen ? 'rotate' : ''}`}>▼</span>
						</div>
						<ul className={`collapse__menu ${allOpen ? 'showCollapse' : ''}`} id="all-list">
							<BuildingList
								buildingsInfo={buildingsInfo}
								favorites={favorites}
								onToggleFavorite={toggleFavoriteRoom}
								onRoomClick={onRoomClick}
							/>
						</ul>
					</div>
				</div>
			</nav>
		</div>
	);
}