import { CONFIG } from './config.js';
import { showCampusBase, hideCampusBase, generateFloors, removeAllFloors,
    flyCamera, searchBasicInfoByBid, searchFloorInfoByBid//, showFloorplanModal
} from './mapUtils.js';

//건물 클릭 시 실행
export async function handleBuildingClick(map, e) {
    const properties = e.properties
    const bid = properties?.["origin"] ? properties?.["origin"] : properties?.[CONFIG.campus.idProp];

    console.log("건물 클릭됨: ", properties?.[CONFIG.campus.idProp]);

    // 층 배열 생성 (지하층/지상층 정보 활용)
    const basic = await searchBasicInfoByBid(bid);
    const floor = await searchFloorInfoByBid(bid);

    // 건물 숨김, 층 생성, 카메라 이동
    await removeAllFloors(map);
    hideCampusBase(map);
    generateFloors(map, floor);
    flyCamera(map, CONFIG.camera.building, basic.center, basic.bearing);
}
//리스트 클릭 시 실행
export async function handleBuildingListClick(map, bid) {
    const basic = await searchBasicInfoByBid(bid);
    const floor = await searchFloorInfoByBid(bid);
    console.log(`리스트에서 [${basic.name}] 클릭됨.`);

    // 건물 숨김, 층 생성, 카메라 이동
    await removeAllFloors(map);
    hideCampusBase(map);
    generateFloors(map, floor);
    flyCamera(map, CONFIG.camera.building, basic.center, basic.bearing);
}
/* // 층 클릭시 실행할 코드 (수정됨)
export function handleFloorClick(bid, fid, level) {
    
    const imageFileName = `${bid}_${level}.png`;
    const imagePath = `/floorplans/${imageFileName}`;
    
    const animationDurationMs = 1200; 
    setTimeout(() => {
        showFloorplanModal(imagePath, bid, level); 
    }, animationDurationMs);
} */
//배경 클릭시 실행할 코드
export function handleBackgroundClick(map, e) {
    const features = map.queryRenderedFeatures(e.point);
    const topFeature = features[0];
    let isBackground = false;

    if (features.length == 0) isBackground = true;
    else CONFIG.bgIdList.forEach(v => { if (topFeature.layer.id.includes(v)) isBackground = true });

    if (isBackground) {
        removeAllFloors(map);
        showCampusBase(map);
        console.log("배경 클릭됨");
    }
}
export function handleFloorClick(bid, fid, level) {
    console.log(`[${fid}] 층을 클릭했습니다. 모달을 엽니다.`);

    // 1. 모달 요소들을 가져옵니다.
    const modal = document.getElementById('modal-overlay');
    const modalInfo = document.getElementById('modal-floor-info');

    // --- ▼▼▼ 수정된 부분 시작 ▼▼▼ ---

    // 2. 이미지 경로를 설정합니다.
    let imgPath = `${CONFIG.campus.floorplanUrl}/${bid}_${level}.png`;
    console.log(imgPath);

    // 3. 모달에 표시할 내용을 업데이트합니다.
    modalInfo.innerHTML =
        //<p><strong>건물 ID:</strong> ${bid}</p>
        //<p><strong>층 ID:</strong> ${fid}</p>
        //<p><strong>층 레벨:</strong> ${level}</p>
        `
            <img 
                src="${imgPath}" 
                alt="${bid} ${level}층 평면도" 
                onerror="this.style.display='none'; this.nextSibling.style.display='block';" 
            />
            <p style="display:none; color: #888; text-align: center;">
                (평면도 이미지를 찾을 수 없습니다.)
            </p>
        `;
    // --- ▲▲▲ 수정된 부분 끝 ▲▲▲ ---

    // 4. 모달을 보여줍니다.
    modal.classList.remove('hidden');
}