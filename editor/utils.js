export const CONFIG = {
    map: {
        center: [126.95336, 37.34524],
        zoom: 16,
        style: "mapbox://styles/mapbox/streets-v12"
    },
    camera: {
        building: "around",
        floor: "above",
        around: { zoom: 18, pitch: 60, bearing: -45, speed: 0.8, curve: 1.25 },
        above: { zoom: 19, pitch: 0, speed: 0.4 }
    },
    buildingDefaults: {
        floorThickness: 2,
        floorGap: 4,
        levelThick: 6,
        colorPalette: ["#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00", "#ccff00", "#88ff00", "#44ff00", "#00ff00", "#00ff44", "#00ff88", "#00ffcc", "#00ffff", "#00ccff", "#0088ff", "#0044ff", "#0000ff"],
        basementPalette: ["#4400ff", "#8800ff", "#cc00ff", "#ff00ff"]
        // basementPalette: ["#ff00ff", "#cc00ff", "#8800ff", "#4400ff"]
    },
    defaultFloorCount: 3,
    campus: {
        geojsonUrl: "http://localhost:3000/buildings",
        roomsUrl: "http://localhost:3000/rooms",
        floorplanUrl: "floorplans/",
        idProp: "@id",
        nameProp: "name",
    },
    bidList: [
        "main",
        "grad",
        "design",
        "gemi",
        "music",
        "rodem",
        "visionCentre",
        "stem",
        "council",
        "theology",
        "vision"
    ],
    bgIdList: [
        "land",
        "poi",
        "road",
        "building"
    ],
    idRules: {
        buildings: "campus-3d",
        fid: (bid, level) => { return `${bid}_${level}` },
        floorSid: (bid) => { return `${bid}_floors` },
        rid: (bid, level, index) => { return `${bid}_${level}0${index}` },
        roomSid: (fid) => {return `${fid}_rooms`},
        lid: (pid) => { return `${pid}_label` },
        level: (bmLevel, levelIndex) => {return levelIndex >= bmLevel ? (levelIndex - bmLevel) + 1 : (bmLevel - levelIndex) * -1;}
    }
};
export const current = {
    mode: 0,
    bid: null,
    level: null
}

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
        // offset: f.properties.offset
    };
}
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
                name: i >= info.bmLevel ? `${fi + 1}F` : `B${bi}`,
                base,
                height: base + floorThickness,
                color: i >= info.bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi - 1],
                level: level,
                anchor: "left",
                // offset: info.offset,
                layerId: CONFIG.idRules.fid(bid, level)
            },
            geometry: { type: "Polygon", coordinates: [info.flVars[flVarNum]] }
        })
    })

    // floorSpec 기반으로 source로 저장
    // setLayers(map, CONFIG.idRules.floorSid(bid), floorsSpec);
}