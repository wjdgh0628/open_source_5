import { CONFIG } from './config.js';
import { handleFloorClick } from './onClick.js';

//층 생성하는 함수
export function generateFloors(map, info) {
    const bid = info.bid;
    const { floorThickness, floorGap, colorPalette, basementPalette } = CONFIG.buildingDefaults;

    //geojson에 저장된 층수랑 층 배열 길이가 같은지 검사
    if (info.bmLevel + info.flLevel != info.flList.length) {
        console.log(`층수 오류 | 지상:${info.bmLevel} + 지하:${info.flLevel}, 배열 길이${info.flList.length}`);
        return;
    }

    //
    let floorsSpec = []
    info.flList.forEach((flVarNum, i) => {
        let fi = i - info.bmLevel;
        let bi = i + (4 - info.bmLevel);
        const colorJump = parseInt(colorPalette.length / info.flLevel)
        const base = i * (floorThickness + floorGap);
        floorsSpec.push({
            type: "Feature",
            properties: {
                level: i,
                name: `${i + 1}F`,
                base,
                height: base + floorThickness,
                color: i >= info.bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi]
            },
            geometry: { type: "Polygon", coordinates: [info.flVars[flVarNum]] }
        })
    })

    //층 모양(폴리곤이랑 높이 등) source로 저장
    let sourceId = `${bid}-floors`;
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
    floorsSpec.forEach(flspec => {
        const properties = flspec.properties;
        const fid = `${bid}-${properties.level}`;
        //층 하나씩 생성
        map.addLayer({
            id: fid,
            type: "fill-extrusion",
            source: sourceId,
            filter: ["==", ["get", "level"], properties.level],
            paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": 1
            }
        });

        //클릭시 실행할 코드 지정
        setHandler(map, fid, e => handleFloorClick(bid, fid, properties.level));
    });
}

// 건물별 층 제거 함수
export async function removeFloorsFor(map, bid) {
    const info = await searchFloorInfoByBid(bid);

    //fid 배열 만드는 임시 코드
    const fidList = [];
    for (let i = 0; i < info.flLevel + info.bmLevel; i++) {
        fidList.push(`${bid}-${i}`);
    }
    if (!info || !Array.isArray(fidList)) return;
    fidList.forEach(id => map.getLayer(id) && map.removeLayer(id));
    info.sourceId && map.getSource(info.sourceId) && map.removeSource(info.sourceId);
}
//전체 건물들 층 제거
export async function removeAllFloors(map) {
    for (const bid of CONFIG.bidList) {
        await removeFloorsFor(map, bid);
    }
}

//건물 모델 보이기/숨기기
export const hideCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "none");
export const showCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "visible");

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
            const targetId = bid; // 원하는 @id 값
            const feature = data.features.find(f => f.properties["@id"] === targetId);

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
        bearing: f.properties?.["bearing"]
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

//평면도 모달 팝업 함수
export function showFloorplanModal(imagePath, bid, level, modal) {
    //엘리먼트 가져오기
    const modalImage = document.getElementById('modal-floorplan-image');
    const modalTitle = document.getElementById('modal-title');

    if (!modal || !modalImage || !modalTitle) {
        console.error("Floorplan modal or its elements not found in the DOM.");
        alert(`평면도 이미지: ${imagePath}\n(건물: ${bid}, 층: ${level})`);
        return;
    }

    //모달 내용 업데이트
    modalTitle.textContent = `${bid} 건물 ${level}층 평면도`;
    modalImage.src = imagePath;
    modalImage.alt = `${bid} ${level}층`;

    modal.classList.add('is-visible');
}
//평면도 모달 닫는 함수
export function hideFloorplanModal(modal) {
    if (modal) {
        modal.classList.remove('is-visible');
    }
}
