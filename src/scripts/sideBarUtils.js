// src/map/sideBarUtils.js
import { SC } from './mapConfig.js';
import { reqBuildingByBid } from './mapRequests.js';

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
 * ===== 데이터 소스 =====
 */
export function getRoomList() {
	// { [bid]: [ [ {rid, name}, ... ] /* floor0 */, [ ... ] /* floor1 */, ... ] }
	return SC?.roomList || {};
}

/**
 * rid 인덱스: rid -> { bid, floorIndex, name }
 */
export function indexRoomList() {
	const roomList = getRoomList();
	const idx = {};
	for (const [bid, floors] of Object.entries(roomList)) {
		(floors || []).forEach((rooms, floorIndex) => {
			(rooms || []).forEach((r) => {
				if (r && r.rid) {
					idx[r.rid] = {
						bid,
						floorIndex, // 0부터
						name: r.name || '',
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
export async function fetchBuildings() {
	const bids = SC?.bidList || Object.keys(getRoomList());
	const results = await Promise.all(
		(bids || []).map(async (bid) => {
			try {
				const req = [{name: "name"},{},{}];
				const info = await reqBuildingByBid(bid,req);
				const name = info?.name || bid;
				return { bid, name };
			} catch {
				return { bid, name: bid };
			}
		})
	);
	// 유효한 항목만
	return results.filter((b) => b?.bid && b?.name);
}