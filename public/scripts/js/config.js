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
        floorThickness: 3,
        baseThickness: 1,
        roomThickness: 2,
        floorGap: 3,
        levelThick: 6,
        colorPalette: ["#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00", "#ccff00", "#88ff00", "#44ff00", "#00ff00", "#00ff44", "#00ff88", "#00ffcc", "#00ffff", "#00ccff", "#0088ff", "#0044ff", "#0000ff"],
        basementPalette: ["#4400ff", "#8800ff", "#cc00ff", "#ff00ff"],
        clickedFloorColor: "#888888"
        // basementPalette: ["#ff00ff", "#cc00ff", "#8800ff", "#4400ff"]
    },
    defaultFloorCount: 3,
    campus: {
        geojsonUrl: "http://localhost:3000/buildings",
        roomsUrl: "http://localhost:3000/rooms",
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
        clickedFloor: (bid, level) => { return `${bid}_${level}_base` },
        lid: (pid) => { return `${pid}_label` },
        level: (bmLevel, lvI) => {return lvI >= bmLevel ? (lvI - bmLevel) + 1 : (bmLevel - lvI) * -1;},
        lvI: (bmLevel, level) => {return level < 0 ? level + bmLevel : level + bmLevel - 1;}
    }
};
export const current = {
    mode: 0,
    bid: null,
    level: null
}
export const cache = {
    buildings: {},
    rooms: {}
}