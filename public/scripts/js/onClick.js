import { CONFIG, current } from './config.js';
import {
    showLayer, hideLayer, allFloors, hideAllFloors, setFloors, allRooms,
    flyCamera, searchBasicInfoByBid, searchFloorInfoByBid, setRooms,
    fetchRoomsByBid // (추가)
} from './mapUtils.js';
import { rerenderLists, toggleFavorite } from './sideBar.js';


// ===== ▼▼▼ (신규) 폴리곤 중심 계산 유틸리티 ▼▼▼ =====
function calculatePolygonCenter(polygon) {
    if (!polygon || polygon.length === 0) {
        return null;
    }
    let minX = polygon[0][0], maxX = polygon[0][0];
    let minY = polygon[0][1], maxY = polygon[0][1];

    for (let i = 1; i < polygon.length; i++) {
        if (polygon[i][0] < minX) minX = polygon[i][0];
        if (polygon[i][0] > maxX) maxX = polygon[i][0];
        if (polygon[i][1] < minY) minY = polygon[i][1];
        if (polygon[i][1] > maxY) maxY = polygon[i][1];
    }
    return [(minX + maxX) / 2, (minY + maxY) / 2];
}
// ===== ▲▲▲ 신규 함수 끝 ▲▲▲ =====


//건물 클릭 시 실행
export async function handleBuildingClick(map, e) {
    const properties = e.properties
    const bid = properties?.["origin"] ? properties?.["origin"] : properties?.[CONFIG.campus.idProp];

    console.log("건물 클릭됨: ", properties?.[CONFIG.campus.idProp]);

    const basic = await searchBasicInfoByBid(bid);
    const floor = await searchFloorInfoByBid(bid);

    await hideAllFloors(map);
    hideLayer(map, CONFIG.idRules.buildings);
    setFloors(map, floor);
    flyCamera(map, CONFIG.camera.building, basic.center, basic.bearing);

    current.mode = 1;
    current.bid = bid;
}
//리스트 클릭 시 실행
export async function handleBuildingListClick(map, bid) {
    const basic = await searchBasicInfoByBid(bid);
    const floor = await searchFloorInfoByBid(bid);
    console.log(`리스트에서 [${basic.name}] 클릭됨.`);

    await hideAllFloors(map);
    hideLayer(map, CONFIG.idRules.buildings);
    setFloors(map, floor);
    flyCamera(map, CONFIG.camera.building, basic.center, basic.bearing);

    current.mode = 1;
    current.bid = bid;
}
// 층 클릭시 실행할 코드
export async function handleFloorClick(map, bid, fid, level) {
    console.log(fid, "클릭됨");
    const basic = await searchBasicInfoByBid(bid);
    const floor = await searchFloorInfoByBid(bid);

    allFloors(map, bid, (map, fid) => hideLayer(map, fid), fid);
    setRooms(map, bid, level, floor);
    flyCamera(map, CONFIG.camera.floor, basic.center, basic.floorBearing);

    current.mode = 2;
    current.level = level;
}

// ===== ▼▼▼ (수정) 강의실 "좌클릭" 함수에 'export' 추가 ▼▼▼ =====
export async function handleRoomClick(map, bid, rid, level, roomName) {
    console.log(`강의실 [${roomName}] 클릭됨. (빌딩: ${bid})`);

    // 1. 모달 요소 가져오기
    const modal = document.getElementById('confirm-modal-overlay');
    const title = document.getElementById('confirm-modal-title');
    const text = document.getElementById('confirm-modal-text');
    const yesBtn = document.getElementById('confirm-modal-yes');
    const noBtn = document.getElementById('confirm-modal-no');

    // 2. 빌딩 정보에서 빌딩 이름 가져오기
    const info = await searchBasicInfoByBid(bid);
    const buildingName = info.name || bid;

    // 3. 즐겨찾기 정보 객체 생성
    const roomInfo = {
        id: rid, // 예: "stem_4_1"
        bid: bid, // 예: "stem"
        level: level, // 예: 4
        roomName: roomName, // 예: "401호"
        buildingName: buildingName // 예: "이공관"
    };

    // 4. 모달 내용 설정
    title.textContent = "즐겨찾기";
    text.textContent = `"${buildingName} - ${roomName}"을(를) 즐겨찾기에 추가하시겠습니까?`;

    // 5. "예" 버튼 리스너 (중요: 기존 리스너 제거 후 새로 추가)
    const newYesBtn = yesBtn.cloneNode(true); 
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn); 

    newYesBtn.addEventListener('click', () => {
        toggleFavorite(roomInfo); // 즐겨찾기 추가/삭제
        rerenderLists(map);      // 사이드바 새로고침
        modal.classList.add('hidden'); // 모달 닫기
    });

    // 6. "아니요" 버튼 리스너 (모달 닫기)
    noBtn.onclick = () => {
        modal.classList.add('hidden');
    };
    
    // 7. 모달 표시
    modal.classList.remove('hidden');
}
// ===== ▲▲▲ 수정 완료 ▲▲▲ =====

// ===== ▼▼▼ (수정) 즐겨찾기 클릭 함수에 'export' 추가 ▼▼▼ =====
export async function handleFavoriteRoomClick(map, favInfo) {
    const { bid, level, id, roomName } = favInfo;
    console.log(`즐겨찾기 [${favInfo.buildingName} - ${roomName}] 클릭됨.`);

    // 1. 해당 건물의 층 정보 로드
    const basic = await searchBasicInfoByBid(bid);
    const floor = await searchFloorInfoByBid(bid);
    
    // 2. 다른 건물/층 숨기고, 해당 층만 표시
    await hideAllFloors(map);
    hideLayer(map, CONFIG.idRules.buildings);
    setFloors(map, floor); 

    // 3. 해당 층을 제외한 나머지 층 숨기기
    const fid = CONFIG.idRules.fid(bid, level);
    allFloors(map, bid, (map, layerId) => hideLayer(map, layerId), fid);

    // 4. 해당 층의 강의실 로드
    setRooms(map, bid, level, floor);

    // 5. 해당 "강의실"로 카메라 이동
    try {
        const levelIndex = level < 0 ? level + floor.bmLevel : level + floor.bmLevel - 1;
        const rooms = await fetchRoomsByBid(bid, levelIndex);
        
        const roomIndex = parseInt(id.split('_')[2], 10) - 1; 
        const room = rooms[roomIndex];
        
        if (room && room.polygon) {
            const roomCenter = calculatePolygonCenter(room.polygon);
            flyCamera(map, CONFIG.camera.floor, roomCenter, basic.floorBearing);
        } else {
            flyCamera(map, CONFIG.camera.floor, basic.center, basic.floorBearing);
        }
    } catch (e) {
        console.error("강의실 이동 중 오류:", e);
        flyCamera(map, CONFIG.camera.floor, basic.center, basic.floorBearing);
    }

    current.mode = 2;
    current.bid = bid;
    current.level = level;
}
// ===== ▲▲▲ 수정 완료 ▲▲▲ =====


//배경 클릭시 실행할 코드
export async function handleBackgroundClick(map, e) {
    const features = map.queryRenderedFeatures(e.point);
    const topFeature = features[0];
    let isBackground = false;

    if (features.length == 0) isBackground = true;
    else CONFIG.bgIdList.forEach(v => { if (topFeature.layer.id.includes(v)) isBackground = true });
    
    if (isBackground) {
        if (current.mode === 2 && current.bid) {
            const floor = await searchFloorInfoByBid(current.bid);
            const basic = await searchBasicInfoByBid(current.bid);
            console.log("배경 클릭됨 (모드 2 -> 1)");
            
            await hideAllFloors(map);
            hideLayer(map, CONFIG.idRules.buildings);
            await allRooms(map, current.bid, current.level, (map, rid) => hideLayer(map, rid));
            setFloors(map, floor);
            flyCamera(map, CONFIG.camera.building, basic.center, basic.bearing);

            current.mode = 1;
            current.bid = basic.bid;
        }
        else if (current.mode === 1) {
            console.log("배경 클릭됨 (모드 1 -> 0)");
            hideAllFloors(map);
            showLayer(map, CONFIG.idRules.buildings);
            current.mode = 0;
            current.bid = null;
        }
    }
}