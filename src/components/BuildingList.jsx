import React, { useMemo, useState } from 'react';

import FloorList from './FloorList.jsx';

/**
 * props:
 * - roomList: { [bid]: [ [ { rid, name }, ... ]  floor0 , [ ... ]  floor1 , ... ] }
 * - buildingNames: { [bid]: string }
 * - favorites: string[] (rid[])
 * - onToggleFavorite: (rid) => void
 * - onRoomClick: (bid, floorIndex, rid) => void
 */
export default function BuildingList({
	roomList,
	buildingNames,
	favorites,
	onToggleFavorite,
	onRoomClick,
}) {
// 펼침 상태
	const [openBids, setOpenBids] = useState(() => new Set());

	const bids = useMemo(() => {
		// 표시 순서: buildingNames에 있는 순서 우선, 없으면 roomList 키
		const named = Object.keys(buildingNames || {});
		const withRooms = Object.keys(roomList || {});
		const set = new Set([...named, ...withRooms]);
		return Array.from(set);
	}, [buildingNames, roomList]);

	const toggleBid = (bid) => {
		setOpenBids((prev) => {
			const next = new Set(prev);
			if (next.has(bid)) next.delete(bid);
			else next.add(bid);
			return next;
		});
	};

	return (
		<>
			{bids.map((bid) => {
				const floors = roomList?.[bid] || [];
				const bName = buildingNames?.[bid] || bid;

				return (
					<li key={bid} style={{ marginBottom: '0.25rem' }}>
						<div
							className="nav__link collapse showCollapse"
							onClick={() => toggleBid(bid)}
							title={bName}
						>
							<ion-icon name="home-outline" class="nav__icon" />
							<span className="nav_name">{bName}</span>
							<ion-icon
								name="chevron-down-outline"
								class={`collapse__link ${openBids.has(bid) ? 'rotate' : ''}`}
							/>
						</div>

						<ul className={`collapse__menu ${openBids.has(bid) ? 'showCollapse' : ''}`}>
							<FloorList
								bid={bid}
								floors={floors}
								favorites={favorites}
								onToggleFavorite={onToggleFavorite}
								onRoomClick={onRoomClick}
							/>
						</ul>
					</li>
				);
			})}
		</>
	);
}