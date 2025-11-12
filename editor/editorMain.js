
import { CONFIG, searchBasicInfoByBid, searchFloorInfoByBid, current as currentConfig } from "./utils.js";

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const buildingSelect = document.getElementById("buildingSelect");
const floorSelect = document.getElementById("floorSelect");
const floorCoordsInput = document.getElementById("floorCoordsInput");
const applyFloorCoordsBtn = document.getElementById("applyFloorCoordsBtn");
const closeRoomBtn = document.getElementById("closeRoomBtn");
const roomListEl = document.getElementById("roomList");

// ----- State -----
const state = {
  building: null,
  floorIndex: null,
  floorInfo: null,
  floorPolygon: null, // [[lon, lat], ...]

  worldOrigin: { x: 0, y: 0 },
  view: {
    // no interactive view controls; used only to fit polygon to canvas
    scale: 1,
    panX: 0,
    panY: 0,
    rotation: 0
  },

  rooms: [], // { id, points: [[lon,lat],...], closed: bool }
  activeRoomIndex: null,

  mouse: {
    isDown: false,
    button: 0,
    lastX: 0,
    lastY: 0,
    dragTarget: null // { type: "point", roomIndex, pointIndex }
  },

  history: []
};

let roomIdCounter = 1;

// ----- Utility: canvas resize -----
function resizeCanvas() {
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  draw();
}

window.addEventListener("resize", resizeCanvas);

// ----- Utility: view matrix and transforms (rotation fixed to 0) -----
function computeViewMatrix() {
  const { scale, panX, panY } = state.view;
  const { x: ox, y: oy } = state.worldOrigin;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // rotation is fixed to 0
  const a = scale;
  const b = 0;
  const c = 0;
  const d = -scale;
  const e = cx + panX - scale * ox;
  const f = cy + panY + scale * oy;

  return { a, b, c, d, e, f };
}

function worldToScreen(wx, wy) {
  const { scale, panX, panY } = state.view;
  const { x: ox, y: oy } = state.worldOrigin;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const dx = (wx - ox) * scale;
  const dy = (wy - oy) * scale;

  return { x: cx + panX + dx, y: cy + panY - dy };
}

function screenToWorld(sx, sy) {
  const { scale, panX, panY } = state.view;
  const { x: ox, y: oy } = state.worldOrigin;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const dx = (sx - cx - panX) / scale;
  const dy = (cy + panY - sy) / scale;

  return [ox + dx, oy + dy];
}

// ----- Utility: history (undo) -----
function pushHistory() {
  const snapshot = {
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    activeRoomIndex: state.activeRoomIndex
  };
  state.history.push(snapshot);
  if (state.history.length > 100) state.history.shift();
}

function undo() {
  if (!state.history.length) return;
  const last = state.history.pop();
  state.rooms = last.rooms;
  state.activeRoomIndex = last.activeRoomIndex;
  refreshRoomList();
  draw();
}

// ----- Building / floor loading -----
async function initBuildings() {
  buildingSelect.innerHTML = "";

  for (const bid of CONFIG.bidList) {
    const info = await searchBasicInfoByBid(bid);
    const opt = document.createElement("option");
    opt.value = bid;
    opt.textContent = info?.name ? `${info.name} (${bid})` : bid;
    buildingSelect.appendChild(opt);
  }

  if (CONFIG.bidList.length > 0) {
    buildingSelect.value = CONFIG.bidList[0];
    await onBuildingChange();
  }
}

async function onBuildingChange() {
  const bid = buildingSelect.value;
  if (!bid) return;

  state.building = bid;
  currentConfig.bid = bid;

  const floorInfo = await searchFloorInfoByBid(bid);
  state.floorInfo = floorInfo;

  floorSelect.innerHTML = "";
  if (!floorInfo) return;

  const levels = [];
  for (let i = 0; i < floorInfo.totLevel; i++) {
    const levelNum = CONFIG.idRules.level(floorInfo.bmLevel, i);
    const label = levelNum > 0 ? `${levelNum}F` : `B${-levelNum}`;
    levels.push({ index: i, levelNum, label });
  }

  for (const lvl of levels) {
    const opt = document.createElement("option");
    opt.value = String(lvl.index);
    opt.textContent = lvl.label;
    floorSelect.appendChild(opt);
  }

  if (levels.length > 0) {
    floorSelect.value = "0";
    await onFloorChange();
  }
}

async function onFloorChange() {
  if (!state.floorInfo) return;

  const idx = parseInt(floorSelect.value, 10);
  if (Number.isNaN(idx)) return;

  state.floorIndex = idx;

  const { flList, flVars } = state.floorInfo;
  const flVarIndex = flList[idx];
  const floorPolygon = flVars[flVarIndex];

  state.floorPolygon = floorPolygon;

  setupWorldFromFloorPolygon();

  state.rooms = [];
  state.activeRoomIndex = null;
  state.history = [];
  refreshRoomList();
  draw();
}

function setupWorldFromFloorPolygon() {
  const poly = state.floorPolygon;
  if (!poly || !poly.length) return;

  let minX = poly[0][0];
  let maxX = poly[0][0];
  let minY = poly[0][1];
  let maxY = poly[0][1];

  for (const pt of poly) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[1] > maxY) maxY = pt[1];
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  state.worldOrigin.x = cx;
  state.worldOrigin.y = cy;

  const worldWidth = maxX - minX || 1;
  const worldHeight = maxY - minY || 1;

  const margin = 0.8;
  const scaleX = (canvas.width * margin) / worldWidth;
  const scaleY = (canvas.height * margin) / worldHeight;
  const scale = Math.min(scaleX, scaleY);

  state.view.scale = scale;
  state.view.panX = 0;
  state.view.panY = 0;
  state.view.rotation = 0; // fixed
}

// ----- Floor polygon manual input -----
function applyManualFloorCoords() {
  const text = floorCoordsInput.value.trim();
  if (!text) return;
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr) || !arr.length) return;

    state.floorPolygon = arr;
    setupWorldFromFloorPolygon();
    draw();
  } catch (e) {
    console.error("수동 층 폴리곤 파싱 실패:", e);
  }
}

// ----- Rooms -----
function getOrCreateActiveOpenRoom() {
  if (
    state.activeRoomIndex != null &&
    state.rooms[state.activeRoomIndex] &&
    !state.rooms[state.activeRoomIndex].closed
  ) {
    return state.rooms[state.activeRoomIndex];
  }

  for (let i = state.rooms.length - 1; i >= 0; i--) {
    if (!state.rooms[i].closed) {
      state.activeRoomIndex = i;
      return state.rooms[i];
    }
  }

  const room = { id: roomIdCounter++, points: [], closed: false };
  state.rooms.push(room);
  state.activeRoomIndex = state.rooms.length - 1;
  refreshRoomList();
  return room;
}

function closeActiveRoom() {
  if (state.activeRoomIndex == null) return;
  const room = state.rooms[state.activeRoomIndex];
  if (!room || room.closed) return;
  if (room.points.length < 3) return;

  pushHistory();
  room.closed = true;
  refreshRoomList();
  draw();
}

function deleteRoom(index) {
  if (index < 0 || index >= state.rooms.length) return;
  pushHistory();
  state.rooms.splice(index, 1);
  if (state.activeRoomIndex === index) {
    state.activeRoomIndex = null;
  } else if (state.activeRoomIndex > index) {
    state.activeRoomIndex -= 1;
  }
  refreshRoomList();
  draw();
}

function setActiveRoom(index) {
  if (index < 0 || index >= state.rooms.length) return;
  state.activeRoomIndex = index;
  refreshRoomList();
  draw();
}

function refreshRoomList() {
  roomListEl.innerHTML = "";
  state.rooms.forEach((room, idx) => {
    const div = document.createElement("div");
    div.className = "room-item";
    if (idx === state.activeRoomIndex) div.classList.add("active");

    const header = document.createElement("div");
    header.className = "room-header";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = `방 ${idx + 1} (id: ${room.id})`;
    header.appendChild(titleSpan);

    const btnContainer = document.createElement("div");

    const selectBtn = document.createElement("button");
    selectBtn.textContent = "선택";
    selectBtn.addEventListener("click", () => setActiveRoom(idx));
    btnContainer.appendChild(selectBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "삭제";
    deleteBtn.addEventListener("click", () => deleteRoom(idx));
    btnContainer.appendChild(deleteBtn);

    // Clipboard button with consistent precision
    const clipboardBtn = document.createElement("button");
    clipboardBtn.textContent = "좌표 복사";
    clipboardBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(jsonToCopy);
    });
    btnContainer.appendChild(clipboardBtn);

    header.appendChild(btnContainer);
    div.appendChild(header);

    // Both displayed and copied coordinates use the same precision (8 decimals)
    const precise = room.points.map((p) => [
      Number(p[0].toFixed(8)),
      Number(p[1].toFixed(8))
    ]);
    if (precise.length >= 3) precise.push(precise[0]);
    const coordsPre = document.createElement("pre");
    coordsPre.className = "room-coords";
    coordsPre.textContent = JSON.stringify(precise);

    const jsonToCopy = JSON.stringify(precise);

    div.appendChild(coordsPre);

    roomListEl.appendChild(div);
  });
}

function findNearestVertex(screenX, screenY, thresholdPx = 8) {
  let best = null;
  let bestDist = Infinity;

  state.rooms.forEach((room, rIndex) => {
    room.points.forEach((pt, pIndex) => {
      const s = worldToScreen(pt[0], pt[1]);
      const dx = s.x - screenX;
      const dy = s.y - screenY;
      const dist = Math.hypot(dx, dy);
      if (dist <= thresholdPx && dist < bestDist) {
        bestDist = dist;
        best = { roomIndex: rIndex, pointIndex: pIndex };
      }
    });
  });

  return best;
}

// ----- Drawing -----
function draw() {
  // Reset transform and clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.floorPolygon) return;

  // Helper: draw path from screen points
  const drawPath = (points, { close = true } = {}) => {
    if (!points.length) return;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    if (close && points.length >= 3) ctx.closePath();
  };

  // ---- Floor polygon (screen space) ----
  const floorScreen = state.floorPolygon.map(([wx, wy]) => worldToScreen(wx, wy));
  drawPath(floorScreen, { close: true });
  ctx.lineWidth = 1; // fixed pixel width
  ctx.strokeStyle = "#008000";
  ctx.fillStyle = "rgba(0, 128, 0, 0.05)";
  ctx.fill();
  ctx.stroke();

  // ---- Rooms (screen space) ----
  state.rooms.forEach((room, idx) => {
    if (!room.points.length) return;
    const screenPts = room.points.map(([wx, wy]) => worldToScreen(wx, wy));

    drawPath(screenPts, { close: room.closed });

    const isActive = idx === state.activeRoomIndex;
    ctx.lineWidth = isActive ? 2 : 1.5; // fixed pixel width
    ctx.strokeStyle = isActive ? "#007aff" : "#e53935";
    ctx.stroke();

    if (room.closed) {
      ctx.fillStyle = "rgba(0, 122, 255, 0.08)";
      ctx.fill();
    }
  });

  // ---- Vertices (screen space) ----
  state.rooms.forEach((room, idx) => {
    const isActive = idx === state.activeRoomIndex;
    room.points.forEach(([wx, wy]) => {
      const s = worldToScreen(wx, wy);
      ctx.beginPath();
      ctx.arc(s.x, s.y, isActive ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "#007aff" : "#e53935";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  });
}

// ----- Mouse handling (rooms only) -----
function onMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  state.mouse.isDown = true;
  state.mouse.button = e.button;
  state.mouse.lastX = x;
  state.mouse.lastY = y;
  state.mouse.dragTarget = null;

  if (e.button !== 0) return; // only left-click actions

  const hit = findNearestVertex(x, y);
  if (hit) {
    pushHistory();
    state.mouse.dragTarget = {
      type: "point",
      roomIndex: hit.roomIndex,
      pointIndex: hit.pointIndex
    };
  } else {
    const wpt = screenToWorld(x, y);
    pushHistory();
    const room = getOrCreateActiveOpenRoom();
    room.points.push(wpt);
    refreshRoomList();
    draw();
  }
}

function onMouseMove(e) {
  if (!state.mouse.isDown) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const target = state.mouse.dragTarget;
  if (target && target.type === "point") {
    const [wx, wy] = screenToWorld(x, y);
    const room = state.rooms[target.roomIndex];
    if (room && room.points[target.pointIndex]) {
      room.points[target.pointIndex][0] = wx;
      room.points[target.pointIndex][1] = wy;
      refreshRoomList();
      draw();
    }
  }

  state.mouse.lastX = x;
  state.mouse.lastY = y;
}

function onMouseUp() {
  state.mouse.isDown = false;
  state.mouse.dragTarget = null;
}

// ----- Keyboard -----
function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    undo();
  }
}

// ----- Init -----
function bindEvents() {
  buildingSelect.addEventListener("change", onBuildingChange);
  floorSelect.addEventListener("change", onFloorChange);
  applyFloorCoordsBtn.addEventListener("click", applyManualFloorCoords);
  closeRoomBtn.addEventListener("click", closeActiveRoom);

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  window.addEventListener("keydown", onKeyDown);
}

async function init() {
  resizeCanvas();
  bindEvents();
  await initBuildings();
}

init();