import { SC } from './editorConfig.js';

//geojson bid로 건물 데이터 요청
export async function reqBuildingByBid(bid, opt) {
	const req = {
		method: 'POST',
  		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			bid: bid,
			opt: opt
		})
	};
	return await fetch(SC.reqBuildings, req)
		.then(response => response.json())
		.then(data => {
			// console.log(data);
			return data;
		})
		.catch(err => { console.error("파일 불러오기 실패:", err); return false; });
}
export async function reqRoomsByLvI(bid, lvI) {
	const req = {
		method: 'POST',
  		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			bid: bid,
			lvI: lvI
		})
	};
	return await fetch(SC.reqRooms, req)
		.then(response => response.json())
		.then(data => {
			// console.log(data);
			return data;
		})
		.catch(err => { console.error("파일 불러오기 실패:", err); return false; });
}
/* //bid로 건물 기본정보 검색
export async function searchBasicInfoByBid(bid) {
    const opt = [
        {
            bid: bid,
            properties: f.properties,
            name: f.properties.name,
            coordinates: f.geometry.coordinates[0],
            center: f.properties?.center,
            bearing: f.properties?.bearing,
            floorBearing: f.properties?.floorBearing
        }
    ]
    return {
        bid: bid,
        properties: f.properties,
        name: f.properties.name,
        coordinates: f.geometry.coordinates[0],
        center: f.properties?.center,
        bearing: f.properties?.bearing,
        floorBearing: f.properties?.floorBearing
    };
} */
//bid로 건물 층 정보 검색
/* export async function searchFloorInfoByBid(bid) {
    if (!f) return;
    const floors = f.properties?.floors;

    const totLevel = floors?.flLevel + floors?.bmLevel;
    const flList = floors?.flList;

    //geojson에 저장된 층수랑 층 배열 길이가 같은지 검사
    if (totLevel != flList.length) {
        console.log(`층수 오류 | 지상:${floors.bmLevel} + 지하:${floors.flLevel}, 배열 길이${flList.length}`);
        return;
    }

    return {
        bid: bid,
        flLevel: floors?.flLevel,
        bmLevel: floors?.bmLevel,
        totLevel: totLevel,
        flList: flList,
        flVars: floors?.flVars
        // offset: f.properties.offset
    };
} */
//bid, levelIndex로 방 정보 요청
/* export async function requestRoomsByBid(bid, lvI) {
	let f = null;
	if (cache.rooms[bid]?.[lvI]) {
		f = cache.rooms[bid][lvI];
		// console.log(`캐시에서 불러옴: ${bid} lvI: ${lvI}, ${++cache.cachingCount}`);
	} else {
		await fetch(SC.roomsUrl)
			.then(response => response.json())
			.then(data => {
				const rooms = data?.[bid]?.[lvI];

				if (rooms) {
					f = rooms;
					if (!cache.rooms[bid]) cache.rooms[bid] = {};
					cache.rooms[bid][lvI] = f;
					// console.log(`파일에서 불러옴: ${bid} lvI: ${lvI}, ${++cache.fetchCount}`);
				} else {
					console.log("bid 혹은 층수 오류", bid, lvI);
					f = false;
				}
			})
			.catch(err => { console.error("파일 불러오기 실패:", err); f = null; });
	}
	return f;
} */