import { CONFIG, searchBasicInfoByBid, searchFloorInfoByBid, current as currentConfig } from "./utils.js";

// ==== Constants & Shared Helpers =====================================================
const COORD_DECIMALS = 8;
const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

// Platform helpers for modifier key (Cmd/Ctrl abstraction)
const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modDown = (e) => isMac ? e.metaKey : e.ctrlKey;

const el = (id) => document.getElementById(id);
const buildingSelect = el("buildingSelect");
const floorSelect = el("floorSelect");
const floorCoordsInput = el("floorCoordsInput");
const applyFloorCoordsBtn = el("applyFloorCoordsBtn");
const copyFloorCoordsBtn = el("copyFloorCoordsBtn");

// New: dual lists & file controls
const savedRoomListEl = el("savedRoomList");
const draftRoomListEl = el("draftRoomList");
const saveRoomsBtn = el("saveRoomsBtn");
const reloadRoomsBtn = el("reloadRoomsBtn");

const imageModeBtn = el("imageModeBtn");
const imageOpacityRange = el("imageOpacity");

const state = {
  building: null,
  floorIndex: null,
  floorInfo: null,
  floorPolygon: null, // [[lon,lat], ...]
  worldOrigin: { x: 0, y: 0 },
  view: { scale: 1, panX: 0, panY: 0, rotation: 0 },

  // Draft rooms (미저장) — interactive editing target
  rooms: [], // { id, name, points: [[lon,lat],...], closed }
  activeRoomIndex: null,

  // Saved rooms (rooms.json)
  saved: [], // { id, name, points: [[lon,lat],...], closed:true }

  // Persisted DB (rooms.json content)
  roomsDB: null,

  mouse: { isDown:false, button:0, lastX:0, lastY:0, dragTarget:null },
  history: [],
  imageMode: false,
  image: { img:null, loaded:false, pos:{x:0,y:0}, scale:1, rotation:0, opacity:0.6 },
};
let roomIdCounter = 1;

function resizeCanvas(){
  const r = canvas.parentElement.getBoundingClientRect();
  canvas.width = r.width; canvas.height = r.height; draw();
}
window.addEventListener("resize", resizeCanvas);

// Affine world<-&->screen with rotation
function worldToScreen(wx, wy){
  const { scale, panX, panY, rotation } = state.view;
  const { x:ox, y:oy } = state.worldOrigin;
  const cx = canvas.width/2, cy = canvas.height/2;
  const dx = wx - ox; const dy = wy - oy;
  const cos = Math.cos(rotation), sin = Math.sin(rotation);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return { x: cx + panX + rx*scale, y: cy + panY - ry*scale };
}
function screenToWorld(sx, sy){
  const { scale, panX, panY, rotation } = state.view;
  const { x:ox, y:oy } = state.worldOrigin;
  const cx = canvas.width/2, cy = canvas.height/2;
  const rx = (sx - cx - panX)/scale;
  const ry = -(sy - cy - panY)/scale;
  const cos = Math.cos(rotation), sin = Math.sin(rotation);
  const dx = rx * cos + ry * sin;      // R(-theta)
  const dy = -rx * sin + ry * cos;
  return [ ox + dx, oy + dy ];
}
function getActiveOpenRoomOrNull(){
  if(state.activeRoomIndex!=null){
    const r = state.rooms[state.activeRoomIndex];
    if(r && !r.closed) return r;
  }
  for(let i=state.rooms.length-1;i>=0;i--) if(!state.rooms[i].closed) return state.rooms[i];
  return null;
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

function computeFidForCurrent(){
  if(!state.floorInfo || state.floorIndex==null) return null;
  const levelNum = CONFIG.idRules.level(state.floorInfo.bmLevel, state.floorIndex);
  return CONFIG.idRules.fid(state.building, levelNum);
}

function loadFloorImage(){
  const fid = computeFidForCurrent();
  state.image.loaded = false; state.image.img = null;
  if(!fid) return;
  const src = `${CONFIG.campus.floorplanUrl}${fid}.png`;
  const img = new Image();
  img.onload = () => {
    state.image.img = img; state.image.loaded = true;
    // initialize position to floor bbox center and scale to roughly fit width
    const bb = bboxOf(state.floorPolygon);
    const cx = (bb.minX+bb.maxX)/2, cy=(bb.minY+bb.maxY)/2; state.image.pos.x=cx; state.image.pos.y=cy;
    const worldW = Math.max(1e-6, (bb.maxX - bb.minX));
    const targetRatio = worldW / img.width; // world units per pixel
    state.image.scale = targetRatio; // uniform world scale per image pixel
    state.image.rotation = 0;
    draw();
  };
  img.onerror = () => { state.image.img = null; state.image.loaded=false; draw(); };
  img.src = src;
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
  refreshDraftList(); draw();
}

// ==== rooms.json I/O ===============================================================
async function loadRoomsDB(){
  try{
    const res = await fetch(CONFIG.campus.roomsUrl);
    const data = await res.json();
    state.roomsDB = data || {};
  }catch(e){
    console.error("rooms.json 로드 실패:", e);
    state.roomsDB = {};
  }
}
function ensureRoomsArrayForBuilding(bid, totLevel){
  if(!state.roomsDB) state.roomsDB = {};
  if(!Array.isArray(state.roomsDB[bid])) state.roomsDB[bid] = [];
  // pad to totLevel with empty arrays
  while(state.roomsDB[bid].length < totLevel) state.roomsDB[bid].push([]);
}
function ensureClosed(points){
  if(!points || points.length<3) return points||[];
  const [fx,fy] = points[0]; const [lx,ly] = points[points.length-1];
  if(fx===lx && fy===ly) return points;
  return [...points, [fx,fy]];
}
function loadSavedRoomsForCurrent(){
  state.saved = [];
  if(!state.roomsDB || !state.building || state.floorIndex==null) return;
  const arr = state.roomsDB[state.building]?.[state.floorIndex] || [];
  state.saved = arr.map((r, idx)=>({
    id: `s${idx+1}`,
    name: r.name || "",
    points: Array.isArray(r.polygon) ? r.polygon : [],
    closed: true
  }));
}
function writeSavedBackToDB(){
  if(!state.roomsDB || !state.building || state.floorIndex==null) return;
  state.roomsDB[state.building][state.floorIndex] = state.saved.map(r=>({
    name: r.name || "",
    polygon: ensureClosed(r.points)
  }));
}
/* function downloadRoomsJSON(){
  if(!state.roomsDB) return;
  const blob = new Blob([JSON.stringify(state.roomsDB, null, 4)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "rooms.json";
  document.body.appendChild(a);
  a.click();
  requestAnimationFrame(()=>{ URL.revokeObjectURL(a.href); a.remove(); });
} */

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
  // rooms.json 보장 및 로드
  ensureRoomsArrayForBuilding(bid, state.floorInfo.totLevel);
  floorSelect.value = "0"; await onFloorChange();
}

async function onFloorChange(){
  if(!state.floorInfo) return;
  const idx = parseInt(floorSelect.value,10); if(Number.isNaN(idx)) return;
  state.floorIndex = idx;
  const { flList, flVars } = state.floorInfo; const flVarIndex = flList[idx];
  state.floorPolygon = flVars[flVarIndex];
  loadFloorImage();
  fitViewTo(state.floorPolygon);

  // reset drafts and load saved
  state.rooms = []; state.activeRoomIndex = null; state.history = [];
  loadSavedRoomsForCurrent();

  refreshFloorInput(); refreshSavedList(); refreshDraftList(); draw();
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

// ==== Rooms (Drafts) ================================================================
function getOrCreateActiveOpenDraft(){
  if(state.activeRoomIndex!=null){ const r = state.rooms[state.activeRoomIndex]; if(r && !r.closed) return r; }
  for(let i=state.rooms.length-1;i>=0;i--) if(!state.rooms[i].closed){ state.activeRoomIndex=i; return state.rooms[i]; }
  const room = { id: roomIdCounter++, name:"", points: [], closed:false };
  state.rooms.push(room); state.activeRoomIndex = state.rooms.length-1;
  refreshDraftList(); return room;
}
function closeActiveRoom(){
  if(state.activeRoomIndex==null) return; const r = state.rooms[state.activeRoomIndex]; if(!r || r.closed || r.points.length<3) return;
  pushHistory(); r.closed = true; refreshDraftList(); draw();
}
function deleteDraft(index){
  if(index<0 || index>=state.rooms.length) return; pushHistory();
  state.rooms.splice(index,1);
  if(state.activeRoomIndex===index) state.activeRoomIndex=null; else if(state.activeRoomIndex>index) state.activeRoomIndex-=1;
  refreshDraftList(); draw();
}
function setActiveDraft(index){ if(index<0 || index>=state.rooms.length) return; state.activeRoomIndex=index; refreshDraftList(); draw(); }

// ==== Saved / Draft list rendering & actions =======================================
function refreshSavedList(){
  savedRoomListEl.innerHTML = "";
  state.saved.forEach((room, idx)=>{
    const div = document.createElement("div"); div.className = "room-item";
    const header = document.createElement("div"); header.className = "room-header";

    const left = document.createElement("div"); left.className = "left";
    const nameInput = document.createElement("input"); nameInput.className="room-name"; nameInput.placeholder="이름"; nameInput.value = room.name||"";
    nameInput.addEventListener("change", ()=>{ room.name = nameInput.value.trim(); writeSavedBackToDB(); });

    const title = document.createElement("span"); title.textContent = `저장 ${idx+1}`;
    left.append(title, nameInput);

    const actions = document.createElement("div"); actions.className = "actions";
    const toDraft = document.createElement("button"); toDraft.textContent = "빼기";
    toDraft.onclick = ()=>{
      const r = state.saved.splice(idx,1)[0];
      writeSavedBackToDB();
      const draft = { id: roomIdCounter++, name: r.name||"", points: r.points.map(p=>[p[0],p[1]]), closed:true };
      state.rooms.push(draft);
      refreshSavedList(); refreshDraftList(); draw();
    };
    const del = document.createElement("button"); del.textContent = "삭제";
    del.onclick = ()=>{
      state.saved.splice(idx,1); writeSavedBackToDB(); refreshSavedList(); draw();
    };
    const copy = document.createElement("button"); copy.textContent = "좌표 복사";
    copy.onclick = async ()=>{ await copyText(formatCoords(room.points, {decimals:COORD_DECIMALS, close:true})); };

    actions.append(toDraft, del, copy);
    header.append(left, actions);
    div.appendChild(header);

    const pre = document.createElement("pre"); pre.className = "room-coords";
    pre.textContent = formatCoords(room.points, {decimals:COORD_DECIMALS, close:true});
    div.appendChild(pre);

    savedRoomListEl.appendChild(div);
  });
}

function refreshDraftList(){
  draftRoomListEl.innerHTML = "";
  state.rooms.forEach((room, idx)=>{
    const div = document.createElement("div"); div.className = "room-item"; if(idx===state.activeRoomIndex) div.classList.add("active");
    const header = document.createElement("div"); header.className = "room-header";

    const left = document.createElement("div"); left.className = "left";
    const title = document.createElement("span"); title.textContent = `작업 ${idx+1} (id:${room.id})`;
    const nameInput = document.createElement("input"); nameInput.className="room-name"; nameInput.placeholder="이름"; nameInput.value = room.name||"";
    nameInput.addEventListener("change", ()=>{ room.name = nameInput.value.trim(); });

    left.append(title, nameInput);

    const actions = document.createElement("div"); actions.className = "actions";
    const sel = document.createElement("button"); sel.textContent = "선택"; sel.onclick = ()=>setActiveDraft(idx);
    const save = document.createElement("button"); save.textContent = "저장";
    save.onclick = ()=>{
      const r = state.rooms[idx];
      if(!r || r.points.length<3) return;
      const savedEntry = { id:`s${Date.now()}_${idx}`, name:r.name||"", points: ensureClosed(r.points), closed:true };
      state.saved.push(savedEntry);
      writeSavedBackToDB();
      deleteDraft(idx);
      refreshSavedList(); draw();
    };
    const del = document.createElement("button"); del.textContent = "삭제"; del.onclick = ()=>deleteDraft(idx);
    const copy = document.createElement("button"); copy.textContent = "좌표 복사"; copy.onclick = async ()=>{ await copyText(formatCoords(room.points, {decimals:COORD_DECIMALS, close:true})); };

    actions.append(sel, save, del, copy);
    header.append(left, actions);
    div.appendChild(header);

    const pre = document.createElement("pre"); pre.className = "room-coords";
    pre.textContent = formatCoords(room.points, {decimals:COORD_DECIMALS, close:true});
    div.appendChild(pre);

    draftRoomListEl.appendChild(div);
  });
}

// ==== Draw (all in screen space) =====================================================
function draw(){
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!state.floorPolygon) return;

  // Floor
  const floorScreen = toScreenPath(state.floorPolygon);
  drawPathScreen(floorScreen, true);
  ctx.lineWidth = 1; ctx.strokeStyle = "#008000"; ctx.fillStyle = "rgba(0,128,0,.05)"; ctx.fill(); ctx.stroke();

  // Saved Rooms (display-only)
  state.saved.forEach((room)=>{
    if(!room.points.length) return;
    const screenPts = toScreenPath(room.points);
    drawPathScreen(screenPts, true);
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#555"; ctx.fillStyle = "rgba(0,0,0,.05)"; ctx.fill(); ctx.stroke();
  });

  // Draft Rooms (editable)
  state.rooms.forEach((room, idx)=>{
    if(!room.points.length) return;
    const screenPts = toScreenPath(room.points);
    drawPathScreen(screenPts, room.closed);
    const active = idx===state.activeRoomIndex; ctx.lineWidth = active? 2: 1.5; ctx.strokeStyle = active? "#007aff":"#e53935"; ctx.stroke();
    if(room.closed){ ctx.fillStyle = "rgba(0,122,255,.08)"; ctx.fill(); }
  });

  // Draft vertices only
  state.rooms.forEach((room, idx)=>{
    const active = idx===state.activeRoomIndex;
    room.points.forEach(([wx,wy])=>{
      const s = worldToScreen(wx,wy); ctx.beginPath(); ctx.arc(s.x,s.y, active?4:3, 0, Math.PI*2); ctx.fillStyle = active?"#007aff":"#e53935"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
    });
  });

  // Floorplan Image Overlay (on top of polygons)
  if(state.image.loaded && state.image.img){
    const img = state.image.img; const im = state.image;
    ctx.save();
    const { scale, panX, panY, rotation } = state.view;
    const { x:ox, y:oy } = state.worldOrigin;
    const cx = canvas.width/2, cy = canvas.height/2;
    ctx.translate(cx + panX, cy + panY);
    ctx.scale(scale, -scale); // flip Y to match world coords
    ctx.rotate(rotation);
    ctx.translate(im.pos.x - ox, im.pos.y - oy);
    ctx.rotate(im.rotation);
    ctx.scale(im.scale, im.scale);
    ctx.globalAlpha = im.opacity;
    ctx.drawImage(img, -img.width/2, -img.height/2);
    ctx.restore();
  }
}

// Only draft vertices are draggable/selectable
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

// ==== Input (mouse/keyboard) ========================================================
function onMouseDown(e){
  const r = canvas.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top;
  if(state.imageMode){
    state.mouse.isDown=true; state.mouse.button=e.button; state.mouse.lastX=x; state.mouse.lastY=y; state.mouse.dragTarget=null;
    if(e.button===0){ state.mouse.dragTarget = { type:"img-pan" }; }
    else if(e.button===2){ state.mouse.dragTarget = { type:"img-rotate" }; }
    return; // do not fall through to normal handlers
  }
  state.mouse.isDown=true; state.mouse.button=e.button; state.mouse.lastX=x; state.mouse.lastY=y; state.mouse.dragTarget=null;

  if(e.button===0){
    const hit = findNearestVertex(x,y);
    if(modDown(e)){
      // Modifier (Cmd/Ctrl) + Left: add point
      const wpt = screenToWorld(x,y);
      pushHistory();
      const room = getOrCreateActiveOpenDraft();
      room.points.push(wpt);
      refreshDraftList(); draw();
    } else if(hit){
      // Left on a vertex: drag that vertex
      pushHistory();
      state.mouse.dragTarget = { type:"point", roomIndex:hit.roomIndex, pointIndex:hit.pointIndex };
    } else {
      // Left on empty space: pan view
      state.mouse.dragTarget = { type:"pan" };
    }
  } else if(e.button===2){
    // Right-drag: rotate view around mouse anchor
    const [wx, wy] = screenToWorld(x, y);
    state.mouse.dragTarget = { type:"rotate", anchorWorld:[wx,wy], anchorScreen:{x, y} };
  }
}

function onMouseMove(e){
  if(!state.mouse.isDown) return; const r = canvas.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top;
  const dx = x - state.mouse.lastX; const dy = y - state.mouse.lastY;
  const t = state.mouse.dragTarget;
  if(t){
    if(t.type==="img-pan"){
      // translate image in world space based on mouse movement
      const [wx1, wy1] = screenToWorld(state.mouse.lastX, state.mouse.lastY);
      const [wx2, wy2] = screenToWorld(x, y);
      state.image.pos.x += (wx2 - wx1);
      state.image.pos.y += (wy2 - wy1);
      draw();
    } else if(t.type==="img-rotate"){
      const sensitivity = 0.005; // radians per pixel, horizontal drag
      state.image.rotation += (x - state.mouse.lastX) * sensitivity;
      draw();
    } else if(t.type==="point"){
      const [wx,wy]=screenToWorld(x,y);
      const room = state.rooms[t.roomIndex];
      if(room && room.points[t.pointIndex]){ room.points[t.pointIndex][0]=wx; room.points[t.pointIndex][1]=wy; refreshDraftList(); }
      draw();
    } else if(t.type==="pan"){
      state.view.panX += dx; state.view.panY += dy; // screen-space pan
      draw();
    } else if(t.type==="rotate"){
      const sensitivity = 0.005; // radians per pixel
      const prevRot = state.view.rotation;
      state.view.rotation = prevRot + dx * sensitivity; // horizontal drag rotates

      // Keep the anchor world point under the original mouse position
      const before = t.anchorScreen; // {x,y}
      const after = worldToScreen(t.anchorWorld[0], t.anchorWorld[1]);
      state.view.panX += (before.x - after.x);
      state.view.panY += (before.y - after.y);
      draw();
    }
  }
  state.mouse.lastX=x; state.mouse.lastY=y;
}

function onMouseUp(){ state.mouse.isDown=false; state.mouse.dragTarget=null; }

function onKeyDown(e){ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="z"){ e.preventDefault(); undo(); } }

function onKeyUp(e){
  if ((isMac && e.key === "Meta") || (!isMac && e.key === "Control")){
    const r = getActiveOpenRoomOrNull();
    if(r && r.points.length>=3 && state.activeRoomIndex!=null && !state.rooms[state.activeRoomIndex].closed){
      closeActiveRoom();
    }
  }
}

function onWheel(e){
  e.preventDefault();
  if(state.imageMode && state.image.loaded){
    const zoom = Math.exp(-e.deltaY * 0.002);
    state.image.scale *= zoom;
    draw();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const [wx, wy] = screenToWorld(x, y);
  const before = worldToScreen(wx, wy);
  const zoom = Math.exp(-e.deltaY * 0.002);
  state.view.scale *= zoom;
  const after = worldToScreen(wx, wy);
  state.view.panX += (before.x - after.x);
  state.view.panY += (before.y - after.y);
  draw();
}

// ==== Init ==========================================================================
function bind(){
  buildingSelect.addEventListener("change", onBuildingChange);
  floorSelect.addEventListener("change", onFloorChange);
  applyFloorCoordsBtn.addEventListener("click", applyManualFloorCoords);
  copyFloorCoordsBtn.addEventListener("click", copyFloorCoords);

  imageModeBtn.addEventListener("click", ()=>{
    state.imageMode = !state.imageMode;
    imageModeBtn.setAttribute("aria-pressed", String(state.imageMode));
    imageModeBtn.textContent = state.imageMode ? "이미지 조작 모드" : "시점 조작 모드";
  });
  imageOpacityRange.addEventListener("input", ()=>{
    const v = Number(imageOpacityRange.value)||0; state.image.opacity = Math.max(0, Math.min(1, v/100)); draw();
  });

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("wheel", onWheel, { passive:false });
  canvas.addEventListener("contextmenu", (e)=> e.preventDefault());

  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  if (reloadRoomsBtn) reloadRoomsBtn.addEventListener("click", async ()=>{
    await loadRoomsDB();
    if(state.building && state.floorInfo) ensureRoomsArrayForBuilding(state.building, state.floorInfo.totLevel);
    loadSavedRoomsForCurrent(); refreshSavedList(); draw();
  });
  if (saveRoomsBtn) saveRoomsBtn.addEventListener("click", saveRoomsToServer);
}
async function init(){ resizeCanvas(); bind(); await loadRoomsDB(); await initBuildings(); }
init();

async function saveRoomsToServer(){
  try{
    writeSavedBackToDB(); // state.saved → state.roomsDB 반영
    const res = await fetch(CONFIG.campus.roomsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.roomsDB)
    });
    if(!res.ok) throw new Error("save_failed");
    alert("rooms.json 서버 저장 완료");
  }catch(e){
    console.error(e);
    alert("서버 저장 실패 — 콘솔을 확인하세요.");
  }
}