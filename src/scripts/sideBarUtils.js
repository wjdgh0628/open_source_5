// src/map/sideBarUtils.js
import { SC } from './mapConfig.js';
import { reqBuildingsInfo } from './mapRequests.js';

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
	for (const [bid, f] of Object.entries(roomList)) {
		const floors = f.rooms;
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
// 예시 이름: reqBuildingsByBidList(bids, req)
// 리턴은 { [bid]: { name: ... } } 또는 [{ bid, name }, ...] 같은 구조라고 가정

async function fetchBuildings() {
	const bids = SC?.bidList || Object.keys(getRoomList());
	if (!bids || !bids.length) return [];

	const req = [{ name: 'name' }, {bmLevel: "bmLevel"}, {}];

	// 여기서 한 번만 호출
	const infoMap = await reqBuildingsInfo(bids, req);
	// ↑ 네가 만든 "배열로 통째로 받는 함수" 이름/리턴 구조에 맞게 수정

	const results = bids.map((bid) => {
		const info = infoMap?.[bid]; // or infoMap.find(...) 등, 실제 리턴 형태에 맞게
		const name = info?.name || bid;
		return { bid, name };
	});

	return results.filter((b) => b?.bid && b?.name);
}