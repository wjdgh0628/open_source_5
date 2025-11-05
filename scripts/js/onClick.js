import { CONFIG } from './config.js';
import { showCampusBase, hideCampusBase, hideAllFloors, setFloors,
    flyCamera, searchBasicInfoByBid, searchFloorInfoByBid
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
    await hideAllFloors(map);
    hideCampusBase(map);
    setFloors(map, floor);
    flyCamera(map, CONFIG.camera.building, basic.center, basic.bearing);
}
//리스트 클릭 시 실행
export async function handleBuildingListClick(map, bid) {
    const basic = await searchBasicInfoByBid(bid);
    const floor = await searchFloorInfoByBid(bid);
    console.log(`리스트에서 [${basic.name}] 클릭됨.`);

    // 건물 숨김, 층 생성, 카메라 이동
    await hideAllFloors(map);
    hideCampusBase(map);
    setFloors(map, floor);
    flyCamera(map, CONFIG.camera.building, basic.center, basic.bearing);
}
// 층 클릭시 실행할 코드 (수정됨)
export function handleFloorClick(bid, fid, level) {
    console.log(fid, "클릭됨");
    
}
//배경 클릭시 실행할 코드
export function handleBackgroundClick(map, e) {
    const features = map.queryRenderedFeatures(e.point);
    const topFeature = features[0];
    let isBackground = false;

    if (features.length == 0) isBackground = true;
    else CONFIG.bgIdList.forEach(v => { if (topFeature.layer.id.includes(v)) isBackground = true });

    if (isBackground) {
        hideAllFloors(map);
        showCampusBase(map);
        console.log("배경 클릭됨");
    }
}