import { CONFIG } from './config.js';
import { handleFloorClick } from './onClick.js';
import {buildings} from '../../sources/rooms.js';

//카메라 이동 함수
export function flyCamera(map, mode, center, bearing = null) {
    if (bearing == null)
        bearing = CONFIG.camera[mode].bearing;
    map.flyTo({ center, ...CONFIG.camera[mode], bearing: bearing, ssential: true });
}

//geojson bid로 fetch
async function fetchBuildingByBid(bid) {
    let f = null;
    await fetch(CONFIG.campus.geojsonUrl)
        .then(response => response.json())
        .then(data => {
            const targetId = bid;
            const feature = data.features.find(f => f.properties[CONFIG.campus.idProp] === targetId);

            if (feature) {
                f = feature;
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
    const f = await fetchBuildingByBid(bid);
    if (!f) return;

    return {
        bid: bid,
        properties: f.properties,
        name: f.properties?.["name"],
        coordinates: f.geometry.coordinates[0],
        center: f.properties?.["center"],
        bearing: f.properties?.["bearing"],
        floorBearing: f.properties?.["floorBearing"]
    };
}
//bid로 건물 층 정보 검색
export async function searchFloorInfoByBid(bid) {
    const f = await fetchBuildingByBid(bid);
    if (!f) return;
    const floors = f.properties?.["floors"];

    return {
        bid: bid,
        flLevel: floors?.["flLevel"],
        bmLevel: floors?.["bmLevel"],
        totLevel: floors?.["flLevel"] + floors?.["bmLevel"],
        flList: floors?.["flList"],
        flVars: floors?.["flVars"]
    };
}

//핸들러 적용 함수
export function setHandler(map, id, callback) {
    const handler = e => {
        const features = map.queryRenderedFeatures(e.point);
        if (!features.length) { return; }

        const topFeature = features[0];// z-index 개념은 없지만, queryRenderedFeatures의 배열은 위에서부터 순서대로 정렬됨
        const cur = e.features[0]; // 이 레이어 핸들러에 전달된 피처

        // feature.id가 있다면 id까지 비교 (없으면 layer.id만 비교)
        const isTop = (topFeature.layer.id === id) && (topFeature.id == null || topFeature.id === cur.id);

        // 원하는 이벤트를 topFeature 하나에만 적용
        if (isTop) { callback(topFeature); }
    }
    map.on('click', id, (e) => handler(e));
}

//레이어 보이기/숨기기
export function showLayer(map, id) {
    map.getLayer(id) && map.setLayoutProperty(id, "visibility", "visible");
}
export function hideLayer(map, id) {
    map.getLayer(id) && map.setLayoutProperty(id, "visibility", "none");
}

//전체 건물들 층 숨기기
export async function hideAllFloors(map) {
    for (const bid of CONFIG.bidList) {
        await allFloors(map, bid, (map,fid) => hideLayer(map, fid));
    }
}

//데이터 배열 받아서 층이나 방 만드는 함수
function setLayers(map, sourceId, features) {
    if (map.getSource(sourceId)) {
        console.log(`source id: ${sourceId}가 이미 존재`);
        return;
    }
    map.addSource(sourceId, {
        type: "geojson",
        data: ({
            type: "FeatureCollection",
            features: features
        })
    });
    features.forEach(f => {
        const layerId = f.properties.layerId;
        map.addLayer({
            id: layerId,
            type: "fill-extrusion",
            source: sourceId,
            filter: ["==", ["get", "layerId"], layerId],
            paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": 1
            }
        });
    });
}

//건물 내 전체 층에 대해 콜백
export async function allFloors(map, bid, cb, excFid = null) {
    const info = await searchFloorInfoByBid(bid);
    for (let i = info.bmLevel * -1; i <0; i ++){
        const fid = CONFIG.idRules.fid(bid, i);
        if(fid === excFid)
            continue;
        cb(map, fid);
    }
    for (let i = 1; i <= info.flLevel; i++) {
        const fid = CONFIG.idRules.fid(bid, i);
        if(fid === excFid)
            continue;
        cb(map, fid);
    }
}
//층 생성/보이기
export function setFloors(map, info) {
    const bid = info.bid;
    if (map.getSource(CONFIG.idRules.floorSid(bid))) {
        allFloors(map, bid, (map,fid) => showLayer(map, fid));
    }
    else {
        generateFloors(map, info);
    }
}
//층 생성하는 함수
function generateFloors(map, info) {
    const bid = info.bid;
    const { floorThickness, floorGap, colorPalette, basementPalette } = CONFIG.buildingDefaults;

    //geojson에 저장된 층수랑 층 배열 길이가 같은지 검사
    if (info.totLevel != info.flList.length) {
        console.log(`층수 오류 | 지상:${info.bmLevel} + 지하:${info.flLevel}, 배열 길이${info.flList.length}`);
        return;
    }

    //층 모양(폴리곤이랑 높이 등)이랑 각종 정보들 floorSpec에 저장
    let floorsSpec = []
    info.flList.forEach((flVarNum, i) => {
        let fi = i - info.bmLevel;
        let bi = info.bmLevel - i;
        const colorJump = parseInt(colorPalette.length / info.flLevel);
        const base = i * (floorThickness + floorGap);
        const level = CONFIG.idRules.level(info.bmLevel, i);

        floorsSpec.push({
            type: "Feature",
            properties: {
                name: `${i + 1}F`,
                base,
                height: base + floorThickness,
                color: i >= info.bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi - 1],
                level: level,
                layerId: CONFIG.idRules.fid(bid, level)
            },
            geometry: { type: "Polygon", coordinates: [info.flVars[flVarNum]] }
        })
    })

    // floorSpec 기반으로 source로 저장
    setLayers(map, CONFIG.idRules.floorSid(bid), floorsSpec);
    // 핸들러 지정
    floorsSpec.forEach(f => {
        const fid = f.properties.layerId;
        setHandler(map, fid, e => handleFloorClick(map, bid, fid, f.properties.level))
    });
}
export async function allRooms(map, bid, level, cb){
    const info = await searchFloorInfoByBid(bid);
    const levelIndex = level < 0 ? level + info.bmLevel : level + info.bmLevel - 1;
    const rooms = buildings?.[bid][levelIndex];
    rooms.forEach((room, i) => {
        const rid = CONFIG.idRules.rid(bid, level, i + 1);
        cb(map, rid);
    })
}
export function setRooms(map, bid, level, info){
    const fid = CONFIG.idRules.fid(info.bid, level)
    if (map.getSource(CONFIG.idRules.roomSid(fid))) {
        allRooms(map, bid, level, (map, rid) => showLayer(map, rid));
    }
    else {
        generateRooms(map, info, fid, level);
    }
}
function generateRooms(map, info, fid, level) {
    const bid = info.bid;
    const { floorThickness, floorGap, colorPalette, basementPalette } = CONFIG.buildingDefaults;
    const levelIndex = level < 0 ? level + info.bmLevel : level + info.bmLevel - 1;
    const base = (levelIndex * (floorThickness + floorGap)) + floorThickness;
    let rooms = buildings?.[bid][levelIndex];
    let roomsSpec = []
    rooms.forEach((room, i) => {
        roomsSpec.push({
            type: "Feature",
            properties: {
                name: room.name,
                base,
                height: base + floorThickness,
                color: colorPalette[i],
                layerId: CONFIG.idRules.rid(bid, level, i + 1)
            },
            geometry: { type: "Polygon", coordinates: [room.polygon] }
        })
    })
    
    setLayers(map, CONFIG.idRules.roomSid(fid), roomsSpec);
    // 핸들러 지정
    roomsSpec.forEach(f => {
        const fid = f.properties.layerId;
    });
}
