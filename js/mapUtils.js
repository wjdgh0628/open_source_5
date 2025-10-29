import { CONFIG } from './config.js';
import { handleFloorClick } from './onClick.js';

//층 생성 총괄
export function generateFloors(map, info, floorsSpec) {

    let sourceId = "${bid}-floors";

    //모르는 코드
    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
            type: "geojson",
            data: buildFloorsGeoJSON(info.ring, floorsSpec)
        });
    }

    //floorsSpec 각 항목마다 반복
    floorsSpec.forEach(fl => {
        const fid = `${info.bid}-${fl.level}`;
        //층 하나씩 생성
        map.addLayer({
            id: fid,
            type: "fill-extrusion",
            source: sourceId,
            filter: ["==", ["get", "level"], fl.level],
            paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": 1
            }
        });
        
        //클릭시 실행할 코드 지정
        setHandler(map, fid, e=>handleFloorClick(map, e, info.bid, fid, fl.level));

    });
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

//카메라 이동 함수
export function flyCamera(map, mode, center, bearing = null){
    if(bearing == null)
        bearing = CONFIG.camera[mode].bearing;
    map.flyTo({ center, ...CONFIG.camera[mode], bearing: bearing, ssential: true });
}

export async function searchBuildingByBid(bid)
{
    /* const res = await fetch(CONFIG.campus.roomsUrl);
    const data = await res.json();
    const room = data?.main?.floor_1?.m101; */

    let f = null;
    await fetch(CONFIG.campus.geojsonUrl)
        .then(response => response.json())
        .then(data => {
            const targetId = bid; // 원하는 @id 값
            const feature = data.features.find(f => f.properties["@id"] === targetId);

            if (feature) {
                f = feature;
                // console.log("Center:", feature.properties.center);
            } else {
                console.log("해당 ID를 가진 객체가 없습니다.:", bid);
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

// 모드 전환할때 각 요소 없애거나 나타나게 하는 함수들
export function removeFloorsFor(map, bid) {
    const st = searchBuildingByBid(bid);
    if (!st || !Array.isArray(st.floorLayerIds)) return;
    st.floorLayerIds.forEach(id => map.getLayer(id) && map.removeLayer(id));
    st.sourceId && map.getSource(st.sourceId) && map.removeSource(st.sourceId);
}
export const removeAllFloors = map =>
    CONFIG.bidList.forEach(bid => removeFloorsFor(map, bid));
export const hideCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "none");
export const showCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "visible");

//핸들러 적용 코드
export function setHandler(map, id = null, callback)
{
    const func = e =>{
        
        const features = map.queryRenderedFeatures(e.point);
        if (!features.length) return;
    
        // z-index 개념은 없지만, queryRenderedFeatures의 배열은 위에서부터 순서대로 정렬됨
        const topFeature = features[0];

        const cur = e.features[0]; // 이 레이어 핸들러에 전달된 피처
        // feature.id가 있다면 id까지 비교 (없으면 layer.id만 비교)
        const isTop = topFeature.layer.id === id && (topFeature.id == null || topFeature.id === cur.id);
        
        // 원하는 이벤트를 topFeature 하나에만 적용
        if(isTop)
            callback(topFeature);
    }

    if(id === null){//layerID 없을 시(사실상 사용하지 않으며 중복검사 안됨)
        map.on('click', (e) => func(e));
    }
    else{
        map.on('click', id, (e) => func(e));
    }
}