import { CONFIG } from './config.js';
import {
    buildingState,
    buildFloorsGeoJSON
} from './mapUtils.js';
import { current } from './main.js';

export function showFloorsFor(map, bid) {
    const st = buildingState[bid];
    if (!st) return;

    if (!map.getSource(st.sourceId)) {
        map.addSource(st.sourceId, {
            type: "geojson",
            data: buildFloorsGeoJSON(st.coords, st.floorsSpec)
        });
    }

    st.floorsSpec.forEach(fl => {
        const layerId = `${bid}-floor-${fl.level}`;
        st.floorLayerIds.push(layerId);
        map.addLayer({
            id: layerId,
            type: "fill-extrusion",
            source: st.sourceId,
            filter: ["==", ["get", "level"], fl.level],
            paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": CONFIG.ui.floorSelectedOpacity
            }
        });

        map.on("click", layerId, e => {
            e.originalEvent && (e.originalEvent.cancelBubble = true);
            // update the mutable building state object instead of imported bindings
            buildingState.activeBuildingId = bid;
            buildingState.activeLevel = fl.level;
            setFloorOpacities(map, bid, fl.level);
            /* map.flyTo({
                center: centroidOf(st.coords),
                zoom: 20,
                pitch: 0,
                bearing: 0,
                speed: 0.6
            }); */
            map.flyTo({center: current.pos, ...CONFIG.camera.above, bearing: JSON.parse(current.buildProp?.["bearing"]),essential: true});
            current.mode = 2;
        });
    });

    buildingState.activeBuildingId = bid;
    buildingState.activeLevel = null;
}

export function setFloorOpacities(map, bid, selected) {
    const st = buildingState[bid];
    if (!st) return;
    st.floorsSpec.forEach(fl => {
        const layerId = `${bid}-floor-${fl.level}`;
        const op = selected == null
            ? CONFIG.ui.floorSelectedOpacity : (fl.level === selected
                ? CONFIG.ui.floorSelectedOpacity : CONFIG.ui.floorOthersOpacity);
        map.getLayer(layerId) &&
            map.setPaintProperty(layerId, "fill-extrusion-opacity", op);
        current.bid = bid;
    });
}

export function removeFloorsFor(map, bid) {
    const st = buildingState[bid];
    if (!st || !Array.isArray(st.floorLayerIds)) return;
    st.floorLayerIds.forEach(id => map.getLayer(id) && map.removeLayer(id));
    st.sourceId && map.getSource(st.sourceId) && map.removeSource(st.sourceId);
    delete buildingState[bid];
}