


import { CONFIG, searchBasicInfoByBid, searchFloorInfoByBid, current as currentConfig } from "./utils.js";

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const buildingSelect = document.getElementById("buildingSelect");
const floorSelect = document.getElementById("floorSelect");
const floorCoordsInput = document.getElementById("floorCoordsInput");
const applyFloorCoordsBtn = document.getElementById("applyFloorCoordsBtn");

const modeInputs = document.querySelectorAll('input[name="mode"]');
const imageOpacityInput = document.getElementById("imageOpacity");
const imageScaleInput = document.getElementById("imageScale");
const imageRotationInput = document.getElementById("imageRotation");
const closeRoomBtn = document.getElementById("closeRoomBtn");
const resetViewBtn = document.getElementById("resetViewBtn");

const roomListEl = document.getElementById("roomList");

// ----- State -----
const state = {
    mode: "view", // "view" | "image" | "room"
    building: null,
    floorIndex: null,
    floorInfo: null,
    floorPolygon: null, // [[lon, lat], ...]

    worldOrigin: { x: 0, y: 0 },
    view: {
        scale: 1,
        panX: 0,
        panY: 0,
        rotation: 0
    },

    image: {
        img: null,
        baseWorldScale: 1,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        rotation: 0,
        alpha: 0.6
    },

    rooms: [], // { id, points: [[lon,lat],...], closed: bool }
    activeRoomIndex: null,

    mouse: {
        isDown: false,
        button: 0,
        lastX: 0,
        lastY: 0,
        dragTarget: null // { type: "viewPan" | "viewRotate" | "point" | "image" , roomIndex?, pointIndex? }
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

// ----- Utility: view matrix and transforms -----
function computeViewMatrix() {
    const { scale, panX, panY, rotation } = state.view;
    const { x: ox, y: oy } = state.worldOrigin;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    const a = scale * cosR;
    const b = -scale * sinR;
    const c = -scale * sinR;
    const d = -scale * cosR;
    const e = cx + panX + scale * (-ox * cosR + oy * sinR);
    const f = cy + panY + scale * (ox * sinR + oy * cosR);

    return { a, b, c, d, e, f, cosR, sinR };
}

function worldToScreen(wx, wy) {
    const { scale, panX, panY, rotation } = state.view;
    const { x: ox, y: oy } = state.worldOrigin;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    let dx = wx - ox;
    let dy = wy - oy;

    let rx = dx * cosR - dy * sinR;
    let ry = dx * sinR + dy * cosR;

    rx *= scale;
    ry *= scale;
    ry *= -1;

    const sx = cx + panX + rx;
    const sy = cy + panY + ry;
    return { x: sx, y: sy };
}

function screenToWorld(sx, sy) {
    const { scale, panX, panY, rotation } = state.view;
    const { x: ox, y: oy } = state.worldOrigin;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    let x = sx - cx - panX;
    let y = sy - cy - panY;

    y *= -1;

    x /= scale;
    y /= scale;

    const wxLocal = x * cosR + y * sinR;
    const wyLocal = -x * sinR + y * cosR;

    const wx = wxLocal + ox;
    const wy = wyLocal + oy;

    return [wx, wy];
}

// ----- Utility: history (undo) -----
function pushHistory() {
    const snapshot = {
        rooms: JSON.parse(JSON.stringify(state.rooms)),
        activeRoomIndex: state.activeRoomIndex
    };
    state.history.push(snapshot);
    if (state.history.length > 100) {
        state.history.shift();
    }
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

    const { flList, flVars, bmLevel } = state.floorInfo;
    const flVarIndex = flList[idx];
    const floorPolygon = flVars[flVarIndex];

    state.floorPolygon = floorPolygon;

    setupWorldFromFloorPolygon();
    await loadFloorImage();

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
    state.view.rotation = 0;

    state.image.offsetX = 0;
    state.image.offsetY = 0;
    state.image.scale = 1;
    state.image.rotation = 0;
}

async function loadFloorImage() {
    state.image.img = null;

    const floorInfo = state.floorInfo;
    if (!floorInfo) return;

    const idx = state.floorIndex;
    const levelNum = CONFIG.idRules.level(floorInfo.bmLevel, idx);
    const fid = CONFIG.idRules.fid(state.building, levelNum);
    const url = `${CONFIG.campus.floorplanUrl}${fid}.png`;

    const img = new Image();
    img.src = url;
    img.onload = () => {
        state.image.img = img;

        const poly = state.floorPolygon;
        if (!poly || !poly.length) {
            draw();
            return;
        }

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

        const worldWidth = maxX - minX || 1;
        const scaleFromWidth = worldWidth / img.width;

        state.image.baseWorldScale = scaleFromWidth;
        state.image.scale = parseFloat(imageScaleInput.value) || 1;
        state.image.alpha = parseFloat(imageOpacityInput.value) || 0.6;
        state.image.rotation = (parseFloat(imageRotationInput.value) * Math.PI) / 180;

        draw();
    };

    img.onerror = () => {
        state.image.img = null;
        draw();
    };
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

    const room = {
        id: roomIdCounter++,
        points: [],
        closed: false
    };
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

        header.appendChild(btnContainer);
        div.appendChild(header);

        const coordsPre = document.createElement("pre");
        coordsPre.className = "room-coords";

        const coords = room.points.map((p) => [
            Number(p[0].toFixed(8)),
            Number(p[1].toFixed(8))
        ]);

        if (coords.length >= 3) {
            coords.push(coords[0]);
        }

        coordsPre.textContent = JSON.stringify(coords);
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
// ----- Drawing -----
function draw() {
    // 기본 상태로 초기화
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.floorPolygon) return;

    const { a, b, c, d, e, f } = computeViewMatrix();

    // 1) Floor polygon (맨 아래)
    ctx.save();
    ctx.setTransform(a, b, c, d, e, f);

    ctx.beginPath();
    state.floorPolygon.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt[0], pt[1]);
        else ctx.lineTo(pt[0], pt[1]);
    });
    ctx.closePath();
    ctx.lineWidth = 1 / state.view.scale;
    ctx.strokeStyle = "#008000";
    ctx.fillStyle = "rgba(0, 128, 0, 0.05)";
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 2) 이미지 오버레이 (층 위, 방 선 아래)
    if (state.image.img) {
        const img = state.image.img;
        ctx.save();
        ctx.setTransform(a, b, c, d, e, f);

        ctx.translate(
            state.worldOrigin.x + state.image.offsetX,
            state.worldOrigin.y + state.image.offsetY
        );
        // view 회전은 이미 view matrix에 포함되어 있으므로 여기서는 이미지 자체 회전만 적용
        ctx.rotate(state.image.rotation);

        const baseScale = state.image.baseWorldScale * state.image.scale;
        // view matrix에서 이미 y축이 한 번 뒤집혀 있으므로,
        // 이미지가 최종적으로 뒤집혀 보이지 않게 로컬 좌표에서 한 번 더 y를 뒤집어 준다.
        ctx.scale(baseScale, -baseScale);

        ctx.globalAlpha = state.image.alpha;
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // 3) 방 폴리곤들 (이미지 위)
    ctx.save();
    ctx.setTransform(a, b, c, d, e, f);

    state.rooms.forEach((room, idx) => {
        if (!room.points.length) return;
        ctx.beginPath();
        room.points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt[0], pt[1]);
            else ctx.lineTo(pt[0], pt[1]);
        });
        if (room.closed && room.points.length >= 3) {
            ctx.closePath();
        }

        const isActive = idx === state.activeRoomIndex;
        ctx.lineWidth = (isActive ? 2 : 1.5) / state.view.scale;
        ctx.strokeStyle = isActive ? "#007aff" : "#e53935";
        ctx.stroke();

        if (room.closed) {
            ctx.fillStyle = "rgba(0, 122, 255, 0.08)";
            ctx.fill();
        }
    });

    ctx.restore();

    // 4) 버텍스(점)를 화면 좌표 기준으로 최상단에 그리기
    ctx.save();
    state.rooms.forEach((room, idx) => {
        const isActive = idx === state.activeRoomIndex;
        room.points.forEach((pt) => {
            const s = worldToScreen(pt[0], pt[1]);
            ctx.beginPath();
            ctx.arc(s.x, s.y, isActive ? 4 : 3, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? "#007aff" : "#e53935";
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    });
    ctx.restore();
}

// ----- Mouse handling -----
function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    state.mouse.isDown = true;
    state.mouse.button = e.button;
    state.mouse.lastX = x;
    state.mouse.lastY = y;
    state.mouse.dragTarget = null;

    if (state.mode === "view") {
        if (e.button === 0) {
            state.mouse.dragTarget = { type: "viewPan" };
        } else if (e.button === 2) {
            state.mouse.dragTarget = { type: "viewRotate" };
        }
    } else if (state.mode === "image") {
        if (!state.image.img) return;
        if (e.button === 0) {
            state.mouse.dragTarget = { type: "image" };
        }
    } else if (state.mode === "room") {
        if (e.button !== 0) return;

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
}

function onMouseMove(e) {
    if (!state.mouse.isDown) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - state.mouse.lastX;
    const dy = y - state.mouse.lastY;

    const target = state.mouse.dragTarget;

    if (!target) {
        state.mouse.lastX = x;
        state.mouse.lastY = y;
        return;
    }

    if (target.type === "viewPan") {
        state.view.panX += dx;
        state.view.panY += dy;
        draw();
    } else if (target.type === "viewRotate") {
        state.view.rotation += dx * 0.005;
        draw();
    } else if (target.type === "image") {
        const [wx1, wy1] = screenToWorld(state.mouse.lastX, state.mouse.lastY);
        const [wx2, wy2] = screenToWorld(x, y);
        state.image.offsetX += wx2 - wx1;
        state.image.offsetY += wy2 - wy1;
        draw();
    } else if (target.type === "point") {
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

function onContextMenu(e) {
    if (state.mode === "view") {
        e.preventDefault();
    }
}

function onWheel(e) {
    if (state.mode !== "view") return;

    e.preventDefault();

    const delta = e.deltaY;
    const factor = delta < 0 ? 1.1 : 0.9;
    state.view.scale *= factor;
    // 너무 작아지는 것만 방지하고 상한은 두지 않는다.
    if (state.view.scale < 0.000001) state.view.scale = 0.000001;
    draw();
}

// ----- Keyboard -----
function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
    }
}

// ----- Image controls -----
function onImageOpacityChange() {
    const v = parseFloat(imageOpacityInput.value);
    if (Number.isNaN(v)) return;
    state.image.alpha = v;
    draw();
}

function onImageScaleChange() {
    const v = parseFloat(imageScaleInput.value);
    if (Number.isNaN(v)) return;
    state.image.scale = v;
    draw();
}

function onImageRotationChange() {
    const v = parseFloat(imageRotationInput.value);
    if (Number.isNaN(v)) return;
    state.image.rotation = (v * Math.PI) / 180;
    draw();
}

// ----- Mode & buttons -----
function onModeChange() {
    modeInputs.forEach((input) => {
        if (input.checked) {
            state.mode = input.value;
        }
    });

    if (state.mode === "view") {
        canvas.style.cursor = "grab";
    } else if (state.mode === "image") {
        canvas.style.cursor = "move";
    } else {
        canvas.style.cursor = "crosshair";
    }
}

function resetView() {
    setupWorldFromFloorPolygon();
    draw();
}

// ----- Init -----
function bindEvents() {
    buildingSelect.addEventListener("change", () => {
        onBuildingChange();
    });

    floorSelect.addEventListener("change", () => {
        onFloorChange();
    });

    applyFloorCoordsBtn.addEventListener("click", applyManualFloorCoords);

    modeInputs.forEach((input) => {
        input.addEventListener("change", onModeChange);
    });

    imageOpacityInput.addEventListener("input", onImageOpacityChange);
    imageScaleInput.addEventListener("input", onImageScaleChange);
    imageRotationInput.addEventListener("input", onImageRotationChange);

    closeRoomBtn.addEventListener("click", closeActiveRoom);
    resetViewBtn.addEventListener("click", resetView);

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    window.addEventListener("keydown", onKeyDown);
}

async function init() {
    resizeCanvas();
    bindEvents();
    await initBuildings();
    onModeChange();
}

init();