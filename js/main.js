import { CONFIG } from './config.js';
import {
    buildingState,
    autoFloorsArray, ensureClosedPolygon,
    flyCamera, hideCampusBase, showCampusBase,
    disableCampusHit, enableCampusHit
} from './mapUtils.js';
import { showFloorsFor, removeFloorsFor, setFloorOpacities } from './floors.js';

export let current = {
    mode: null,
    pos: null,
    bid: null,
    buildProp: null
};

export function initMap() {
    const map = new mapboxgl.Map({
        container: "map",
        style: CONFIG.map.style,
        center: CONFIG.map.center,
        zoom: CONFIG.map.zoom
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
        map.addLayer({
            id: "sky", type: "sky", paint: {
                "sky-type": "atmosphere",
                "sky-atmosphere-sun": [0, 0],
                "sky-atmosphere-sun-intensity": 15
            }
        });

        map.addSource("campus", { type: "geojson", data: CONFIG.campus.geojsonUrl });
        map.addLayer({
            id: "campus-3d",
            type: "fill-extrusion",
            source: "campus",
            paint: {
                "fill-extrusion-color": ["coalesce", ["get", "color"], "#aaaaaa"],
                "fill-extrusion-base": ["coalesce", ["to-number", ["get", "min_height"]], 0],
                "fill-extrusion-height": [
                    "case",
                    ["has", "height"], ["to-number", ["get", "height"]],
                    ["has", "building:levels"], ["*", ["to-number", ["get", "building:levels"]],
                        CONFIG.buildingDefaults.floorThickness + CONFIG.buildingDefaults.floorGap],
                    10
                ],
                "fill-extrusion-opacity": 0.9
            }
        });

        map.addLayer({
            id: "campus-hit",
            type: "fill",
            source: "campus",
            paint: { "fill-color": "#000000", "fill-opacity": 0 }
        });

        ["campus-hit", "campus-3d"].forEach(l =>
            map.on("click", l, e => handleBuildingClick(map, e)));

        map.on("click", e => handleBackgroundClick(map, e));
    });

    document.getElementById("reset").addEventListener("click", () => {
        Object.keys(buildingState).forEach(bid => removeFloorsFor(map, bid));
        showCampusBase(map);
        enableCampusHit(map);
        buildingState.activeBuildingId = null;
        buildingState.activeLevel = null;
        flyCamera(map, "around", CONFIG.map.center);
    });

    current.mode = 0;
}

function handleBuildingClick(map, e) {
    e.originalEvent && (e.originalEvent.cancelBubble = true);
    const f = e.features?.[0];
    if (!f) return;

    let ring = (f.geometry.type === "Polygon")
        ? f.geometry.coordinates[0]
        : f.geometry.coordinates[0][0];
    if (!ring) return;
    ring = ensureClosedPolygon(ring);
    const bid = f.properties?.[CONFIG.campus.idProp];
    Object.keys(buildingState).forEach(b => removeFloorsFor(map, b));

    const lvProp = f.properties?.["building:levels"];
    const bmProp = f.properties?.["building:basement"];
    /* const levels = Number.isFinite(+lvProp)
        ? Math.max(1, Math.min(20, +lvProp))
        : CONFIG.defaultFloorCount; */
    const floorsSpec = autoFloorsArray(lvProp, bmProp, CONFIG.buildingDefaults);

    buildingState[bid] = { coords: ring, floorsSpec, floorLayerIds: [], sourceId: `${bid}-floors` };

    hideCampusBase(map);
    disableCampusHit(map);
    showFloorsFor(map, bid);
    flyCamera(map, CONFIG.camera.clickMode, JSON.parse(f.properties?.["center"]));
    console.log(bid);

    current.buildProp = f.properties;
    current.pos = JSON.parse(f.properties?.["center"]);
    current.mode = 1;
}

function handleBackgroundClick(map, e) {
    const floorLayers = Object.entries(buildingState)
        .filter(([k, v]) => v && v.floorLayerIds)
        .flatMap(([, st]) => st.floorLayerIds);
    const hit = map.queryRenderedFeatures(e.point, { layers: floorLayers });
    if (hit.length === 0) {
        const baseHit = [
            ...map.queryRenderedFeatures(e.point, { layers: ["campus-3d"] }),
            ...map.queryRenderedFeatures(e.point, { layers: ["campus-hit"] })
        ];
        if (baseHit.length > 0) return;
        if (current.mode == 2) {
            flyCamera(map, CONFIG.camera.clickMode, current.pos);
            setFloorOpacities(map, current.bid, null)
            current.mode = 1;
        }
        else {
            Object.keys(buildingState).forEach(bid => removeFloorsFor(map, bid));
            showCampusBase(map);
            enableCampusHit(map);
            current.mode = 0;
        }
    }
}