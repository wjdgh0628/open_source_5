import React, { useMemo, useState } from 'react';

/**
 * 강의실 검색 컴포넌트
 * props:
 *  - roomsIndex: { [rid]: { bid, buildingName, lvI, bmLevel, name, tags? } }
 *  - favorites: string[] (rid 배열)
 *  - onToggleFavorite(rid)
 *  - onRoomClick(rid)
 */
export default function Search({ roomsIndex, favorites, onToggleFavorite, onRoomClick }) {
	const [query, setQuery] = useState('');

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];

		const words = q.split(/\s+/).filter(Boolean);
		if (!words.length) return [];

		const entries = Object.entries(roomsIndex || {});

		return entries
			.map(([rid, info]) => ({ rid, ...info }))
			.filter(({ name = '', tags = [] }) => {
				const text = [name, ...(Array.isArray(tags) ? tags : [])]
					.join(' ')
					.toLowerCase();
				return words.every((w) => text.includes(w));
			})
			.slice(0, 50); // 최대 50개까지 표시
	}, [roomsIndex, query]);

	const hasQuery = query.trim().length > 0;

	return (
		<div className="nav__search">
			<input
				type="text"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				className="nav__search-input"
				placeholder="강의실 이름·태그 검색"
			/>
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
											className={
												'favorite-btn' + (isFav ? ' favorited' : '')
											}
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
	);
}
