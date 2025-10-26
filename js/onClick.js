import { CONFIG } from './config.js';
import {
    currentState, flyCamera, hideCampusBase, showCampusBase, generateFloors, removeFloorsFor, setFloorOpacities, autoFloorsArray, searchBuildingByBid
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
    if (currentState.activeFid === fid) {
        // 이미 활성화된 층을 다시 클릭한 경우 (두 번째 클릭)
        console.log(`[${fid}] 층을 다시 클릭했습니다. 모달을 엽니다.`);
        
        // 1. 모달 요소들을 가져옵니다.
        const modal = document.getElementById('modal-overlay');
        const modalInfo = document.getElementById('modal-floor-info');

        // 2. 모달에 표시할 내용을 업데이트합니다. (예시)
        // TODO: 나중에 이 부분을 실제 층 정보로 채워야 합니다.
        // rooms.json 데이터를 불러와서 채울 수 있습니다.
        modalInfo.innerHTML = `
            <p><strong>건물 ID:</strong> ${bid}</p>
            <p><strong>층 ID:</strong> ${fid}</p>
            <p><strong>층 레벨:</strong> ${level}</p>
            <p>여기에 <strong>${fid}</strong>의 세부 강의실 정보나 사진 등을 표시할 수 있습니다.</p>
        `;

        // 3. 모달을 보여줍니다.
        modal.classList.remove('hidden');

    } else {
        // 다른 층을 클릭했거나, 층을 처음 클릭한 경우 (첫 번째 클릭)
        currentState.activeFid = fid;
        currentState.activeLevel = level;
        setFloorOpacities(map, bid, level);
        flyCamera(map, CONFIG.camera.floor, currentState.pos, JSON.parse(currentState.buildProp?.["bearing"]));
        currentState.mode = 2;
    }
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