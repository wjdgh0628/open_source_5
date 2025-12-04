import React, { useMemo } from 'react';
import { idRules } from '@shared/rules.js';

/**
 * props:
 * - favorites: string[] (rid[])
 * - roomList: { [rid]: { bid, buildingName, level, name } }
 * - onToggleFavorite: (rid) => void
 * - onRoomClick: (bid, floorIndex, rid) => void
 */
export default function Favorites({
	favorites,
	roomList,
	onToggleFavorite,
	onRoomClick,
}) {
// 존재하는 rid만 표시
	const favItems = useMemo(() => {
		const items = [];
		for (const rid of favorites) {
			const meta = roomList[rid];
			if (!meta) continue;
			const { bid, buildingName, lvI, name, bmLevel } = meta;
			items.push({
				rid,
				bid,
				lvI: lvI,
				bmLevel: bmLevel,
				roomName: name || '방 이름 오류',
				buildingName: buildingName || '건물 이름 오류',
			});
		}
		return items;
	}, [favorites, roomList]);

	if (favItems.length === 0) {
		return (
			<li style={{ padding: '8px', fontSize: '0.9rem', color: '#888' }}>
				즐겨찾기가 없습니다.
			</li>
		);
	}

	return (
		<>
			{favItems.map(({ rid, bid, lvI, roomName, buildingName, bmLevel }) => (
				<li
					key={rid}
					className="building-list-item"
					onClick={() => onRoomClick(bid, lvI, rid)}
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
						{buildingName} / {idRules.lvChar(bmLevel, lvI)} / {roomName}
					</span>
				</li>
			))}
		</>
	);
}