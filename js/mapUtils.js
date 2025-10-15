import { CONFIG } from './config.js';
import { handleFloorClick } from './onClick.js';

export const currentState = {};
currentState.mode = null;
currentState.pos = null;
currentState.mode = null;
currentState.buildProp = null;
currentState.activeBid = null;
currentState.activeFid = null;
currentState.activeLevel = null;

//층 생성 총괄
export function generateFloors(map, bid) {
    //빌딩 정보 가져오기
    const st = currentState[bid];
    if (!st) return;

    //모르는 코드
    if (!map.getSource(st.sourceId)) {
        map.addSource(st.sourceId, {
            type: "geojson",
            data: buildFloorsGeoJSON(st.coords, st.floorsSpec)
        });
    }

    //floorsSpec 각 항목마다 반복
    st.floorsSpec.forEach(fl => {
        const fid = `${bid}-${fl.level}`;
        //fid 배열에 넣기
        st.floorLayerIds.push(fid);
        //층 하나씩 생성
        map.addLayer({
            id: fid,
            type: "fill-extrusion",
            source: st.sourceId,
            filter: ["==", ["get", "level"], fl.level],
            paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": 1
            }
        });
        
        //클릭시 실행할 코드 지정
        map.on("click", fid, e => {
            handleFloorClick(map, e, bid, fid, fl.level);
        });

    });
    currentState.activeBid = bid;
    currentState.activeLevel = null;
}

// 층 배열(높이, 색상 등 정보 포함) 자동생성
export function autoFloorsArray(fcount, bcount, defs) {
    const { floorThickness, floorGap, colorPalette, basementPalette } = defs;
    
    let basement = Array.from({ length: bcount }, (_, i) => {
        let bi = bcount - i - 1;
        const base = i * (floorThickness + floorGap);
        return {
            level: i,
            name: `B${bi + 1}F`,
            base,
            height: base + floorThickness,
            color: basementPalette[bi % basementPalette.length]
        };
    });
    let floors = Array.from({ length: fcount }, (_, i) => {
        let fi = i + bcount;
        const base = fi * (floorThickness + floorGap);
        return {
            level: fi,
            name: `${i + 1}F`,
            base,
            height: base + floorThickness,
            color: colorPalette[i % colorPalette.length]
        };
    });
    return basement.concat(floors);
}

//아마 폴리곤 바탕으로 층 모양 만드는 코드
export const buildFloorsGeoJSON = (coords, floors) => ({
    type: "FeatureCollection",
    features: floors.map(f => ({
        type: "Feature",
        properties: { ...f },
        geometry: { type: "Polygon", coordinates: [coords] }
    }))
});

//층별 투명도 조절
export function setFloorOpacities(map, bid, selected) {
    const st = currentState[bid];
    if (!st) return;
    st.floorsSpec.forEach(fl => {
        const fid = `${bid}-${fl.level}`;
        const op = selected == null ? 1 : (fl.level === selected ? 1 : 0);
        map.getLayer(fid) &&
            map.setPaintProperty(fid, "fill-extrusion-opacity", op);
        currentState.activeBid = bid;
    });
}

//카메라 이동 함수
export function flyCamera(map, mode, center, bearing = null){
    if(bearing == null)
        bearing = CONFIG.camera[mode].bearing;
    map.flyTo({ center, ...CONFIG.camera[mode], bearing: bearing, ssential: true });
}

// 모드 전환할때 각 요소 없애거나 나타나게 하는 함수들
export function removeFloorsFor(map, bid) {
    const st = currentState[bid];
    if (!st || !Array.isArray(st.floorLayerIds)) return;
    st.floorLayerIds.forEach(id => map.getLayer(id) && map.removeLayer(id));
    st.sourceId && map.getSource(st.sourceId) && map.removeSource(st.sourceId);
    delete currentState[bid];
}
export const hideCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "none");
export const showCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "visible");

export async function searchBuildingByBid(bid)
{
    const res = await fetch(CONFIG.campus.roomsUrl);
    const data = await res.json();
    const room = data?.main?.floor_1?.m101;

    let f = null;
    await fetch(CONFIG.campus.geojsonUrl)
        .then(response => response.json())
        .then(data => {
            const targetId = bid; // 원하는 @id 값
            const feature = data.features.find(f => f.properties["@id"] === targetId);

            if (feature) {
                f = feature;
                console.log("Center:", feature.properties.center);
            } else {
                console.log("해당 ID를 가진 객체가 없습니다.");
            }
        })
        .catch(err => console.error("파일 불러오기 실패:", err));

    let ring = f.geometry.coordinates[0];
    if (!ring) return;

    // 층 배열 생성 (지하층/지상층 정보 활용)
    const lvProp = f.properties?.["building:levels"];
    const bmProp = f.properties?.["building:basement"];
    // const center = JSON.parse(f.properties?.["center"]);
    const center = f.properties?.["center"];
    const properties = f.properties;


    return {
        bid: bid,
        ring: ring,
        levels: lvProp,
        basement: bmProp,
        center: center,
        properties: properties
    };
}