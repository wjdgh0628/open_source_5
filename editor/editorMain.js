import { CONFIG, searchBasicInfoByBid, searchFloorInfoByBid, current as currentConfig } from "./utils.js";

// ==== Constants & Shared Helpers =====================================================
const COORD_DECIMALS = 8;
const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const el = (id) => document.getElementById(id);
const buildingSelect = el("buildingSelect");
const floorSelect = el("floorSelect");
const floorCoordsInput = el("floorCoordsInput");
const applyFloorCoordsBtn = el("applyFloorCoordsBtn");
const copyFloorCoordsBtn = el("copyFloorCoordsBtn");
const closeRoomBtn = el("closeRoomBtn");
const roomListEl = el("roomList");

const state = {
  building: null,
  floorIndex: null,
  floorInfo: null,
  floorPolygon: null, // [[lon,lat], ...]
  worldOrigin: { x: 0, y: 0 },
  view: { scale: 1, panX: 0, panY: 0 },
  rooms: [], // { id, points: [[lon,lat],...], closed }
  activeRoomIndex: null,
  mouse: { isDown:false, button:0, lastX:0, lastY:0, dragTarget:null },
  history: []
};
let roomIdCounter = 1;

function resizeCanvas(){
  const r = canvas.parentElement.getBoundingClientRect();
  canvas.width = r.width; canvas.height = r.height; draw();
}
window.addEventListener("resize", resizeCanvas);

// Affine world<->screen (no rotation)
function worldToScreen(wx, wy){
  const { scale, panX, panY } = state.view;
  const { x:ox, y:oy } = state.worldOrigin;
  const cx = canvas.width/2, cy = canvas.height/2;
  return { x: cx + panX + (wx-ox)*scale, y: cy + panY - (wy-oy)*scale };
}
function screenToWorld(sx, sy){
  const { scale, panX, panY } = state.view;
  const { x:ox, y:oy } = state.worldOrigin;
  const cx = canvas.width/2, cy = canvas.height/2;
  return [ ox + (sx - cx - panX)/scale, oy + (cy + panY - sy)/scale ];
}

function bboxOf(points){
  if (!points || !points.length) return null;
  let [minX,minY] = points[0], [maxX,maxY] = points[0];
  for(const [x,y] of points){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
  return { minX,minY,maxX,maxY };
}
function fitViewTo(points){
  const bb = bboxOf(points); if(!bb) return;
  const cx = (bb.minX+bb.maxX)/2, cy = (bb.minY+bb.maxY)/2;
  state.worldOrigin.x = cx; state.worldOrigin.y = cy;
  const w = (bb.maxX-bb.minX)||1, h = (bb.maxY-bb.minY)||1;
  const margin = 0.8;
  const sx = (canvas.width*margin)/w, sy = (canvas.height*margin)/h;
  state.view.scale = Math.min(sx, sy);
  state.view.panX = 0; state.view.panY = 0;
}

function drawPathScreen(screenPts, close=true){
  if(!screenPts.length) return;
  ctx.beginPath();
  screenPts.forEach((p,i)=> i? ctx.lineTo(p.x,p.y): ctx.moveTo(p.x,p.y));
  if(close && screenPts.length>=3) ctx.closePath();
}

function toScreenPath(worldPts){
  return worldPts.map(([x,y])=>worldToScreen(x,y));
}

function formatCoords(points, {decimals=COORD_DECIMALS, close=false}={}){
  if(!Array.isArray(points)) return "[]";
  const out = points.map(([x,y])=>[Number(x.toFixed(decimals)), Number(y.toFixed(decimals))]);
  if(close && out.length>=3) out.push(out[0]);
  return JSON.stringify(out);
}

async function copyText(text){
  try{ await navigator.clipboard.writeText(text); return true; } catch{ return false; }
}

function pushHistory(){
  state.history.push({ rooms: JSON.parse(JSON.stringify(state.rooms)), activeRoomIndex: state.activeRoomIndex });
  if (state.history.length>100) state.history.shift();
}
function undo(){
  if(!state.history.length) return;
  const snap = state.history.pop();
  state.rooms = snap.rooms; state.activeRoomIndex = snap.activeRoomIndex;
  refreshRoomList(); draw();
}

// ==== Loading =======================================================================
async function initBuildings(){
  buildingSelect.innerHTML = "";
  for(const bid of CONFIG.bidList){
    const info = await searchBasicInfoByBid(bid);
    const opt = document.createElement("option");
    opt.value = bid; opt.textContent = info?.name? `${info.name} (${bid})` : bid;
    buildingSelect.appendChild(opt);
  }
  if(CONFIG.bidList.length){ buildingSelect.value = CONFIG.bidList[0]; await onBuildingChange(); }
}

async function onBuildingChange(){
  const bid = buildingSelect.value; if(!bid) return;
  state.building = bid; currentConfig.bid = bid;
  state.floorInfo = await searchFloorInfoByBid(bid);
  floorSelect.innerHTML = "";
  if(!state.floorInfo) return;
  for(let i=0;i<state.floorInfo.totLevel;i++){
    const levelNum = CONFIG.idRules.level(state.floorInfo.bmLevel, i);
    const opt = document.createElement("option");
    opt.value = String(i); opt.textContent = levelNum>0? `${levelNum}F` : `B${-levelNum}`;
    floorSelect.appendChild(opt);
  }
  floorSelect.value = "0"; await onFloorChange();
}

async function onFloorChange(){
  if(!state.floorInfo) return;
  const idx = parseInt(floorSelect.value,10); if(Number.isNaN(idx)) return;
  state.floorIndex = idx;
  const { flList, flVars } = state.floorInfo; const flVarIndex = flList[idx];
  state.floorPolygon = flVars[flVarIndex];
  fitViewTo(state.floorPolygon);
  state.rooms = []; state.activeRoomIndex = null; state.history = [];
  refreshFloorInput(); refreshRoomList(); draw();
}

// ==== Floor: input/output shared helpers ============================================
function refreshFloorInput(){
  floorCoordsInput.value = formatCoords(state.floorPolygon, {decimals:COORD_DECIMALS, close:true});
}
function applyManualFloorCoords(){
  const t = floorCoordsInput.value.trim(); if(!t) return;
  try{
    const arr = JSON.parse(t);
    if(!Array.isArray(arr) || !arr.length) return;
    state.floorPolygon = arr; fitViewTo(state.floorPolygon); draw();
  }catch(e){ console.error("수동 층 폴리곤 파싱 실패:", e); }
}
async function copyFloorCoords(){
  const ok = await copyText(formatCoords(state.floorPolygon, {decimals:COORD_DECIMALS, close:true}));
  if(!ok) console.error("클립보드 복사 실패");
}

// ==== Rooms =========================================================================
function getOrCreateActiveOpenRoom(){
  if(state.activeRoomIndex!=null){ const r = state.rooms[state.activeRoomIndex]; if(r && !r.closed) return r; }
  for(let i=state.rooms.length-1;i>=0;i--) if(!state.rooms[i].closed){ state.activeRoomIndex=i; return state.rooms[i]; }
  const room = { id: roomIdCounter++, points: [], closed:false }; state.rooms.push(room); state.activeRoomIndex = state.rooms.length-1; refreshRoomList(); return room;
}
function closeActiveRoom(){
  if(state.activeRoomIndex==null) return; const r = state.rooms[state.activeRoomIndex]; if(!r || r.closed || r.points.length<3) return;
  pushHistory(); r.closed = true; refreshRoomList(); draw();
}
function deleteRoom(index){
  if(index<0 || index>=state.rooms.length) return; pushHistory();
  state.rooms.splice(index,1);
  if(state.activeRoomIndex===index) state.activeRoomIndex=null; else if(state.activeRoomIndex>index) state.activeRoomIndex-=1;
  refreshRoomList(); draw();
}
function setActiveRoom(index){ if(index<0 || index>=state.rooms.length) return; state.activeRoomIndex=index; refreshRoomList(); draw(); }

function refreshRoomList(){
  roomListEl.innerHTML = "";
  state.rooms.forEach((room, idx)=>{
    const div = document.createElement("div"); div.className = "room-item"; if(idx===state.activeRoomIndex) div.classList.add("active");
    const header = document.createElement("div"); header.className = "room-header";
    const title = document.createElement("span"); title.textContent = `방 ${idx+1} (id:${room.id})`;
    const actions = document.createElement("div"); actions.className = "actions";

    const sel = document.createElement("button"); sel.textContent = "선택"; sel.onclick = ()=>setActiveRoom(idx);
    const del = document.createElement("button"); del.textContent = "삭제"; del.onclick = ()=>deleteRoom(idx);
    const copy = document.createElement("button"); copy.textContent = "좌표 복사"; copy.onclick = async ()=>{ await copyText(formatCoords(room.points, {decimals:COORD_DECIMALS, close:true})); };

    actions.append(sel, del, copy); header.append(title, actions); div.appendChild(header);

    const pre = document.createElement("pre"); pre.className = "room-coords";
    pre.textContent = formatCoords(room.points, {decimals:COORD_DECIMALS, close:true});
    div.appendChild(pre);

    roomListEl.appendChild(div);
  });
}

function findNearestVertex(screenX, screenY, thresholdPx=8){
  let best=null, bestDist=Infinity;
  state.rooms.forEach((room, rIndex)=>{
    room.points.forEach((pt, pIndex)=>{
      const s = worldToScreen(pt[0], pt[1]);
      const dx=s.x-screenX, dy=s.y-screenY; const d=Math.hypot(dx,dy);
      if(d<=thresholdPx && d<bestDist){ bestDist=d; best={ roomIndex:rIndex, pointIndex:pIndex }; }
    });
  });
  return best;
}

// ==== Draw (all in screen space) =====================================================
function draw(){
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!state.floorPolygon) return;

  // Floor
  const floorScreen = toScreenPath(state.floorPolygon);
  drawPathScreen(floorScreen, true);
  ctx.lineWidth = 1; ctx.strokeStyle = "#008000"; ctx.fillStyle = "rgba(0,128,0,.05)"; ctx.fill(); ctx.stroke();

  // Rooms
  state.rooms.forEach((room, idx)=>{
    if(!room.points.length) return;
    const screenPts = toScreenPath(room.points);
    drawPathScreen(screenPts, room.closed);
    const active = idx===state.activeRoomIndex; ctx.lineWidth = active? 2: 1.5; ctx.strokeStyle = active? "#007aff":"#e53935"; ctx.stroke();
    if(room.closed){ ctx.fillStyle = "rgba(0,122,255,.08)"; ctx.fill(); }
  });

  // Vertices
  state.rooms.forEach((room, idx)=>{
    const active = idx===state.activeRoomIndex;
    room.points.forEach(([wx,wy])=>{
      const s = worldToScreen(wx,wy); ctx.beginPath(); ctx.arc(s.x,s.y, active?4:3, 0, Math.PI*2); ctx.fillStyle = active?"#007aff":"#e53935"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
    });
  });
}

// ==== Input (mouse/keyboard) ========================================================
function onMouseDown(e){
  const r = canvas.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top;
  state.mouse.isDown=true; state.mouse.button=e.button; state.mouse.lastX=x; state.mouse.lastY=y; state.mouse.dragTarget=null;
  if(e.button!==0) return;
  const hit = findNearestVertex(x,y);
  if(hit){ pushHistory(); state.mouse.dragTarget = { type:"point", roomIndex:hit.roomIndex, pointIndex:hit.pointIndex }; }
  else{ const wpt = screenToWorld(x,y); pushHistory(); const room = getOrCreateActiveOpenRoom(); room.points.push(wpt); refreshRoomList(); draw(); }
}
function onMouseMove(e){
  if(!state.mouse.isDown) return; const r = canvas.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top;
  const t = state.mouse.dragTarget; if(t && t.type==="point"){ const [wx,wy]=screenToWorld(x,y); const room = state.rooms[t.roomIndex]; if(room && room.points[t.pointIndex]){ room.points[t.pointIndex][0]=wx; room.points[t.pointIndex][1]=wy; refreshRoomList(); draw(); } }
  state.mouse.lastX=x; state.mouse.lastY=y;
}
function onMouseUp(){ state.mouse.isDown=false; state.mouse.dragTarget=null; }
function onKeyDown(e){ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="z"){ e.preventDefault(); undo(); } }

// ==== Init ==========================================================================
function bind(){
  buildingSelect.addEventListener("change", onBuildingChange);
  floorSelect.addEventListener("change", onFloorChange);
  applyFloorCoordsBtn.addEventListener("click", applyManualFloorCoords);
  copyFloorCoordsBtn.addEventListener("click", copyFloorCoords);
  closeRoomBtn.addEventListener("click", closeActiveRoom);
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("keydown", onKeyDown);
}
async function init(){ resizeCanvas(); bind(); await initBuildings(); }
init();