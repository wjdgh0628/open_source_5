// src/components/sidebar/SideBar.jsx
import React, { use, useEffect, useMemo, useState } from 'react';
import { handleRoomListClick as onRoomClick } from '@scripts/mapHandlers.js';
import { loadRoomFavorites, saveRoomFavorites, toggleRoomFavoriteInList, indexRoomList } from '@scripts/sideBarUtils.js';

import './SideBar.css';
import LogoImg from '@assets/logo2.png';
import BuildingList from './BuildingList.jsx';
import Favorites from './Favorites.jsx';
import Search from './Search.jsx';

export default function SideBar({ infos, user, setUser, urls }) {
	// UI 상태
	const [isExpanded, setIsExpanded] = useState(false);
	const [favOpen, setFavOpen] = useState(true);
	const [allOpen, setAllOpen] = useState(true);
	const [footerErr, setFooterErr] = useState('');

	// 데이터 상태
	const [favorites, setFavorites] = useState(() => loadRoomFavorites()); // [rid, rid, ...]
	const [favoriteLabels, setFavoriteLabels] = useState(() => {
		if (typeof window === 'undefined') return {};
		try {
			const raw = window.localStorage.getItem('hmh_favoriteLabels');
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	});

	// 사이드바 몸통 패딩 동기화 (사이드바가 확장 상태일 때만 패딩 적용)
	useEffect(() => {
		if (isExpanded) {
			document.body.classList.add('body-pd');
		} else {
			document.body.classList.remove('body-pd');
		}
	}, [isExpanded]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		try {
			window.localStorage.setItem('hmh_favoriteLabels', JSON.stringify(favoriteLabels));
		} catch {
			// ignore storage errors
		}
	}, [favoriteLabels]);

	const roomsList = useMemo(() => indexRoomList(infos), [infos]);

	// 즐겨찾기 토글(방 rid 기준)
	const toggleFavoriteRoom = (rid) => {
		setFavorites((prev) => {
			const next = toggleRoomFavoriteInList(prev, rid);
			saveRoomFavorites(next);
			return next;
		});
	};

	const handleFavoriteLabelChange = (rid, label) => {
		setFavoriteLabels((prev) => {
			const next = { ...prev };
			const trimmed = label.trim();
			if (!trimmed) {
				delete next[rid];
			} else {
				next[rid] = trimmed;
			}
			return next;
		});
	};

	const ensureExpanded = () => setIsExpanded(true);

	const role = (user?.role || user?.user?.role || '').toLowerCase();
	const isAdmin = role === 'admin';

	const goEditor = () => {
		window.location.href = 'http://localhost:4000/editor';
	};

	const logout = async () => {
		setFooterErr('');
		try {
			const r = await fetch(urls.logout, { method: 'POST' });
			if (r.ok) {
				setUser(null);
				return;
			}
			setFooterErr('로그아웃 실패');
		} catch {
			setFooterErr('네트워크 오류');
		}
	};

	return (
		<div className={`l-navbar ${isExpanded ? 'expander' : ''}`} id="navbar">
			<nav className="nav">
				<div className="nav__body">
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
						{/* 강의실 검색 */}
						<Search
							roomsIndex={roomsList}
							favorites={favorites}
							onToggleFavorite={toggleFavoriteRoom}
							onRoomClick={onRoomClick}
							ensureExpanded={ensureExpanded}
						/>

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
								favoriteLabels={favoriteLabels}
								onChangeFavoriteLabel={handleFavoriteLabelChange}
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
								infos={infos}
								favorites={favorites}
								onToggleFavorite={toggleFavoriteRoom}
								onRoomClick={onRoomClick}
							/>
						</ul>
					</div>
				</div>

				{/* User footer (always visible) */}
				<div className="nav__footer">
					<div className="user__card">
						{(user?.picture || user?.photo || user?.avatar || user?.image || user?.user?.picture) ? (
							<img
								className="user__avatar"
								src={(user?.picture || user?.photo || user?.avatar || user?.image || user?.user?.picture)}
								alt="프로필"
							/>
						) : (
							<div className="user__avatar" style={{ background: '#eee' }} />
						)}
						<div className="user__meta">
							<div className="user__name">{user?.name || user?.user?.name || ''}</div>
							<div className="user__email">{user?.email || user?.user?.email || ''}</div>
						</div>
					</div>

					<div className="user__actions">
						{isAdmin && (
							<button className="user__btn primary" onClick={goEditor} type="button">
								<ion-icon name="create-outline" />
								에디터
							</button>
						)}
						<button className="user__btn" onClick={logout} type="button">
							<ion-icon name="log-out-outline" />
							로그아웃
						</button>
					</div>

					{!!footerErr && <div className="user__err">{footerErr}</div>}
				</div>
			</nav>
		</div>
	);
}