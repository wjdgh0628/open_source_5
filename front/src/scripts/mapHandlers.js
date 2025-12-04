import { idRules, jsonProp } from '@shared/rules.js';
import { MC } from './mapConfig.js';
import { showLayer, hideLayer, hideFloorsByBid, hideAllRooms, setFloors, flyCamera, setRooms } from './mapUtils.js';

//건물 클릭 시 실행
export async function handleBuildingClick(map, e, getBInfo, current) {
	const properties = e.properties;
	const bid = properties?.["origin"] ? properties?.["origin"] : properties?.[jsonProp.id];

	console.log(`건물 클릭됨: ${properties?.[jsonProp.id]}`);

	// 층 배열 생성 (지하층/지상층 정보 활용)
	const info = await getBInfo();

	// 건물 숨김, 층 생성, 카메라 이동
	if (current.bid) await hideFloorsByBid(map, current.bid);
	hideLayer(map, idRules.buildings);
	setFloors(map, info);
	flyCamera(map, MC.camera.building, info.center, info.bearing);

	current.mode = 1;
	current.bid = bid;
}
//리스트 클릭 시 실행
export async function handleRoomListClick(map, bid, lvI, rid, getBInfo, current) {
	console.log(`리스트에서 방 클릭됨: [${rid}]`);

	const info = await getBInfo();

	if (current.bid) await hideFloorsByBid(map, current.bid);
	hideLayer(map, idRules.buildings);
	setRooms(map, bid, lvI, info);
	showLayer(map, idRules.clickedFloor(bid, lvI));
	flyCamera(map, MC.camera.room, info.center, info.floorBearing);

	current.mode = 2;
	current.bid = bid;
	current.lvI = lvI;
}
// 층 클릭시 실행할 코드 (수정됨)
export async function handleFloorClick(map, bid, fid, lvI, getBInfo, current) {
	console.log(`층 클릭됨: ${fid}`);
	const info = await getBInfo();

	if (current.bid) await hideFloorsByBid(map, current.bid);
	setRooms(map, bid, lvI, info);
	showLayer(map, idRules.clickedFloor(bid, lvI));
	flyCamera(map, MC.camera.floor, info.center, info.floorBearing);

	current.mode = 2;
	current.lvI = lvI;
}
//배경 클릭시 실행할 코드
export async function handleBackgroundClick(map, e, getBInfo, current) {
	const features = map.queryRenderedFeatures(e.point);
	const topFeature = features[0];
	let isBackground = false;

	if (features.length == 0) isBackground = true;
	else MC.bgIdList.forEach(v => { if (topFeature.layer.id.includes(v)) isBackground = true; });
	if (isBackground) {
		console.log("배경 클릭됨");
		if (current.mode == 2) {
			const info = await getBInfo();

			// 건물 숨김, 층 생성, 카메라 이동
			await hideAllRooms(map, current.bid, current.lvI);
			hideLayer(map, idRules.buildings);
			setFloors(map, info);
			flyCamera(map, MC.camera.building, info.center, info.bearing);

			current.mode = 1;
			current.bid = info.bid;
		}
		else {
			if (current.bid) await hideFloorsByBid(map, current.bid);
			showLayer(map, idRules.buildings);
			current.mode = 0;
			current.bid = null;
		}
	}
}
