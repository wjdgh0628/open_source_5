import {idRules} from "@shared/rules.js";

/**
 * ===== 즐겨찾기(방 rid 전용) ====
 */
const ROOM_FAV_KEY = 'campusFavoriteRooms';

export function loadRoomFavorites() {
	try {
		const raw = localStorage.getItem(ROOM_FAV_KEY);
		const arr = raw ? JSON.parse(raw) : [];
		// 중복 제거
		return Array.from(new Set(Array.isArray(arr) ? arr : []));
	} catch {
		return [];
	}
}

export function saveRoomFavorites(favsArray) {
	localStorage.setItem(ROOM_FAV_KEY, JSON.stringify(Array.from(new Set(favsArray || []))));
}

export function toggleRoomFavoriteInList(favorites, rid) {
	if (!rid) return favorites || [];
	const set = new Set(favorites || []);
	if (set.has(rid)) set.delete(rid);
	else set.add(rid);
	return Array.from(set);
}

/**
 * rid 인덱스: rid -> { bid, floorIndex, name }
 */
export function indexRoomList(raw) {
	// console.log(raw);
	if (!raw) return {};
	const idx = {};
	for (const [bid, f] of Object.entries(raw)) {
		const floors = f.rooms;
		const buildingName = f.name || '';
		(floors || []).forEach((rooms, lvI) => {
			(rooms || []).forEach((r,i) => {
				const rid = idRules.rid(bid, lvI, i);
				if (r && rid) {
					idx[rid] = {
						bid,
						buildingName: buildingName,
						lvI: lvI,
						bmLevel: f.bmLevel,
						name: r.name || '',
						tags: Array.isArray(r.tags) ? r.tags : [],
						desc: r.desc || '',
					};
				}
			});
		});
	}
	return idx;
}

/**
 * 건물 기본 정보 로딩: [{ bid, name }]
 */
// 예시 이름: reqBuildingsByBidList(bids, req)
// 리턴은 { [bid]: { name: ... } } 또는 [{ bid, name }, ...] 같은 구조라고 가정
