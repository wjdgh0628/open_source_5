import { SC } from "./editor.config.js";

//geojson bid로 건물 데이터 요청
async function requestBuildingByBid(bid) {
    let f = null;
    await fetch(SC.buildingsUrl)
        .then(response => response.json())
        .then(data => {
            const targetId = bid;
            const feature = data.features.find(f => f.properties[SC.jsonProp.id] === targetId);

            if (feature) {
                f = feature;
                // console.log(`파일에서 불러옴: ${bid}, ${++cache.fetchCount}`);
            } else {
                console.log("해당 ID를 가진 객체가 없습니다.:", bid);
                f = false;
            }
        })
        .catch(err => { console.error("파일 불러오기 실패:", err); f = false; });
    return f;
}
//bid로 건물 기본정보 검색
export async function searchBasicInfoByBid(bid) {
    const f = await requestBuildingByBid(bid);
    return {
        bid: bid,
        properties: f.properties,
        name: f.properties.name,
        coordinates: f.geometry.coordinates[0],
        center: f.properties?.center,
        bearing: f.properties?.bearing,
        floorBearing: f.properties?.floorBearing
    };
}
//bid로 건물 층 정보 검색
export async function searchFloorInfoByBid(bid) {
    const f = await requestBuildingByBid(bid);
    if (!f) return;
    const floors = f.properties?.floors;

    const totLevel = floors?.flLevel + floors?.bmLevel;
    const flList = floors?.flList;

    //geojson에 저장된 층수랑 층 배열 길이가 같은지 검사
    if (totLevel != flList.length) {
        console.log(`층수 오류 | 지상:${floors.bmLevel} + 지하:${floors.flLevel}, 배열 길이${flList.length}`);
        return;
    }

    return {
        bid: bid,
        flLevel: floors?.flLevel,
        bmLevel: floors?.bmLevel,
        totLevel: totLevel,
        flList: flList,
        flVars: floors?.flVars
        // offset: f.properties.offset
    };
}
//bid, levelIndex로 방 정보 요청
export async function requestRoomsByBid(bid, lvI) {
    let f = null;
        await fetch(SC.roomsUrl)
            .then(response => response.json())
            .then(data => {
                const rooms = data?.[bid]?.[lvI];

                if (rooms) {
                    f = rooms;
                    // console.log(`파일에서 불러옴: ${bid} lvI: ${lvI}, ${++cache.fetchCount}`);
                } else {
                    console.log("bid 혹은 층수 오류", bid, lvI);
                    f = false;
                }
            })
            .catch(err => { console.error("파일 불러오기 실패:", err); f = null; });
    return f;
}