import { CONFIG } from './config.js';
import {
    currentState, flyCamera, hideCampusBase, showCampusBase, generateFloors, removeFloorsFor, setFloorOpacities, autoFloorsArray
} from './mapUtils.js';

//건물 클릭시 실행할 코드
export function handleBuildingClick(map, e) {
    //모르는 코드
    e.originalEvent && (e.originalEvent.cancelBubble = true);
    // 클릭한 건물 geojson 정보 가져오기
    const f = e.features?.[0];
    if (!f) return;
    // 클릭한 건물 폴리곤 가져오기
    let ring = f.geometry.coordinates[0];
    if (!ring) return;

    //bid 가져오기
    const bid = f.properties?.[CONFIG.campus.idProp];
    // 아마 건물들 3d모델들 삭제하는 코드
    Object.keys(currentState).forEach(b => removeFloorsFor(map, b));
    
    // 층 배열 만들기
    const lvProp = f.properties?.["building:levels"];
    const bmProp = f.properties?.["building:basement"];
    const floorsSpec = autoFloorsArray(lvProp, bmProp, CONFIG.buildingDefaults);

    //빌딩스테이드에 건물 정보 추가
    currentState[bid] = { coords: ring, floorsSpec, floorLayerIds: [], sourceId: `${bid}-floors` };

    //건물 숨기고 층 생성하고 카메라 이동
    hideCampusBase(map);
    generateFloors(map, bid);
    flyCamera(map, CONFIG.camera.building, JSON.parse(f.properties?.["center"]));

    //cs에 현재상태 저장
    currentState.activeBid = bid;
    currentState.buildProp = f.properties;
    currentState.pos = JSON.parse(f.properties?.["center"]);
    currentState.mode = 1;
}

// 층 클릭시 실행할 코드
export function handleFloorClick(map, e, bid, fid, level) {
    e.originalEvent && (e.originalEvent.cancelBubble = true);
    currentState.activeFid = fid;
    currentState.activeLevel = level;
    setFloorOpacities(map, bid, level);
    flyCamera(map, CONFIG.camera.floor, currentState.pos, JSON.parse(currentState.buildProp?.["bearing"]));
    currentState.mode = 2;
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