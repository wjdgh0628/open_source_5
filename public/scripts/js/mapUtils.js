import { CONFIG, cache } from './config.js';
import { handleFloorClick } from './onClick.js';

//카메라 이동 함수
export function flyCamera(map, mode, center, bearing = null) {
    if (bearing == null)
        bearing = CONFIG.camera[mode].bearing;
    map.flyTo({ center, ...CONFIG.camera[mode], bearing: bearing, ssential: true });
}

//geojson bid로 건물 데이터 요청
async function requestBuildingByBid(bid) {
    let f = null;
    if (cache.buildings[bid]) {
        f = cache.buildings[bid];
        console.log(`캐시에서 불러옴: ${bid}`);
    }
    else {
        await fetch(CONFIG.campus.geojsonUrl)
            .then(response => response.json())
            .then(data => {
                const targetId = bid;
                const feature = data.features.find(f => f.properties[CONFIG.campus.idProp] === targetId);

                if (feature) {
                    f = feature;
                    cache.buildings[bid] = f;
                    console.log(`파일에서 불러옴: ${bid}`);
                } else {
                    console.log("해당 ID를 가진 객체가 없습니다.:", bid);
                    f = false;
                }
            })
            .catch(err => { console.error("파일 불러오기 실패:", err); f = false; });
    }
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
async function requestRoomsByBid(bid, lvI) {
    let f = null;
    if (cache.rooms[bid]?.[lvI]) {
        f = cache.rooms[bid][lvI];
        console.log(`캐시에서 불러옴: ${bid} lvI: ${lvI}`);
    } else {
        await fetch(CONFIG.campus.roomsUrl)
            .then(response => response.json())
            .then(data => {
                const rooms = data?.[bid]?.[lvI];

                if (rooms) {
                    f = rooms;
                    if (!cache.rooms[bid]) cache.rooms[bid] = {};
                    cache.rooms[bid][lvI] = f;
                    console.log(`파일에서 불러옴: ${bid} lvI: ${lvI}`);
                } else {
                    console.log("bid 혹은 층수 오류", bid, lvI);
                    f = false;
                }
            })
            .catch(err => { console.error("파일 불러오기 실패:", err); f = null; });
    }
    return f;
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
    features.forEach((f, i) => {
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
        if (!f.properties.name) return; //이름이 없으면 라벨 생성 안함
        map.addLayer({
            id: CONFIG.idRules.lid(layerId),
            type: 'symbol',
            source: sourceId,
            filter: ["==", ["get", "layerId"], layerId],
            layout: {
                'text-field': ["get", "name"],
                'text-size': 14,
                'text-anchor': ["get", "anchor"],
                'text-allow-overlap': true,
                'symbol-placement': 'point',
                'symbol-z-order': "source",
                // 'symbol-spacing': 1,
                // 'text-radial-offset': ["get", "offset"],
                // 'symbol-avoid-edges': true
                // 'symbol-z-elevate': true
            },
            paint: {
                'symbol-z-offset': f.properties.base,
                'text-color': '#000000',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
                // "text-translate": [0, 0],
                // "text-translate-anchor": "viewport"
            }
        });
        // console.log(CONFIG.idRules.lid(layerId));
    });
}
//핸들러 적용 함수
export function setHandler(map, type , id, callback) {
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
    map.on(type, id, (e) => handler(e));
}

//레이어 보이기/숨기기
export function showLayer(map, id) {
    map.getLayer(id) && map.setLayoutProperty(id, "visibility", "visible");
    map.getLayer(CONFIG.idRules.lid(id)) && map.setLayoutProperty(CONFIG.idRules.lid(id), "visibility", "visible");
}
export function hideLayer(map, id) {
    map.getLayer(id) && map.setLayoutProperty(id, "visibility", "none");
    map.getLayer(CONFIG.idRules.lid(id)) && map.setLayoutProperty(CONFIG.idRules.lid(id), "visibility", "none");
}
//특정 건물의 층들 숨기기
export async function hideFloorsByBid(map, bid) {
    const fInfo = await searchFloorInfoByBid(bid);
    allFloors(map, fInfo, bid, (map, fid, level) => {
        const lvI = CONFIG.idRules.lvI(fInfo.bmLevel, level);
        hideLayer(map, fid)
        hideAllRooms(map, bid, level, lvI);
    });
}
//전체 건물들 층 숨기기
async function hideAllFloors(map) {
    for (const bid of CONFIG.bidList) {
        await hideFloorsByBid(map, bid);
    }
}
//층 내 전체 방 숨기기
export async function hideAllRooms(map, bid, level, lvI) {
    hideLayer(map, CONFIG.idRules.clickedFloor(bid, level));
    await allRooms(map, bid, level, lvI, (map, rid) => hideLayer(map, rid));
}


//건물 내 전체 층에 대해 콜백
function allFloors(map, fInfo, bid, cb) {
    for (let i = fInfo.bmLevel * -1; i < 0; i++) {
        const fid = CONFIG.idRules.fid(bid, i);
        cb(map, fid, i);
    }
    for (let i = 1; i <= fInfo.flLevel; i++) {
        const fid = CONFIG.idRules.fid(bid, i);
        cb(map, fid, i);
    }
}
//층 내 전체 방에 대해 콜백
async function allRooms(map, bid, level, lvI, cb) {
    const rooms = await requestRoomsByBid(bid, lvI);
    rooms.forEach((r, i) => {
        const rid = CONFIG.idRules.rid(bid, level, i + 1);
        cb(map, rid);
    });
}

//층 생성/보이기
export function setFloors(map, fInfo) {
    const bid = fInfo.bid;
    if (map.getSource(CONFIG.idRules.floorSid(bid))) {
        allFloors(map, fInfo, bid, (map, fid) => showLayer(map, fid));
    }
    else {
        generateFloors(map, fInfo);
    }
}
//방 생성/보이기
export function setRooms(map, bid, level, lvI, fInfo) {
    const fid = CONFIG.idRules.fid(fInfo.bid, level)
    if (map.getSource(CONFIG.idRules.roomSid(fid))) {
        allRooms(map, bid, level, lvI, (map, rid) => showLayer(map, rid));
        showLayer(map, CONFIG.idRules.clickedFloor(bid, level));
    }
    else {
        generateRooms(map, fInfo, fid, level);
    }
}
//층 생성하는 함수
function generateFloors(map, fInfo) {
    const bid = fInfo.bid;
    const { floorThickness, floorGap, colorPalette, basementPalette } = CONFIG.buildingDefaults;

    //층 모양(폴리곤이랑 높이 등)이랑 각종 정보들 floorSpec에 저장
    let floorsSpec = []
    fInfo.flList.forEach((flVarNum, i) => {
        let fi = i - fInfo.bmLevel;
        let bi = fInfo.bmLevel - i;
        const colorJump = parseInt(colorPalette.length / fInfo.flLevel);
        const base = i * (floorThickness + floorGap);
        const level = CONFIG.idRules.level(fInfo.bmLevel, i);

        floorsSpec.push({
            type: "Feature",
            properties: {
                name: i >= fInfo.bmLevel ? `${fi + 1}F` : `B${bi}`,
                base,
                height: base + floorThickness,
                color: i >= fInfo.bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi - 1],
                level: level,
                anchor: "left",
                // offset: info.offset,
                layerId: CONFIG.idRules.fid(bid, level)
            },
            geometry: { type: "Polygon", coordinates: [fInfo.flVars[flVarNum]] }
        })
    })

    // floorSpec 기반으로 source로 저장
    setLayers(map, CONFIG.idRules.floorSid(bid), floorsSpec);
    // 핸들러 지정
    floorsSpec.forEach((f, i) => {
        const fid = f.properties.layerId;
        setHandler(map, "click", fid, e => handleFloorClick(map, bid, fid, f.properties.level, i))
    });
}
//방 생성하는 함수
async function generateRooms(map, fInfo, fid, level) {
    const bid = fInfo.bid;
    const { floorThickness, floorGap, colorPalette, baseThickness, roomThickness } = CONFIG.buildingDefaults;
    const lvI = CONFIG.idRules.lvI(fInfo.bmLevel, level);
    const base = (lvI * (floorThickness + floorGap));
    const rooms = await requestRoomsByBid(bid, lvI);
    let roomsSpec = []

    roomsSpec.push({
        type: "Feature",
        properties: {
            base: base,
            height: base + baseThickness,
            color: CONFIG.buildingDefaults.clickedFloorColor,
            // offset: 0,
            layerId: CONFIG.idRules.clickedFloor(bid, level)
        },
        geometry: { type: "Polygon", coordinates: [fInfo.flVars[fInfo.flList[lvI]]] }
    })
    rooms.forEach((room, i) => {
        roomsSpec.push({
            type: "Feature",
            properties: {
                name: room.name,
                base: base + baseThickness,
                height: base + baseThickness + roomThickness,
                color: room.color ? room.color : colorPalette[i],
                anchor: "bottom",
                // offset: 0,
                layerId: CONFIG.idRules.rid(bid, level, i + 1)
            },
            geometry: { type: "Polygon", coordinates: [room.polygon] }
        })
    })

    setLayers(map, CONFIG.idRules.roomSid(fid), roomsSpec);
    // 핸들러 지정
    roomsSpec.forEach((r, i) => {
        if (i === 0) return; // 클릭된 층 베이스는 핸들러 지정 안함
        const rid = r.properties.layerId;
    });
}
