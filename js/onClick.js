import { CONFIG } from './config.js';
import {
    currentState, flyCamera, hideCampusBase, showCampusBase, generateFloors, 
    removeFloorsFor, setFloorOpacities, autoFloorsArray, searchBuildingByBid, showFloorplanModal
} from './mapUtils.js';

//빌딩 층 보여주는 함수 >> 건물클릭, 리스트 클릭시 이 함수를 호출
export async function showBuildingFloors(map, bid) {

    // 이전에 활성화된 모든 건물 층 모델들 삭제
    Object.keys(currentState).forEach(b => removeFloorsFor(map, b));
    
    // 층 배열 생성 (지하층/지상층 정보 활용)
    const info = await searchBuildingByBid(bid);
    let ring = info.ring;
    const lvProp = info.levels;
    const bmProp = info.basement;
    const floorsSpec = autoFloorsArray(lvProp, bmProp, CONFIG.buildingDefaults);

    // currentState에 현재 건물 정보 저장
    currentState[bid] = { coords: ring, floorsSpec, floorLayerIds: [], sourceId: `${bid}-floors` };

    // 건물 숨김, 층 생성, 카메라 이동
    hideCampusBase(map);
    generateFloors(map, bid);
    flyCamera(map, CONFIG.camera.building, info.center);

    // 상태 변수 업데이트
    currentState.activeBid = bid;
    currentState.buildProp = info.properties;
    currentState.pos = info.center;
    currentState.mode = 1; // 건물 층 보기 모드
    console.log(info.bid);
}

//공통 feature 추출 함수
function extractFeature(input) {
    // 지도 클릭 이벤트일 경우
    if (input?.features) return input.features[0];
    // 리스트 클릭일 경우 이미 feature임
    return input;
}

//건물 클릭 시 실행
export function handleBuildingClick(map, e) {
    e.originalEvent && (e.originalEvent.cancelBubble = true);
    const f = extractFeature(e);

    if (!f) return;
    // 건물 폴리곤 좌표와 ID 가져오기
    let ring = f.geometry.coordinates[0];
    if (!ring) return;

    const bid = f.properties?.[CONFIG.campus.idProp];

    showBuildingFloors(map, bid);
}

//리스트 클릭 시 실행
export function handleBuildingListClick(map, bid) {
    showBuildingFloors(map, bid);
}

// 층 클릭시 실행할 코드   
export function handleFloorClick(map, e, bid, fid, level) {
    e.originalEvent && (e.originalEvent.cancelBubble = true);
    currentState.activeFid = fid;
    currentState.activeLevel = level;

    const imageFileName = `${bid}_${level}.png`;
    const imagePath = `/floorplans/${imageFileName}`;

    setFloorOpacities(map, bid, level);
    flyCamera(map, CONFIG.camera.floor, currentState.pos, JSON.parse(currentState.buildProp?.["bearing"]));
    currentState.mode = 2;

    const animationDurationMs = 1200; 
    setTimeout(() => {
        showFloorplanModal(imagePath, bid, level); 
    }, animationDurationMs);
}

//배경 클릭시 실행할 코드
export function handleBackgroundClick(map, e) {
    const floorLayers = Object.entries(currentState)
        .filter(([k, v]) => v && v.floorLayerIds)
        .flatMap(([, st]) => st.floorLayerIds);
    const hit = map.queryRenderedFeatures(e.point, { layers: floorLayers });
    if (hit.length === 0) {
        const baseHit = [
            ...map.queryRenderedFeatures(e.point, { layers: ["campus-3d"] })
        ];
        if (baseHit.length > 0) return;
        if (currentState.mode == 2) {
            flyCamera(map, CONFIG.camera.building, currentState.pos);
            setFloorOpacities(map, currentState.activeBid, null)
            currentState.mode = 1;
        }
        else {
            Object.keys(currentState).forEach(bid => removeFloorsFor(map, bid));
            showCampusBase(map);
            currentState.mode = 0;
        }
    }
}