export const CONFIG = {
    map: {
        center: [126.95336, 37.34524],
        zoom: 16,
        style: "mapbox://styles/mapbox/streets-v12"
    },
    camera: {
        clickMode: "around", // "around" | "above"
        floorClick: "above", // "around" | "above"
        around: { zoom: 18, pitch: 60, bearing: -45, speed: 0.8, curve: 1.25 },
        above: { zoom: 19, pitch: 0, speed: 0.4 }
    },
    ui: {
        floorSelectedOpacity: 1,
        floorOthersOpacity: 0.0
    },
    buildingDefaults: {
        floorThickness: 1,
        floorGap: 5,
        colorPalette: ["#ff0000", "#00ff00", "#0000ff", "#ff00ff", "#00ffff", "#ffaa00"]
    },
    defaultFloorCount: 3,
    campus: {
        geojsonUrl: "./campus.geojson",
        idProp: "@id",
        nameProp: "name"
    }
};