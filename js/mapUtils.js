import { CONFIG } from './config.js';
import { handleFloorClick } from './onClick.js';

//층 생성 총괄
export function generateFloors(map, info) {
    const bid = info.bid; 
    const { floorThickness, floorGap, colorPalette, basementPalette } = CONFIG.buildingDefaults;

    if (info.bmLevel + info.flLevel != info.flList.length) {
        console.log("층수 오류", info.bmLevel, info.flLevel, info.flList.length);
        return;
    }

    let floorsSpec = []
    info.flList.forEach((flVarNum, i) => {
        let fi = i - info.bmLevel;
        let bi = i + (4 - info.bmLevel);
        const colorJump = parseInt(colorPalette.length / info.flLevel)
        const base = i * (floorThickness + floorGap);
        floorsSpec.push({
            type: "Feature",
            properties:{
                level: i,
                name: `${i + 1}F`,
                base,
                height: base + floorThickness,
                color: i >= info.bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi]
            },
            geometry: { type: "Polygon", coordinates: [info.flVars[flVarNum]] }
        })
    })

    let sourceId = `${bid}-floors`;
    //source로 저장
    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
            type: "geojson",
            data: ({
                type: "FeatureCollection",
                features: floorsSpec
            })
        });
    }

    //floorsSpec 각 항목마다 반복
    floorsSpec.forEach(fl => {
        const fid = `${bid}-${fl.properties.level}`;
        //층 하나씩 생성
        map.addLayer({
            id: fid,
            type: "fill-extrusion",
            source: sourceId,
            filter: ["==", ["get", "level"], fl.properties.level],
            paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": 1
            }
        });

        //클릭시 실행할 코드 지정
        setHandler(map, fid, e => handleFloorClick(map, e, bid, fid, fl.level));
    });
}

//카메라 이동 함수
export function flyCamera(map, mode, center, bearing = null) {
    if (bearing == null)
        bearing = CONFIG.camera[mode].bearing;
    map.flyTo({ center, ...CONFIG.camera[mode], bearing: bearing, ssential: true });
}
//bid로 건물 정보 검색
export async function searchBuildingByBid(bid) {
    let f = null;
    await fetch(CONFIG.campus.geojsonUrl)
        .then(response => response.json())
        .then(data => {
            const targetId = bid; // 원하는 @id 값
            const feature = data.features.find(f => f.properties["@id"] === targetId);

            if (feature) {
                f = feature;
            } else {
                console.log("해당 ID를 가진 객체가 없습니다.:", bid);
            }
        })
        .catch(err => console.error("파일 불러오기 실패:", err));
    const properties = f.properties;
    const coordinates = f.geometry.coordinates[0];
    const floors = properties?.["floors"];
    const bearing = properties?.["bearing"];
    const name = properties?.["name"];
    const flList = floors?.["flList"];
    const flLevel = floors?.["flLevel"];
    const bmLevel = floors?.["bmLevel"];
    const flVars = floors?.["flVars"];
    // const center = JSON.parse(f.properties?.["center"]);
    const center = f.properties?.["center"];
    return {
        bid: bid,
        coordinates: coordinates,
        flLevel: flLevel,
        bmLevel: bmLevel,
        center: center,
        properties: properties,
        flList: flList,
        flVars: flVars,
        bearing: bearing,
        name: name
    };
}

// 모드 전환할때 각 요소 없애거나 나타나게 하는 함수들
export async function removeFloorsFor(map, bid) {
    const st = await searchBuildingByBid(bid);

    //fid 배열 만드는 임시 코드
    const fidList = [];
    for (let i = 0; i < st.flLevel + st.bmLevel; i++) {
        fidList.push(`${bid}-${i}`);
    }
    if (!st || !Array.isArray(fidList)) return;
    fidList.forEach(id => map.getLayer(id) && map.removeLayer(id));
    st.sourceId && map.getSource(st.sourceId) && map.removeSource(st.sourceId);
}

export async function removeAllFloors(map){
    for (const bid of CONFIG.bidList) {
        await removeFloorsFor(map, bid);
    }
}
export const hideCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "none");
export const showCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "visible");

//핸들러 적용 코드
export function setHandler(map, id, callback) {
    const handler = e => {
        const features = map.queryRenderedFeatures(e.point);
        if (!features.length) {return;}

        const topFeature = features[0];// z-index 개념은 없지만, queryRenderedFeatures의 배열은 위에서부터 순서대로 정렬됨
        const cur = e.features[0]; // 이 레이어 핸들러에 전달된 피처

        // feature.id가 있다면 id까지 비교 (없으면 layer.id만 비교)
        const isTop = (topFeature.layer.id === id) && (topFeature.id == null || topFeature.id === cur.id);

        // 원하는 이벤트를 topFeature 하나에만 적용
        if (isTop) {callback(topFeature);}
    }
    map.on('click', id, (e) => handler(e));
}