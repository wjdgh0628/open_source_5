import React, { useState } from 'react';

/**
 * props:
 * - bid: string
 * - floors: Array<Array<{ rid: string, name: string }>>
 * - favorites: string[] (rid[])
 * - onToggleFavorite: (rid) => void
 * - onRoomClick: (bid, floorIndex, rid) => void
 */
export default function FloorList({
	bid,
	floors,
	favorites,
	onToggleFavorite,
	onRoomClick,
}) {
	const [openFloors, setOpenFloors] = useState(() => new Set());

	const toggleFloor = (idx) => {
		setOpenFloors((prev) => {
			const next = new Set(prev);
			if (next.has(idx)) next.delete(idx);
			else next.add(idx);
			return next;
		});
	};

	return (
		<>
			{floors.map((rooms, floorIndex) => {
				const isOpen = openFloors.has(floorIndex);
				return (
					<li key={`${bid}-${floorIndex}`} style={{ marginBottom: '0.25rem' }}>
						<div
							className="nav__link collapse showCollapse"
							onClick={() => toggleFloor(floorIndex)}
						>
							<ion-icon name="layers-outline" class="nav__icon" />
							<span className="nav_name">{floorIndex}층</span>
							<ion-icon
								name="chevron-down-outline"
								class={`collapse__link ${isOpen ? 'rotate' : ''}`}
							/>
						</div>

						<ul className={`collapse__menu ${isOpen ? 'showCollapse' : ''}`}>
							{(rooms || []).map((room) => {
								const rid = room?.rid;
								if (!rid) return null;
								const isFav = favorites.includes(rid);

								return (
									<li
										key={rid}
										className="building-list-item"
										onClick={() => onRoomClick(bid, floorIndex, rid)}
									>
										<button
											className={`favorite-btn ${isFav ? 'favorited' : ''}`}
											onClick={(e) => {
												e.stopPropagation();
												onToggleFavorite(rid);
											}}
											title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
										>
											{isFav ? '★' : '☆'}
										</button>
										<span>{room?.name || rid}</span>
									</li>
								);
							})}
							{(!rooms || rooms.length === 0) && (
								<li style={{ padding: '8px', fontSize: '0.9rem', color: '#888' }}>
									방 없음
								</li>
							)}
						</ul>
					</li>
				);
			})}
		</>
	);
}