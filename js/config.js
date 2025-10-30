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
        floorThickness: 1,
        floorGap: 7,
        colorPalette: ["#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00", "#ccff00", "#88ff00", "#44ff00", "#00ff00", "#00ff44", "#00ff88", "#00ffcc", "#00ffff", "#00ccff", "#0088ff", "#0044ff", "#0000ff"],
        // basementPalette: ["#4400ff", "#8800ff", "#cc00ff", "#ff00ff"]
        basementPalette: ["#ff00ff", "#cc00ff","#8800ff", "#4400ff"]
    },
    defaultFloorCount: 3,
    campus: {
        geojsonUrl: "./json/buildings.geojson",
        floorsUrl: "./json/floors.json",
        roomsUrl: "./json/rooms.json",
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
    ]
};