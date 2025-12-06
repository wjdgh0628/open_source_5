import { COORD_DECIMALS } from "./editorConfig.js";
import { idRules } from "../shared/rules.js";
import { initDraw, draw, bboxOfWorld, formatCoords, fitViewTo } from "./editorDraw.js";
import { onMouseDown, onMouseMove, onWheel, onMouseUp, onKeyDown, onKeyUp } from "./editorEvents.js";
import { updateInfos, getInfos, editInfos } from "../shared/cache.js";
import { saveRoomsJsonFromInfos } from "../shared/fetchData.js";

const floorplanUrl = "floorplans/";

// ==== Constants & Shared Helpers =====================================================
export const canvas = document.getElementById("editorCanvas");

// Platform helpers for modifier key (Cmd/Ctrl abstraction)
export const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
export const modDown = (e) => (isMac ? e.metaKey : e.ctrlKey);

const el = (id) => document.getElementById(id);
const buildingSelect = el("buildingSelect");
const floorSelect = el("floorSelect");
const floorCoordsInput = el("floorCoordsInput");
const applyFloorCoordsBtn = el("applyFloorCoordsBtn");
const copyFloorCoordsBtn = el("copyFloorCoordsBtn");

// New: dual lists & file controls
const savedRoomListEl = el("savedRoomList");
const draftRoomListEl = el("draftRoomList");

const imageOpacityRange = el("imageOpacity");

export const state = {
	building: null,
	floorIndex: null,
	floorInfo: null,
	floorPolygon: null, // [[lon,lat], ...]
	worldOrigin: { x: 0, y: 0 },
	view: { scale: 1, panX: 0, panY: 0, rotation: 0 },

	// Draft rooms (미저장) — interactive editing target
	rooms: [], // { id, name, points: [[lon,lat],...], closed }
	activeRoomIndex: null,
	activeSavedIndex: null,

	// Saved rooms (rooms.json)
	saved: [], // { id, name, points: [[lon,lat],...], closed:true }

	mouse: { isDown: false, lastX: 0, lastY: 0, dragTarget: null, savedChanged: false, _histShiftOp: false },
	history: [],
	clipboard: null,
	image: { img: null, loaded: false, pos: { x: 0, y: 0 }, scale: 1, rotation: 0, opacity: 0.6 },

	roomIdCounter: 1
};

export function getRoom(list, index) {
	if (list === "draft") return state.rooms[index] || null;
	if (list === "saved") return state.saved[index] || null;
	return null;
}

// --- Rooms/infos bridge helpers & save timer ---
let roomsSaveTimer = null;

function ensureRoomsArrayForBuilding(bid, totLevel) {
	editInfos((infos) => {
		const b = infos[bid];
		if (!b) return infos;
		if (!Array.isArray(b.rooms)) b.rooms = [];
		while (b.rooms.length < totLevel) b.rooms.push([]);
		return infos;
	});
}

function loadSavedRoomsForCurrent() {
	state.saved = [];
	if (!state.building || state.floorIndex == null) return;
	const infosMap = getInfos();
	const b = infosMap ? infosMap[state.building] : null;
	const arr = (b && Array.isArray(b.rooms) ? b.rooms[state.floorIndex] : null) || [];
	state.saved = arr.map((r, idx) => {
		let pts = [];
		if (Array.isArray(r.polygon)) {
			if (
				r.polygon.length &&
				Array.isArray(r.polygon[0]) &&
				Array.isArray(r.polygon[0][0])
			) {
				pts = r.polygon[0];
			} else {
				pts = r.polygon;
			}
		}
		return {
			id: `s${idx + 1}`,
			name: r.name || "",
			color: r.color || "#ff9500",
			points: pts,
			closed: true
		};
	});
}

export function writeSavedBackToDB() {
	if (!state.building || state.floorIndex == null) return;
	const list = state.saved.map((r) => ({
		name: r.name || "",
		color: r.color || "#ff9500",
		polygon: Array.isArray(r.points) && r.points.length ? [r.points] : []
	}));
	editInfos((infos) => {
		const b = infos[state.building];
		if (!b) return infos;
		if (!Array.isArray(b.rooms)) b.rooms = [];
		while (b.rooms.length <= state.floorIndex) b.rooms.push([]);
		b.rooms[state.floorIndex] = list;
		return infos;
	});
	requestSaveRoomsToServer();
}

export function requestSaveRoomsToServer() {
	if (roomsSaveTimer) clearTimeout(roomsSaveTimer);
	roomsSaveTimer = setTimeout(() => {
		saveRoomsToServer();
	}, 300);
}

async function saveRoomsToServer() {
	try {
		const infosMap = getInfos();
		const res = await saveRoomsJsonFromInfos(infosMap);
		// if (!res?.ok) throw new Error("save_failed"); // 필요시 활성화
		console.log("rooms.json 서버 저장 완료");
	} catch (e) {
		console.error("rooms.json 서버 저장 실패:", e);
	}
}


function resizeCanvas() {
	const r = canvas.parentElement.getBoundingClientRect();
	canvas.width = r.width;
	canvas.height = r.height;
	draw();
}
window.addEventListener("resize", resizeCanvas);

export function getActiveOpenRoomOrNull() {
	if (state.activeRoomIndex != null) {
		const r = state.rooms[state.activeRoomIndex];
		if (r && !r.closed) return r;
	}
	for (let i = state.rooms.length - 1; i >= 0; i--) {
		if (!state.rooms[i].closed) return state.rooms[i];
	}
	return null;
}

// --- World center and transform helpers (from draw.js 사용) -------------------------

function fitViewToFloor() {
	if (!state.floorPolygon) return;
	fitViewTo(state.floorPolygon);
}

function computeFidForCurrent() {
	if (!state.floorInfo || state.floorIndex == null) return null;
	const levelNum = idRules.level(state.floorInfo.bmLevel, state.floorIndex);
	return idRules.fid(state.building, levelNum);
}

function loadFloorImage() {
	const fid = computeFidForCurrent();
	state.image.loaded = false;
	state.image.img = null;
	if (!fid) return;
	const src = `${floorplanUrl}${fid}.png`;
	const img = new Image();
	img.onload = () => {
		state.image.img = img;
		state.image.loaded = true;
		// initialize position to floor bbox center and scale to roughly fit width
		const bb = bboxOfWorld(state.floorPolygon);
		if (bb) {
			const cx = (bb.minX + bb.maxX) / 2;
			const cy = (bb.minY + bb.maxY) / 2;
			state.image.pos.x = cx;
			state.image.pos.y = cy;
			const worldW = Math.max(1e-6, bb.maxX - bb.minX);
			const targetRatio = worldW / img.width; // world units per pixel
			state.image.scale = targetRatio; // uniform world scale per image pixel
			state.image.rotation = 0;
		}
		draw();
	};
	img.onerror = () => {
		state.image.img = null;
		state.image.loaded = false;
		draw();
	};
	img.src = src;
}

function formatFloorCoords() {
	return formatCoords(state.floorPolygon, { decimals: COORD_DECIMALS, close: true });
}

export function pushHistory() {
	state.history.push({
		rooms: JSON.parse(JSON.stringify(state.rooms)),
		saved: JSON.parse(JSON.stringify(state.saved)),
		activeRoomIndex: state.activeRoomIndex,
		activeSavedIndex: state.activeSavedIndex
	});
	if (state.history.length > 100) state.history.shift();
}
export function undo() {
	if (!state.history.length) return;
	const prevSavedJSON = JSON.stringify(state.saved);
	const snap = state.history.pop();
	state.rooms = snap.rooms;
	state.saved = snap.saved || state.saved;
	state.activeRoomIndex = snap.activeRoomIndex;
	state.activeSavedIndex = snap.activeSavedIndex;
	const newSavedJSON = JSON.stringify(state.saved);
	if (prevSavedJSON !== newSavedJSON) {
		writeSavedBackToDB();
	}
	refreshSavedList();
	refreshDraftList();
	draw();
}

// ==== Loading =======================================================================
async function initBuildings() {
	// cache.updateInfos()로 buildings/rooms 통합 정보 로드
	await updateInfos();
	const infosMap = getInfos();
	const bidList = infosMap ? Object.keys(infosMap) : [];
	buildingSelect.innerHTML = "";
	for (const bid of bidList) {
	  const opt = document.createElement("option");
	  opt.value = bid;
	  const name = infosMap[bid]?.name;
	  opt.textContent = name ? `${name} (${bid})` : bid;
	  buildingSelect.appendChild(opt);
	}
	if (bidList.length) {
	  buildingSelect.value = bidList[0];
	  await onBuildingChange();
	}
}

async function onBuildingChange() {
	const bid = buildingSelect.value;
	if (!bid) return;
	state.building = bid;
	const infosMap = getInfos();
	state.floorInfo = infosMap ? infosMap[bid] : null;
	if (!state.floorInfo) return;
	state.floorInfo.lvCount = state.floorInfo.flLevel + state.floorInfo.bmLevel;
	floorSelect.innerHTML = "";
	for (let i = 0; i < state.floorInfo.lvCount; i++) {
		const levelNum = idRules.level(state.floorInfo.bmLevel, i);
		const opt = document.createElement("option");
		opt.value = String(i);
		opt.textContent = levelNum > 0 ? `${levelNum}F` : `B${-levelNum}`;
		floorSelect.appendChild(opt);
	}
	// rooms.json 보장 및 로드
	ensureRoomsArrayForBuilding(bid, state.floorInfo.lvCount);
	floorSelect.value = "0";
	await onFloorChange();
}

async function onFloorChange() {
	if (!state.floorInfo) return;
	const idx = parseInt(floorSelect.value, 10);
	if (Number.isNaN(idx)) return;
	state.floorIndex = idx;
	const { flList, flVars } = state.floorInfo;
	const flVarIndex = flList[idx];
	let poly = flVars[flVarIndex];
	// Allow either [[lon,lat], ...] or [[[lon,lat], ...], ...] (GeoJSON Polygon)
	if (
		Array.isArray(poly) &&
		poly.length &&
		Array.isArray(poly[0]) &&
		Array.isArray(poly[0][0])
	) {
		// Take outer ring
		poly = poly[0];
	}
	state.floorPolygon = poly;
	loadFloorImage();
	fitViewToFloor();

	// reset drafts and load saved
	state.rooms = [];
	state.activeRoomIndex = null;
	state.activeSavedIndex = null;
	state.history = [];
	loadSavedRoomsForCurrent();

	refreshFloorInput();
	refreshSavedList();
	refreshDraftList();
	draw();
}

// ==== Floor: input/output shared helpers ============================================
function refreshFloorInput() {
	floorCoordsInput.value = formatFloorCoords();
}

function applyManualFloorCoords() {
	const t = floorCoordsInput.value.trim();
	if (!t) return;
	try {
		const arr = JSON.parse(t);
		if (!Array.isArray(arr) || !arr.length) return;
		state.floorPolygon = arr;
		fitViewToFloor();
		draw();
	} catch (e) {
		console.error("수동 층 폴리곤 파싱 실패:", e);
	}
}

async function copyFloorCoords() {
	const text = formatFloorCoords();
	try {
		await navigator.clipboard.writeText(text);
	} catch (e) {
		console.error("클립보드 복사 실패", e);
	}
}

// ==== Rooms (Drafts) ================================================================
export function getOrCreateActiveOpenDraft() {
	if (state.activeRoomIndex != null) {
		const r = state.rooms[state.activeRoomIndex];
		if (r && !r.closed) return r;
	}
	for (let i = state.rooms.length - 1; i >= 0; i--) {
		if (!state.rooms[i].closed) {
			state.activeRoomIndex = i;
			return state.rooms[i];
		}
	}
	const room = { id: state.roomIdCounter++, name: "", color: "#007aff", points: [], closed: false };
	state.rooms.push(room);
	state.activeRoomIndex = state.rooms.length - 1;
	refreshDraftList();
	return room;
}
export function closeActiveRoom() {
	if (state.activeRoomIndex == null) return;
	const r = state.rooms[state.activeRoomIndex];
	if (!r || r.closed || r.points.length < 3) return;
	pushHistory();
	r.closed = true;
	refreshDraftList();
	draw();
}
export function deleteDraft(index) {
	if (index < 0 || index >= state.rooms.length) return;
	pushHistory();
	state.rooms.splice(index, 1);
	if (state.activeRoomIndex === index) state.activeRoomIndex = null;
	else if (state.activeRoomIndex > index) state.activeRoomIndex -= 1;
	refreshDraftList();
	draw();
}
export function setActiveDraft(index) {
	setActiveRoom("draft", index);
}

// ==== Saved / Draft list rendering & actions =======================================
export function setActiveRoom(list, index) {
	if (list === "draft") {
		if (index < 0 || index >= state.rooms.length) return;
		state.activeRoomIndex = index;
		state.activeSavedIndex = null;
	} else if (list === "saved") {
		if (index < 0 || index >= state.saved.length) return;
		state.activeSavedIndex = index;
		state.activeRoomIndex = null;
	} else {
		return;
	}
	refreshSavedList();
	refreshDraftList();
	draw();
}

export function refreshSavedList() {
	savedRoomListEl.innerHTML = "";
	state.saved.forEach((room, idx) => {
		const div = document.createElement("div");
		div.className = "room-item";
		if (idx === state.activeSavedIndex) div.classList.add("active");
		const header = document.createElement("div");
		header.className = "room-header";

		const left = document.createElement("div");
		left.className = "left";
		const nameInput = document.createElement("input");
		nameInput.className = "room-name";
		nameInput.placeholder = "이름";
		nameInput.value = room.name || "";
		nameInput.addEventListener("change", () => {
			room.name = nameInput.value.trim();
			writeSavedBackToDB();
		});

		const colorInput = document.createElement("input");
		colorInput.type = "color";
		colorInput.className = "room-color";
		colorInput.value = room.color || "#ff9500";
		colorInput.addEventListener("change", () => {
			pushHistory();
			room.color = colorInput.value;
			writeSavedBackToDB();
			draw();
		});

		const title = document.createElement("span");
		title.textContent = `저장 ${idx + 1}`;
		left.append(title, nameInput, colorInput);

		const actions = document.createElement("div");
		actions.className = "actions";
		const toDraft = document.createElement("button");
		toDraft.textContent = "빼기";
		toDraft.onclick = () => {
			const r = state.saved.splice(idx, 1)[0];
			writeSavedBackToDB();
			const draft = {
				id: state.roomIdCounter++,
				name: r.name || "",
				color: r.color || "#007aff",
				points: r.points.map((p) => [p[0], p[1]]),
				closed: true
			};
			state.rooms.push(draft);
			refreshSavedList();
			refreshDraftList();
			draw();
		};
		const del = document.createElement("button");
		del.textContent = "삭제";
		del.onclick = () => {
			state.saved.splice(idx, 1);
			writeSavedBackToDB();
			refreshSavedList();
			draw();
		};
		const copy = document.createElement("button");
		copy.textContent = "좌표 복사";
		copy.onclick = async () => {
			const text = formatCoords(room.points, { decimals: COORD_DECIMALS, close: true });
			try {
				await navigator.clipboard.writeText(text);
			} catch (e) {
				console.error("클립보드 복사 실패", e);
			}
		};

		actions.append(toDraft, del, copy);
		header.append(left, actions);
		div.appendChild(header);

		const pre = document.createElement("pre");
		pre.className = "room-coords";
		pre.textContent = formatCoords(room.points, { decimals: COORD_DECIMALS, close: true });
		div.appendChild(pre);

		div.addEventListener("click", function (event) {
			if (event.target.tagName === "BUTTON" || event.target.tagName === "INPUT") return;
			setActiveRoom("saved", idx);
		});

		savedRoomListEl.appendChild(div);
	});
}

export function refreshDraftList() {
	draftRoomListEl.innerHTML = "";
	state.rooms.forEach((room, idx) => {
		const div = document.createElement("div");
		div.className = "room-item";
		if (idx === state.activeRoomIndex) div.classList.add("active");
		const header = document.createElement("div");
		header.className = "room-header";

		const left = document.createElement("div");
		left.className = "left";
		const title = document.createElement("span");
		title.textContent = `작업 ${idx + 1} (id:${room.id})`;
		const nameInput = document.createElement("input");
		nameInput.className = "room-name";
		nameInput.placeholder = "이름";
		nameInput.value = room.name || "";
		nameInput.addEventListener("change", () => {
			room.name = nameInput.value.trim();
		});

		const colorInput = document.createElement("input");
		colorInput.type = "color";
		colorInput.className = "room-color";
		colorInput.value = room.color || "#007aff";
		colorInput.addEventListener("change", () => {
			pushHistory();
			room.color = colorInput.value;
			refreshDraftList();
			draw();
		});

		left.append(title, nameInput, colorInput);

		const actions = document.createElement("div");
		actions.className = "actions";
		const save = document.createElement("button");
		save.textContent = "저장";
		save.onclick = () => {
			const r = state.rooms[idx];
			if (!r || r.points.length < 3) return;
			let name = (r.name || "").trim();
			if (!name) {
				const input = window.prompt("방 이름을 입력하세요:", "");
				if (input === null) return; // cancelled
				name = input.trim();
				if (!name) return;
				r.name = name;
				nameInput.value = name;
			}
			const savedEntry = {
				id: `s${Date.now()}_${idx}`,
				name,
				color: r.color || "#ff9500",
				points: r.points,
				closed: true
			};
			state.saved.push(savedEntry);
			writeSavedBackToDB();
			deleteDraft(idx);
			refreshSavedList();
			draw();
		};
		const del = document.createElement("button");
		del.textContent = "삭제";
		del.onclick = () => deleteDraft(idx);
		const copy = document.createElement("button");
		copy.textContent = "좌표 복사";
		copy.onclick = async () => {
			const text = formatCoords(room.points, { decimals: COORD_DECIMALS, close: true });
			try {
				await navigator.clipboard.writeText(text);
			} catch (e) {
				console.error("클립보드 복사 실패", e);
			}
		};

		actions.append(save, del, copy);
		header.append(left, actions);
		div.appendChild(header);

		const pre = document.createElement("pre");
		pre.className = "room-coords";
		pre.textContent = formatCoords(room.points, { decimals: COORD_DECIMALS, close: true });
		div.appendChild(pre);

		// Add click handler to select/activate draft room
		div.addEventListener("click", function (event) {
			if (event.target.tagName === "BUTTON" || event.target.tagName === "INPUT") return;
			setActiveDraft(idx);
		});

		draftRoomListEl.appendChild(div);
	});
}

// ==== Init ==========================================================================
function bind() {
	buildingSelect.addEventListener("change", onBuildingChange);
	floorSelect.addEventListener("change", onFloorChange);
	applyFloorCoordsBtn.addEventListener("click", applyManualFloorCoords);
	copyFloorCoordsBtn.addEventListener("click", copyFloorCoords);

	imageOpacityRange.addEventListener("input", () => {
		const v = Number(imageOpacityRange.value) || 0;
		state.image.opacity = Math.max(0, Math.min(1, v / 100));
		draw();
	});

	canvas.addEventListener("mousedown", onMouseDown);
	canvas.addEventListener("mousemove", onMouseMove);
	canvas.addEventListener("wheel", onWheel, { passive: false });
	canvas.addEventListener("contextmenu", (e) => e.preventDefault());

	window.addEventListener("mouseup", onMouseUp);
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
}

async function init() {
	initDraw(canvas, state);
	resizeCanvas();
	bind();
	await initBuildings();
}
init();