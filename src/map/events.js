import { MC, SC, current } from './map.config.js';
import {showLayer, hideLayer, hideFloorsByBid, hideAllRooms,setFloors,flyCamera, setRooms} from './mapUtils.js';
import { searchBasicInfoByBid, searchFloorInfoByBid } from './request.js';

//건물 클릭 시 실행
export async function handleBuildingClick(map, e) {
    const properties = e.properties
    const bid = properties?.["origin"] ? properties?.["origin"] : properties?.[SC.jsonProp.id];

    console.log(`건물 클릭됨: ${properties?.[SC.jsonProp.id]}`);

    // 층 배열 생성 (지하층/지상층 정보 활용)
    const bInfo = await searchBasicInfoByBid(bid);
    const fInfo = await searchFloorInfoByBid(bid);

    // 건물 숨김, 층 생성, 카메라 이동
    if(current.bid) await hideFloorsByBid(map, current.bid);
    hideLayer(map, MC.idRules.buildings);
    setFloors(map, fInfo);
    flyCamera(map, MC.camera.building, bInfo.center, bInfo.bearing);

    current.mode = 1;
    current.bid = bid;
}
//리스트 클릭 시 실행
export async function handleBuildingListClick(map, bid) {
    const bInfo = await searchBasicInfoByBid(bid);
    const fInfo = await searchFloorInfoByBid(bid);
    console.log(`리스트에서 건물 클릭됨: [${bInfo.name}]`);

    // 건물 숨김, 층 생성, 카메라 이동
    if(current.bid) await hideFloorsByBid(map, current.bid);
    hideLayer(map, MC.idRules.buildings);
    setFloors(map, fInfo);
    flyCamera(map, MC.camera.building, bInfo.center, bInfo.bearing);

    current.mode = 1;
    current.bid = bid;
}
// 층 클릭시 실행할 코드 (수정됨)
export async function handleFloorClick(map, bid, fid, level, lvI) {
    console.log(`층 클릭됨: ${fid}`);
    const bInfo = await searchBasicInfoByBid(bid);
    const fInfo = await searchFloorInfoByBid(bid);

    if(current.bid) await hideFloorsByBid(map, current.bid);
    setRooms(map, bid, level, lvI, fInfo);
    showLayer(map, MC.idRules.clickedFloor(bid, level));
    flyCamera(map, MC.camera.floor, bInfo.center, bInfo.floorBearing);

    current.mode = 2;
    current.level = level;
}
//배경 클릭시 실행할 코드
export async function handleBackgroundClick(map, e) {
    const features = map.queryRenderedFeatures(e.point);
    const topFeature = features[0];
    let isBackground = false;

    if (features.length == 0) isBackground = true;
    else MC.bgIdList.forEach(v => { if (topFeature.layer.id.includes(v)) isBackground = true });
    if (isBackground) {
        console.log("배경 클릭됨");
        if (current.mode == 2) {
            const fInfo = await searchFloorInfoByBid(current.bid);
            const bInfo = await searchBasicInfoByBid(current.bid);
            const lvI = MC.idRules.lvI(fInfo.bmLevel, current.level);
            
            // 건물 숨김, 층 생성, 카메라 이동
            await hideAllRooms(map, current.bid, current.level, lvI);
            hideLayer(map, MC.idRules.buildings);
            setFloors(map, fInfo);
            flyCamera(map, MC.camera.building, bInfo.center, bInfo.bearing);

            current.mode = 1;
            current.bid = bInfo.bid;
        }
        else {
            if(current.bid) await hideFloorsByBid(map, current.bid);
            showLayer(map, MC.idRules.buildings);
            current.mode = 0;
            current.bid = null;
        }
    }
}
