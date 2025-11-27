// draw.js: 좌표 변환, 폴리곤 그리기/히트테스트 모듈

export const COORD_DECIMALS = 8;
const EARTH_RADIUS = 6378137;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Local reference point (lon, lat) to keep world coordinates small and Mapbox-like
const REF_LON = 126.95336;
const REF_LAT = 37.34524;
const REF_LAMBDA = REF_LON * DEG2RAD;
const REF_PHI = REF_LAT * DEG2RAD;
const REF_MX = EARTH_RADIUS * REF_LAMBDA;
const REF_MY = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + REF_PHI / 2));

let canvasRef = null;
let ctxRef = null;
let stateRef = null;

export function initDraw(canvas, state) {
  canvasRef = canvas;
  ctxRef = canvas.getContext("2d");
  stateRef = state;
}

// Convert between lon/lat (GeoJSON) and local "world" coordinates (meters, Web Mercator-like)
export function lonLatToWorld(lon, lat) {
  const lambda = lon * DEG2RAD;
  const phi = lat * DEG2RAD;
  const x = EARTH_RADIUS * lambda;
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + phi / 2));
  return [x - REF_MX, y - REF_MY];
}

export function worldToLonLat(wx, wy) {
  const mx = wx + REF_MX;
  const my = wy + REF_MY;
  const lambda = mx / EARTH_RADIUS;
  const phi = 2 * Math.atan(Math.exp(my / EARTH_RADIUS)) - Math.PI / 2;
  return [lambda * RAD2DEG, phi * RAD2DEG];
}

// Affine world<->screen with rotation, using lon/lat <-> world projection
export function worldToScreen(wx, wy) {
  const { scale, panX, panY, rotation } = stateRef.view;
  const { x: ox, y: oy } = stateRef.worldOrigin;
  const cx = canvasRef.width / 2;
  const cy = canvasRef.height / 2;
  const [mx, my] = lonLatToWorld(wx, wy);
  const dx = mx - ox;
  const dy = my - oy;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return { x: cx + panX + rx * scale, y: cy + panY - ry * scale };
}

export function screenToWorld(sx, sy) {
  const { scale, panX, panY, rotation } = stateRef.view;
  const { x: ox, y: oy } = stateRef.worldOrigin;
  const cx = canvasRef.width / 2;
  const cy = canvasRef.height / 2;
  const rx = (sx - cx - panX) / scale;
  const ry = -(sy - cy - panY) / scale;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = rx * cos + ry * sin; // R(-theta)
  const dy = -rx * sin + ry * cos;
  const wx = ox + dx;
  const wy = oy + dy;
  return worldToLonLat(wx, wy);
}

export function bboxOf(points) {
  if (!points || !points.length) return null;
  let [minX, minY] = points[0];
  let [maxX, maxY] = points[0];
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function bboxOfWorld(points) {
  if (!points || !points.length) return null;
  const [lon0, lat0] = points[0];
  let [minX, minY] = lonLatToWorld(lon0, lat0);
  let [maxX, maxY] = [minX, minY];
  for (const [lon, lat] of points) {
    const [x, y] = lonLatToWorld(lon, lat);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function getWorldCenterFromLonLatPoints(points) {
  if (!points || !points.length) return null;
  const worldPts = points.map(([lon, lat]) => lonLatToWorld(lon, lat));
  let cx = 0;
  let cy = 0;
  worldPts.forEach(([wx, wy]) => {
    cx += wx;
    cy += wy;
  });
  cx /= worldPts.length;
  cy /= worldPts.length;
  return { cx, cy, worldPts };
}

export function applyTransformToLonLatPoints(worldPts, centerWorld, scaleFactor, rotationAngle) {
  const { cx, cy } = centerWorld;
  const cos = Math.cos(rotationAngle || 0);
  const sin = Math.sin(rotationAngle || 0);
  const s = scaleFactor == null ? 1 : scaleFactor;
  const result = [];
  for (let i = 0; i < worldPts.length; i++) {
    const [wx, wy] = worldPts[i];
    let dx = wx - cx;
    let dy = wy - cy;

    // scale first
    dx *= s;
    dy *= s;

    // then rotate
    let rx = dx;
    let ry = dy;
    if (rotationAngle) {
      rx = dx * cos - dy * sin;
      ry = dx * sin + dy * cos;
    }

    const lonlat = worldToLonLat(cx + rx, cy + ry);
    result.push([lonlat[0], lonlat[1]]);
  }
  return result;
}

export function fitViewTo(points) {
  const bb = bboxOfWorld(points);
  if (!bb) return;
  const cx = (bb.minX + bb.maxX) / 2;
  const cy = (bb.minY + bb.maxY) / 2;
  stateRef.worldOrigin.x = cx;
  stateRef.worldOrigin.y = cy;
  const w = (bb.maxX - bb.minX) || 1;
  const h = (bb.maxY - bb.minY) || 1;
  const margin = 0.8;
  const sx = (canvasRef.width * margin) / w;
  const sy = (canvasRef.height * margin) / h;
  stateRef.view.scale = Math.min(sx, sy);
  stateRef.view.panX = 0;
  stateRef.view.panY = 0;
}

function drawPathScreen(screenPts, close = true) {
  if (!screenPts.length) return;
  const ctx = ctxRef;
  ctx.beginPath();
  screenPts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close && screenPts.length >= 3) ctx.closePath();
}

function toScreenPathLonLat(lonLatPts) {
  return lonLatPts.map(([lon, lat]) => worldToScreen(lon, lat));
}

export function formatCoords(points, { decimals = COORD_DECIMALS, close = false } = {}) {
  if (!Array.isArray(points)) return "[]";
  const out = points.map(([x, y]) => [Number(x.toFixed(decimals)), Number(y.toFixed(decimals))]);
  if (close && out.length >= 3) out.push(out[0]);
  return JSON.stringify(out);
}

function pointInPolygonScreen(px, py, screenPts) {
  let inside = false;
  for (let i = 0, j = screenPts.length - 1; i < screenPts.length; j = i++) {
    const xi = screenPts[i].x;
    const yi = screenPts[i].y;
    const xj = screenPts[j].x;
    const yj = screenPts[j].y;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function hitTestFilledRoom(screenX, screenY) {
  let hit = null;
  // Saved rooms first
  stateRef.saved.forEach((room, idx) => {
    if (!room.points || room.points.length < 3) return;
    const pts = toScreenPathLonLat(room.points);
    if (pointInPolygonScreen(screenX, screenY, pts)) {
      hit = { list: "saved", roomIndex: idx };
    }
  });
  // Draft rooms (closed ones) drawn on top
  stateRef.rooms.forEach((room, idx) => {
    if (!room.closed || !room.points || room.points.length < 3) return;
    const pts = toScreenPathLonLat(room.points);
    if (pointInPolygonScreen(screenX, screenY, pts)) {
      hit = { list: "draft", roomIndex: idx };
    }
  });
  return hit;
}

export function findNearestVertex(screenX, screenY, thresholdPx = 8) {
  let best = null;
  let bestDist = Infinity;
  // Draft rooms
  stateRef.rooms.forEach((room, rIndex) => {
    room.points.forEach((pt, pIndex) => {
      const s = worldToScreen(pt[0], pt[1]);
      const dx = s.x - screenX;
      const dy = s.y - screenY;
      const d = Math.hypot(dx, dy);
      if (d <= thresholdPx && d < bestDist) {
        bestDist = d;
        best = { list: "draft", roomIndex: rIndex, pointIndex: pIndex };
      }
    });
  });
  // Saved rooms
  stateRef.saved.forEach((room, rIndex) => {
    room.points.forEach((pt, pIndex) => {
      const s = worldToScreen(pt[0], pt[1]);
      const dx = s.x - screenX;
      const dy = s.y - screenY;
      const d = Math.hypot(dx, dy);
      if (d <= thresholdPx && d < bestDist) {
        bestDist = d;
        best = { list: "saved", roomIndex: rIndex, pointIndex: pIndex };
      }
    });
  });
  return best;
}

export function draw() {
  if (!canvasRef || !ctxRef || !stateRef) return;
  const ctx = ctxRef;
  const canvas = canvasRef;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!stateRef.floorPolygon) return;

  // Floor
  const floorScreen = toScreenPathLonLat(stateRef.floorPolygon);
  drawPathScreen(floorScreen, true);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#008000";
  ctx.fillStyle = "rgba(0,128,0,.05)";
  ctx.fill();
  ctx.stroke();

  // Saved Rooms (rooms.json) — editable, stronger color
  stateRef.saved.forEach((room, idx) => {
    if (!room.points.length) return;
    const screenPts = toScreenPathLonLat(room.points);
    drawPathScreen(screenPts, true);
    const active = idx === stateRef.activeSavedIndex;
    if (active) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ff3b30";
      ctx.fillStyle = "rgba(255,59,48,.20)";
    } else {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ff9500";
      ctx.fillStyle = "rgba(255,149,0,.08)";
    }
    ctx.fill();
    ctx.stroke();
  });

  // Saved vertices (editable)
  stateRef.saved.forEach((room) => {
    room.points.forEach(([wx, wy]) => {
      const s = worldToScreen(wx, wy);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9500";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  });

  // Draft Rooms (editable)
  stateRef.rooms.forEach((room, idx) => {
    if (!room.points.length) return;
    const screenPts = toScreenPathLonLat(room.points);
    drawPathScreen(screenPts, room.closed);
    const active = idx === stateRef.activeRoomIndex;
    ctx.lineWidth = active ? 2 : 1.5;
    ctx.strokeStyle = active ? "#007aff" : "#e53935";
    ctx.stroke();
    if (room.closed) {
      ctx.fillStyle = "rgba(0,122,255,.08)";
      ctx.fill();
    }
  });

  // Draft vertices only
  stateRef.rooms.forEach((room, idx) => {
    const active = idx === stateRef.activeRoomIndex;
    room.points.forEach(([wx, wy]) => {
      const s = worldToScreen(wx, wy);
      ctx.beginPath();
      ctx.arc(s.x, s.y, active ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = active ? "#007aff" : "#e53935";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  });

  // Floorplan Image Overlay (on top of polygons)
  if (stateRef.image.loaded && stateRef.image.img) {
    const img = stateRef.image.img;
    const im = stateRef.image;
    ctx.save();
    const { scale, panX, panY, rotation } = stateRef.view;
    const { x: ox, y: oy } = stateRef.worldOrigin;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.translate(cx + panX, cy + panY);
    ctx.scale(scale, -scale); // flip Y to match world coords
    ctx.rotate(rotation);
    ctx.translate(im.pos.x - ox, im.pos.y - oy);
    ctx.rotate(im.rotation);
    ctx.scale(im.scale, im.scale);
    // Re-flip vertically so the image appears upright in world coordinates
    ctx.scale(1, -1);
    ctx.globalAlpha = im.opacity;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }
}