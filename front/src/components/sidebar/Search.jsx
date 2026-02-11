import React, { useMemo, useState, useRef } from 'react';

/**
 * 강의실 검색 컴포넌트
 * props:
 *  - roomsIndex: { [rid]: { bid, buildingName, lvI, bmLevel, name, tags?, desc? } }
 *  - favorites: string[] (rid 배열)
 *  - onToggleFavorite(rid)
 *  - onRoomClick(rid)
 *  - ensureExpanded()
 */
export default function Search({ roomsIndex, favorites, onToggleFavorite, onRoomClick, ensureExpanded }) {
	const [query, setQuery] = useState('');
	const inputRef = useRef(null);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];

		const words = q.split(/\s+/).filter(Boolean);
		if (!words.length) return [];

		const entries = Object.entries(roomsIndex || {});

		return entries
			.map(([rid, info]) => ({ rid, ...info }))
			.filter(({ name = '', tags = [], desc = '' }) => {
				const text = [name, ...(Array.isArray(tags) ? tags : []), desc]
					.join(' ')
					.toLowerCase();
				return words.every((w) => text.includes(w));
			})
			.slice(0, 50); // 최대 50개까지 표시
	}, [roomsIndex, query]);

	const hasQuery = query.trim().length > 0;

	return (
		<>
			{/* 접힘 상태에서만 보이는 아이콘 전용 버튼 */}
			<div
				className="nav__search-collapsed nav__link"
				onClick={() => {
					if (ensureExpanded) ensureExpanded();
					setTimeout(() => inputRef.current?.focus(), 0);
				}}
			>
				<ion-icon name="search-outline" class="nav__icon" />
				<span className="nav_name">검색</span>
			</div>

			{/* 펼친 상태에서 보이는 검색 입력 */}
			<div className="nav__search">
				<div className="nav__search-field">
					<ion-icon name="search-outline" class="nav__search-icon" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="nav__search-input"
						placeholder="강의실 이름·태그·상세설명 검색"
					/>
				</div>

				{hasQuery && (
					<div className="nav__search-results">
						{results.length === 0 ? (
							<div className="nav__search-empty">검색 결과가 없습니다.</div>
						) : (
							<ul className="nav__search-list">
								{results.map(({ rid, bid, lvI, buildingName, name }) => {
									const isFav = Array.isArray(favorites) && favorites.includes(rid);
									return (
										<li
											key={rid}
											className="nav__search-item building-list-item"
											onClick={() => onRoomClick(bid, lvI, rid)}
										>
											<span className="nav__search-main">
												<span className="nav__search-room-name">{name || '(이름 없음)'}</span>
												{buildingName && (
													<span className="nav__search-building">{buildingName}</span>
												)}
											</span>
											<button
												type="button"
												className={'favorite-btn' + (isFav ? ' favorited' : '')}
												onClick={(e) => {
													e.stopPropagation();
													onToggleFavorite(rid);
												}}
											>
												{isFav ? '★' : '☆'}
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				)}
			</div>
		</>
	);
}
