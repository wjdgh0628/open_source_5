import { CONFIG } from './config.js';
import { showCampusBase, removeAllFloors, flyCamera, hideCampusBase, generateFloors, searchBuildingByBid } from './mapUtils.js';

//건물 클릭 시 실행
export async function handleBuildingClick(map, e) {
    const properties = e.properties
    const bid = properties?.["origin"] ? properties?.["origin"] : properties?.[CONFIG.campus.idProp];
    
    console.log("건물 클릭됨: ", properties?.[CONFIG.campus.idProp]);
    
    // 층 배열 생성 (지하층/지상층 정보 활용)
    const info = await searchBuildingByBid(bid);
    
    // 건물 숨김, 층 생성, 카메라 이동
    await removeAllFloors(map);
    hideCampusBase(map);
    generateFloors(map, info);
    flyCamera(map, CONFIG.camera.building, info.center, info.bearing);
}

//리스트 클릭 시 실행
export async function handleBuildingListClick(map, bid) {
    const info = await searchBuildingByBid(bid);
    console.log(`리스트에서 [${info.name}] 클릭됨.`);

    // 건물 숨김, 층 생성, 카메라 이동
    await removeAllFloors(map);
    hideCampusBase(map);
    generateFloors(map, info);
    flyCamera(map, CONFIG.camera.building, info.center, info.bearing);
}

// 층 클릭시 실행할 코드
export function handleFloorClick(map, e, bid, fid) {
    console.log("층 클릭됨: ", fid);
}

//배경 클릭시 실행할 코드
export function handleBackgroundClick(map, e) {
    const features = map.queryRenderedFeatures(e.point);
    const topFeature = features[0];
    let isBackground = false;
    
    if(features.length == 0) isBackground = true;
    else CONFIG.bgIdList.forEach(v => {if(topFeature.layer.id.includes(v)) isBackground = true});

    if (isBackground) {
        removeAllFloors(map);
        showCampusBase(map);
        console.log("배경 클릭됨");
    }
}