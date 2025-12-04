import React, { useMemo, useState } from 'react';

import FloorList from './FloorList.jsx';

/**
 * props:
 * - buildingsInfo: { [bid]: { name: string, bmLevel: number, rooms: Array<Array<{ rid: string, name: string }>> } }
 * - favorites: string[] (rid[])
 * - onToggleFavorite: (rid) => void
 * - onRoomClick: (bid, floorIndex, rid) => void
 */
export default function BuildingList({
	infos,
	favorites,
	onToggleFavorite,
	onRoomClick
}) {
	// 펼침 상태
	const [openBids, setOpenBids] = useState(() => new Set());

	const bids = useMemo(() => {
		return Object.keys(infos || {});
	}, [infos]);
	
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
				const buildingData = infos?.[bid] || {};
				const floors = buildingData.rooms || [];
				const bName = buildingData.name || bid;
				const bmLevel = buildingData.bmLevel;

				return (
					<li key={bid} style={{ marginBottom: '0.25rem' }}>
						<div
							className="nav__link collapse showCollapse"
							onClick={() => toggleBid(bid)}
							title={bName}
						>
							<ion-icon name="home-outline" class="nav__icon" />
							<span className="nav_name">{bName}</span>
							<span className={`collapse__link ${openBids.has(bid) ? 'rotate' : ''}`}>▼</span>
						</div>

						<ul className={`collapse__menu ${openBids.has(bid) ? 'showCollapse' : ''}`}>
							<FloorList
								bid={bid}
								bmLevel={bmLevel}
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