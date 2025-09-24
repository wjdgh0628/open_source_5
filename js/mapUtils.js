import { CONFIG } from './config.js';

export const buildingState = {};
buildingState.activeBuildingId = null;
buildingState.activeLevel = null;

export function autoFloorsArray(count, defs) {
    const { floorThickness, floorGap, colorPalette } = defs;
    return Array.from({ length: count }, (_, i) => {
        const base = i * (floorThickness + floorGap);
        return {
            level: i,
            name: `${i + 1}F`,
            base,
            height: base + floorThickness,
            color: colorPalette[i % colorPalette.length]
        };
    });
}

export const buildFloorsGeoJSON = (coords, floors) => ({
    type: "FeatureCollection",
    features: floors.map(f => ({
        type: "Feature",
        properties: { ...f },
        geometry: { type: "Polygon", coordinates: [coords] }
    }))
});

/* export function centroidOf(coords) {
    const n = coords.length - 1;
    const [sx, sy] = coords.slice(0, n)
        .reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
    return [sx / n, sy / n];
} */

export const ensureClosedPolygon = ring => {
    if (!ring || ring.length < 3) return ring;
    const [fx, fy] = ring[0], [lx, ly] = ring[ring.length - 1];
    return (fx !== lx || fy !== ly) ? [...ring, [...ring[0]]] : ring;
};

export const flyCamera = (map, mode, center) =>
    map.flyTo({ center, ...CONFIG.camera[mode], essential: true });

export const hideCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "none");

export const showCampusBase = map =>
    map.getLayer("campus-3d") && map.setLayoutProperty("campus-3d", "visibility", "visible");

export const disableCampusHit = map =>
    map.getLayer("campus-hit") && map.setLayoutProperty("campus-hit", "visibility", "none");

export const enableCampusHit = map =>
    map.getLayer("campus-hit") && map.setLayoutProperty("campus-hit", "visibility", "visible");