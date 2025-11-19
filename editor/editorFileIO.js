// fileIO.js: rooms.json 입출력 및 서버 저장 관련 모듈
import { CONFIG } from "../scripts/js/config.js";

let stateRef = null;
let refreshSavedList = () => {};
let refreshDraftList = () => {};
let drawRef = () => {};

let roomsSaveTimer = null;

export function initFileIO(state, callbacks) {
  stateRef = state;
  refreshSavedList = callbacks.refreshSavedList || (() => {});
  refreshDraftList = callbacks.refreshDraftList || (() => {});
  drawRef = callbacks.draw || (() => {});
}

export async function loadRoomsDB() {
  try {
    const res = await fetch(CONFIG.campus.roomsUrl);
    const data = await res.json();
    stateRef.roomsDB = data || {};
  } catch (e) {
    console.error("rooms.json 로드 실패:", e);
    stateRef.roomsDB = {};
  }
}

export function ensureRoomsArrayForBuilding(bid, totLevel) {
  if (!stateRef.roomsDB) stateRef.roomsDB = {};
  if (!Array.isArray(stateRef.roomsDB[bid])) stateRef.roomsDB[bid] = [];
  // pad to totLevel with empty arrays
  while (stateRef.roomsDB[bid].length < totLevel) stateRef.roomsDB[bid].push([]);
}

export function loadSavedRoomsForCurrent() {
  stateRef.saved = [];
  if (!stateRef.roomsDB || !stateRef.building || stateRef.floorIndex == null) return;
  const arr = stateRef.roomsDB[stateRef.building]?.[stateRef.floorIndex] || [];
  stateRef.saved = arr.map((r, idx) => ({
    id: `s${idx + 1}`,
    name: r.name || "",
    color: r.color || "#ff9500",
    points: Array.isArray(r.polygon) ? r.polygon : [],
    closed: true
  }));
}

export function writeSavedBackToDB() {
  if (!stateRef.roomsDB || !stateRef.building || stateRef.floorIndex == null) return;
  stateRef.roomsDB[stateRef.building][stateRef.floorIndex] = stateRef.saved.map((r) => ({
    name: r.name || "",
    color: r.color || "#ff9500",
    polygon: r.points
  }));
}

export function requestSaveRoomsToServer() {
  if (roomsSaveTimer) clearTimeout(roomsSaveTimer);
  roomsSaveTimer = setTimeout(() => {
    saveRoomsToServer();
  }, 300);
}

async function saveRoomsToServer() {
  try {
    writeSavedBackToDB(); // state.saved → state.roomsDB 반영
    const res = await fetch(CONFIG.campus.roomsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stateRef.roomsDB)
    });
    if (!res.ok) throw new Error("save_failed");
    console.log("rooms.json 서버 저장 완료");
  } catch (e) {
    console.error("rooms.json 서버 저장 실패:", e);
  }
}