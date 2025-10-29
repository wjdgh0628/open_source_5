import { CONFIG } from './config.js';
import {flyCamera, hideCampusBase, showCampusBase, generateFloors, autoFloorsArray, searchBuildingByBid, removeAllFloors
} from './mapUtils.js';

//빌딩 층 보여주는 함수 >> 건물클릭, 리스트 클릭시 이 함수를 호출
export async function showBuildingFloors(map, bid) {
    
    // 층 배열 생성 (지하층/지상층 정보 활용)
    const info = await searchBuildingByBid(bid);
    const lvProp = info.levels;
    const bmProp = info.basement;
    const floorsSpec = autoFloorsArray(lvProp, bmProp, CONFIG.buildingDefaults);

    // 건물 숨김, 층 생성, 카메라 이동
    hideCampusBase(map);
    generateFloors(map, info, floorsSpec);
    flyCamera(map, CONFIG.camera.building, info.center);
}

//건물 클릭 시 실행
export function handleBuildingClick(map, e) {
    e.originalEvent && (e.originalEvent.cancelBubble = true);
    const f = e?.features ? e.features[0] : e;
    // 지도 클릭 이벤트일 경우 0번 feature , 리스트 클릭일 경우 이미 feature임
    
    if (!f) return;
    // 건물 폴리곤 좌표와 ID 가져오기
    let ring = f.geometry.coordinates[0];
    if (!ring) return;
    
    const bid = f.properties?.[CONFIG.campus.idProp];
    
    console.log("건물 클릭됨: ", bid);
    showBuildingFloors(map, bid);
}

//리스트 클릭 시 실행
export function handleBuildingListClick(map, bid) {
    showBuildingFloors(map, bid);
}

// 층 클릭시 실행할 코드
export function handleFloorClick(map, e, bid, fid) {
    console.log("층 클릭됨: ", bid, fid);
}

//배경 클릭시 실행할 코드
export function handleBackgroundClick(map, e) {
    removeAllFloors(map);
    showCampusBase(map);
    console.log("배경 클릭됨");
}