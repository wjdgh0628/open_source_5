// src/sidebar/Favorites.jsx
import React, { useMemo } from 'react';

/**
 * props:
 * - favorites: string[] (rid[])
 * - ridIndex: { [rid]: { bid, floorIndex, name } }
 * - buildingNames: { [bid]: string }
 * - onToggleFavorite: (rid) => void
 * - onRoomClick: (bid, floorIndex, rid) => void
 */
export default function Favorites({
	favorites,
	ridIndex,
	buildingNames,
	onToggleFavorite,
	onRoomClick,
}) {
// 존재하는 rid만 표시
	const favItems = useMemo(() => {
		const items = [];
		for (const rid of favorites) {
			const meta = ridIndex[rid];
			if (!meta) continue;
			const { bid, floorIndex, name } = meta;
			items.push({
				rid,
				bid,
				floorIndex,
				roomName: name || '',
				buildingName: buildingNames[bid] || bid,
			});
		}
		return items;
	}, [favorites, ridIndex, buildingNames]);

	if (favItems.length === 0) {
		return (
			<li style={{ padding: '8px', fontSize: '0.9rem', color: '#888' }}>
				즐겨찾기가 없습니다.
			</li>
		);
	}

	return (
		<>
			{favItems.map(({ rid, bid, floorIndex, roomName, buildingName }) => (
				<li
					key={rid}
					className="building-list-item"
					onClick={() => onRoomClick(bid, floorIndex, rid)}
				>
					<button
						className="favorite-btn favorited"
						onClick={(e) => {
							e.stopPropagation();
							onToggleFavorite(rid);
						}}
						title="즐겨찾기 해제"
					>
						★
					</button>
					<span>
						{buildingName} / {floorIndex}층 / {roomName}
					</span>
				</li>
			))}
		</>
	);
}