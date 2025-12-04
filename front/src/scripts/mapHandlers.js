import { idRules, jsonProp } from '@shared/rules.js';
import { getInfos as infos, getCurrent as current, setCurrent, getMap as Map } from '@shared/cache.js';
import { MC } from './mapConfig.js';
import { showLayer, hideLayer, hideFloorsByBid, hideAllRooms, setFloors, flyCamera, setRooms } from './mapUtils.js';

/**건물 클릭 시 실행*/
export async function handleBuildingClick(e) {
	const properties = e.properties;
	const bid = properties?.["origin"] ? properties?.["origin"] : properties?.[jsonProp.id];
	const info = infos()[bid];
	const c = current();

	console.log(`건물 클릭됨: ${properties?.[jsonProp.id]}`);

	// 건물 숨김, 층 생성, 카메라 이동	
	if (c.bid) await hideFloorsByBid(c.bid);
	hideLayer(idRules.buildings);
	setFloors(info, current);
	flyCamera(MC.camera.building, info.center, info.bearing);

	setCurrent(old => ({ ...old, mode: 1, bid: bid }));
}
//리스트 클릭 시 실행
export async function handleRoomListClick(bid, lvI, rid) {
	console.log(`리스트에서 방 클릭됨: [${rid}]`);
	const info = infos()[bid];
	const c = current();

	if (c.bid) await hideFloorsByBid(c.bid);
	hideLayer(idRules.buildings);
	setRooms(bid, lvI, info);
	showLayer(idRules.clickedFloor(bid, lvI));
	flyCamera(MC.camera.room, info.center, info.floorBearing);

	setCurrent(old => ({ ...old, mode: 2, bid: bid, lvI: lvI }));
}
// 층 클릭시 실행할 코드 (수정됨)
export async function handleFloorClick(fid, lvI, info) {
	console.log(`층 클릭됨: ${fid}`);
	const bid = info.bid;
	const c = current();

	if (c.bid) await hideFloorsByBid(c.bid);
	setRooms(bid, lvI, info);
	showLayer(idRules.clickedFloor(bid, lvI));
	flyCamera(MC.camera.floor, info.center, info.floorBearing);

	setCurrent(old => ({ ...old, mode: 2, lvI: lvI }));
}
//배경 클릭시 실행할 코드
export async function handleBackgroundClick(e) {
	const features = Map().queryRenderedFeatures(e.point);
	const topFeature = features[0];
	const c = current();
	let isBackground = false;

	if (features.length == 0) isBackground = true;
	else MC.bgIdList.forEach(v => { if (topFeature.layer.id.includes(v)) isBackground = true; });
	if (isBackground) {
		console.log("배경 클릭됨");
		if (c.mode == 2) {
			const info = infos()[c.bid];

			// 건물 숨김, 층 생성, 카메라 이동
			await hideAllRooms(c.bid, c.lvI);
			hideLayer(idRules.buildings);
			setFloors(info);
			flyCamera(MC.camera.building, info.center, info.bearing);

			setCurrent(old => ({ ...old, mode: 1, bid: info.bid }));
		}
		else {
			if (c.bid) await hideFloorsByBid(c.bid);
			showLayer(idRules.buildings);

			setCurrent(old => ({ ...old, mode: 0, bid: null }));
		}
	}
}
