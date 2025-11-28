// src/SideBar.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
	loadRoomFavorites,
	saveRoomFavorites,
	toggleRoomFavoriteInList,
	fetchBuildings,
	getRoomList,
	indexRoomList,
} from '../scripts/sideBarUtils.js';

import './SideBar.css';
import LogoImg from '../assets/logo2.png';

import Favorites from './Favorites.jsx';
import BuildingList from './BuildingList.jsx';
import { handleRoomListClick } from '../scripts/mapHandlers.js';



export default function SideBar({ map }) {
// UI 상태
	const [isExpanded, setIsExpanded] = useState(false);
	const [favOpen, setFavOpen] = useState(true);
	const [allOpen, setAllOpen] = useState(true);

	// 데이터 상태
	const [favorites, setFavorites] = useState(() => loadRoomFavorites()); // [rid, rid, ...]
	const [buildings, setBuildings] = useState([]); // [{ bid, name }]

	// 사이드바 몸통 패딩 동기화
	useEffect(() => {
		if (isExpanded) {
			document.body.classList.add('body-pd');
		} else {
			document.body.classList.remove('body-pd');
		}
	}, [isExpanded]);

	// 건물 명칭 로딩
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const list = await fetchBuildings();
				if (!cancelled) setBuildings(list);
			} catch (e) {
				console.error('Failed to load building list', e);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// SC.roomList 및 rid 인덱스
	const roomList = useMemo(() => getRoomList(), []);
	const ridIndex = useMemo(() => indexRoomList(), []);

	// bid -> building name 매핑
	const buildingNameMap = useMemo(() => {
		const m = {};
		for (const b of buildings) m[b.bid] = b.name;
		return m;
	}, [buildings]);

	// 즐겨찾기 토글(방 rid 기준)
	const toggleFavoriteRoom = (rid) => {
		setFavorites((prev) => {
			const next = toggleRoomFavoriteInList(prev, rid);
			saveRoomFavorites(next);
			return next;
		});
	};

	// 방 클릭 핸들러 (옵션 A)
	const onRoomClick = (bid, floorIndex, rid) => {
		if (!map) return;
		handleRoomListClick(map, bid, floorIndex, rid);
	};

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
							onClick={() => setFavOpen((v) => !v)}
						>
							<ion-icon name="star-outline" class="nav__icon" />
							<span className="nav_name">즐겨찾기</span>
							<ion-icon
								name="chevron-down-outline"
								class={`collapse__link ${favOpen ? 'rotate' : ''}`}
							/>
						</div>
						<ul className={`collapse__menu ${favOpen ? 'showCollapse' : ''}`} id="favorites-list">
							<Favorites
								favorites={favorites}
								ridIndex={ridIndex}
								buildingNames={buildingNameMap}
								onToggleFavorite={toggleFavoriteRoom}
								onRoomClick={onRoomClick}
							/>
						</ul>

						{/* 전체 리스트 (건물/층/방) */}
						<div
							className="nav__link collapse showCollapse"
							onClick={() => setAllOpen((v) => !v)}
						>
							<ion-icon name="business-outline" class="nav__icon" />
							<span className="nav_name">전체 리스트</span>
							<ion-icon
								name="chevron-down-outline"
								class={`collapse__link ${allOpen ? 'rotate' : ''}`}
							/>
						</div>
						<ul className={`collapse__menu ${allOpen ? 'showCollapse' : ''}`} id="all-list">
							<BuildingList
								roomList={roomList}
								buildingNames={buildingNameMap}
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