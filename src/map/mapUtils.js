import { MC, SC } from './map.config.js';
import { handleFloorClick } from './events.js';
import {searchFloorInfoByBid, requestRoomsByBid } from './request.js';

//카메라 이동 함수
export function flyCamera(map, mode, center, bearing = null) {
    if (bearing == null)
        bearing = MC.camera[mode].bearing;
    map.flyTo({ center, ...MC.camera[mode], bearing: bearing, ssential: true });
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
            id: MC.idRules.lid(layerId),
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
    map.getLayer(MC.idRules.lid(id)) && map.setLayoutProperty(MC.idRules.lid(id), "visibility", "visible");
}
export function hideLayer(map, id) {
    map.getLayer(id) && map.setLayoutProperty(id, "visibility", "none");
    map.getLayer(MC.idRules.lid(id)) && map.setLayoutProperty(MC.idRules.lid(id), "visibility", "none");
}
//특정 건물의 층들 숨기기
export async function hideFloorsByBid(map, bid) {
    const fInfo = await searchFloorInfoByBid(bid);
    allFloors(map, fInfo, bid, (map, fid, level) => {
        const lvI = MC.idRules.lvI(fInfo.bmLevel, level);
        hideLayer(map, fid)
        hideAllRooms(map, bid, level, lvI);
    });
}
//전체 건물들 층 숨기기
async function hideAllFloors(map) {
    for (const bid of SC.bidList) {
        await hideFloorsByBid(map, bid);
    }
}
//층 내 전체 방 숨기기
export async function hideAllRooms(map, bid, level, lvI) {
    hideLayer(map, MC.idRules.clickedFloor(bid, level));
    await allRooms(map, bid, level, lvI, (map, rid) => hideLayer(map, rid));
}


//건물 내 전체 층에 대해 콜백
function allFloors(map, fInfo, bid, cb) {
    for (let i = fInfo.bmLevel * -1; i < 0; i++) {
        const fid = MC.idRules.fid(bid, i);
        cb(map, fid, i);
    }
    for (let i = 1; i <= fInfo.flLevel; i++) {
        const fid = MC.idRules.fid(bid, i);
        cb(map, fid, i);
    }
}
//층 내 전체 방에 대해 콜백
async function allRooms(map, bid, level, lvI, cb) {
    const rooms = await requestRoomsByBid(bid, lvI);
    rooms.forEach((r, i) => {
        const rid = MC.idRules.rid(bid, level, i + 1);
        cb(map, rid);
    });
}

//층 생성/보이기
export function setFloors(map, fInfo) {
    const bid = fInfo.bid;
    if (map.getSource(MC.idRules.floorSid(bid))) {
        allFloors(map, fInfo, bid, (map, fid) => showLayer(map, fid));
    }
    else {
        generateFloors(map, fInfo);
    }
}
//방 생성/보이기
export function setRooms(map, bid, level, lvI, fInfo) {
    const fid = MC.idRules.fid(fInfo.bid, level)
    if (map.getSource(MC.idRules.roomSid(fid))) {
        allRooms(map, bid, level, lvI, (map, rid) => showLayer(map, rid));
        showLayer(map, MC.idRules.clickedFloor(bid, level));
    }
    else {
        generateRooms(map, fInfo, fid, level);
    }
}
//층 생성하는 함수
function generateFloors(map, fInfo) {
    const bid = fInfo.bid;
    const { floorThickness, floorGap } = MC.layerProps;

    //층 모양(폴리곤이랑 높이 등)이랑 각종 정보들 floorSpec에 저장
    let floorsSpec = []
    fInfo.flList.forEach((flVarNum, i) => {
        let fi = i - fInfo.bmLevel;
        let bi = fInfo.bmLevel - i;
        const base = i * (floorThickness + floorGap);
        const level = MC.idRules.level(fInfo.bmLevel, i);

        floorsSpec.push({
            type: "Feature",
            properties: {
                name: i >= fInfo.bmLevel ? `${fi + 1}F` : `B${bi}`,
                base,
                height: base + floorThickness,
                // color: i >= fInfo.bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi - 1],
                color: MC.layerProps.taseTheRainbow(i, fi, bi, fInfo.bmLevel, fInfo.flLevel),
                level: level,
                anchor: "left",
                // offset: info.offset,
                layerId: MC.idRules.fid(bid, level)
            },
            geometry: { type: "Polygon", coordinates: fInfo.flVars[flVarNum] }
        })
    })

    // floorSpec 기반으로 source로 저장
    setLayers(map, MC.idRules.floorSid(bid), floorsSpec);
    // 핸들러 지정
    floorsSpec.forEach((f, i) => {
        const fid = f.properties.layerId;
        setHandler(map, "click", fid, e => handleFloorClick(map, bid, fid, f.properties.level, i))
    });
}
//방 생성하는 함수
async function generateRooms(map, fInfo, fid, level) {
    const bid = fInfo.bid;
    const { floorThickness, floorGap, colorPalette, baseThickness, roomThickness } = MC.layerProps;
    const lvI = MC.idRules.lvI(fInfo.bmLevel, level);
    const base = (lvI * (floorThickness + floorGap));
    const rooms = await requestRoomsByBid(bid, lvI);
    let roomsSpec = []

    roomsSpec.push({
        type: "Feature",
        properties: {
            base: base,
            height: base + baseThickness,
            color: MC.layerProps.clickedFloorColor,
            // offset: 0,
            layerId: MC.idRules.clickedFloor(bid, level)
        },
        geometry: { type: "Polygon", coordinates: fInfo.flVars[fInfo.flList[lvI]] }
    })
    rooms.forEach((room, i) => {
        roomsSpec.push({
            type: "Feature",
            properties: {
                name: room.name,
                base: base + baseThickness,
                height: base + baseThickness + roomThickness,
                color: room.color ? room.color : "#0088ff",// 임시 컬러
                anchor: "bottom",
                // offset: 0,
                layerId: MC.idRules.rid(bid, level, i + 1)
            },
            geometry: { type: "Polygon", coordinates: room.polygon }
        })
    })

    setLayers(map, MC.idRules.roomSid(fid), roomsSpec);
    // 핸들러 지정
    roomsSpec.forEach((r, i) => {
        if (i === 0) return; // 클릭된 층 베이스는 핸들러 지정 안함
        const rid = r.properties.layerId;
    });
}
