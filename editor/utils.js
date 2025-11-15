export const CONFIG = {
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