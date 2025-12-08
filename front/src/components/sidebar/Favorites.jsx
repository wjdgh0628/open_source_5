import React, { useMemo, useState } from 'react';
import { idRules } from '@shared/rules.js';

/**
 * props:
 * - favorites: string[] (rid[])
 * - roomList: { [rid]: { bid, buildingName, level, name, lvI, bmLevel } }
 * - onToggleFavorite: (rid) => void
 * - onRoomClick: (bid, floorIndex, rid) => void
 * - favoriteLabels: { [rid]: string }
 * - onChangeFavoriteLabel: (rid: string, label: string) => void
 */
export default function Favorites({
	favorites,
	roomList,
	onToggleFavorite,
	onRoomClick,
	favoriteLabels,
	onChangeFavoriteLabel,
}) {
	const [editingRid, setEditingRid] = useState(null);
	const [editValue, setEditValue] = useState('');

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
			{favItems.map(({ rid, bid, lvI, roomName, buildingName, bmLevel }) => {
				const isEditing = editingRid === rid;
				const defaultLabel = `${buildingName} / ${idRules.lvChar(bmLevel, lvI)} / ${roomName}`;
				const displayLabel = favoriteLabels?.[rid] ?? defaultLabel;

				const commitEdit = () => {
					onChangeFavoriteLabel(rid, editValue);
					setEditingRid(null);
					setEditValue('');
				};

				const cancelEdit = () => {
					setEditingRid(null);
					setEditValue('');
				};

				return (
					<li
						key={rid}
						className="building-list-item"
						onClick={() => {
							if (!isEditing) {
								onRoomClick(bid, lvI, rid);
							}
						}}
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
						<span
							className="favorite-room-label"
							onClick={(e) => {
								if (isEditing) {
									e.stopPropagation();
								}
							}}
						>
							{isEditing ? (
								<input
									className="favorite-edit-input"
									type="text"
									value={editValue}
									autoFocus
									onChange={(e) => setEditValue(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											commitEdit();
										} else if (e.key === 'Escape') {
											e.preventDefault();
											cancelEdit();
										}
									}}
									onBlur={commitEdit}
								/>
							) : (
								displayLabel
							)}
						</span>
						<button
							className="favorite-edit-btn"
							title="표시 이름 편집"
							onClick={(e) => {
								e.stopPropagation();
								if (isEditing) {
									commitEdit();
								} else {
									setEditingRid(rid);
									setEditValue(displayLabel);
								}
							}}
						>
							<ion-icon name="create-outline" />
						</button>
					</li>
				);
			})}
		</>
	);
}