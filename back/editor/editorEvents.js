import { hitTestFilledRoom, hitTestFilledRoomByRef, screenToWorld, findNearestVertex, findNearestVertexByRef, findNearestFloorVertex, draw, getWorldCenterFromLonLatPoints, lonLatToWorld, worldToLonLat, applyTransformToLonLatPoints, worldToScreen, bboxOf } from "./editorDraw.js";
import { canvas, state, pushHistory, setActiveDraft, setActiveRoom, modDown, getOrCreateActiveOpenDraft, refreshDraftList, getRoom, refreshSavedList, refreshFloorInput, undo, deleteDraft, isMac, getActiveOpenRoomOrNull, closeActiveRoom, writeSavedBackToDB } from "./editorMain.js";

// History: snapshot once per Shift operation
function ensureHistoryStartForShiftOp(e) {
	if (!e.shiftKey) return;
	if (!state.mouse._histShiftOp) {
		pushHistory();
		state.mouse._histShiftOp = true;
	}
}

function getShiftLockedRoomRef() {
	if (state.activeRoomIndex != null) {
		return { list: "draft", roomIndex: state.activeRoomIndex };
	}
	if (state.activeSavedIndex != null) {
		return { list: "saved", roomIndex: state.activeSavedIndex };
	}
	return null;
}

// ==== Input (mouse/keyboard) ========================================================
export function onMouseDown(e) {
	const r = canvas.getBoundingClientRect();
	const x = e.clientX - r.left;
	const y = e.clientY - r.top;

	// Alt/Option + drag: image manipulation (no toggle button needed)
	if (e.altKey && state.image.loaded && state.image.img) {
		state.mouse.isDown = true;
		state.mouse.lastX = x;
		state.mouse.lastY = y;
		state.mouse.dragTarget = null;
		state.mouse.savedChanged = false;

		if (e.button === 0) {
			state.mouse.dragTarget = { type: "img-pan" };
		} else if (e.button === 2) {
			state.mouse.dragTarget = { type: "img-rotate" };
		}
		return;
	}

	state.mouse.isDown = true;
	state.mouse.lastX = x;
	state.mouse.lastY = y;
	state.mouse.dragTarget = null;
	state.mouse.savedChanged = false;

	if (state.floorEditMode) {
		if (e.button === 0) {
			const hitFloor = findNearestFloorVertex(x, y);
			if (hitFloor) {
				state.mouse.dragTarget = {
					type: "floor-point",
					pointIndex: hitFloor.pointIndex
				};
			} else {
				state.mouse.dragTarget = { type: "pan" };
			}
			return;
		}
		if (e.button === 2) {
			const cx = canvas.width / 2;
			const cy = canvas.height / 2;
			const [wx, wy] = screenToWorld(cx, cy);
			state.mouse.dragTarget = {
				type: "rotate",
				anchorWorld: [wx, wy],
				anchorScreen: { x: cx, y: cy }
			};
			return;
		}
	}

	if (e.button === 0) {
		const shiftHeld = e.shiftKey;
		const lockedRef = shiftHeld ? getShiftLockedRoomRef() : null;

		// Shift + Left: move whole room polygon when clicking on a filled room
		if (shiftHeld) {
			const hitRoom = lockedRef
				? hitTestFilledRoomByRef(x, y, lockedRef.list, lockedRef.roomIndex)
				: hitTestFilledRoom(x, y);
			if (hitRoom) {
				ensureHistoryStartForShiftOp(e);
				const [wx, wy] = screenToWorld(x, y);
				state.mouse.dragTarget = {
					type: "room-move",
					list: hitRoom.list,
					roomIndex: hitRoom.roomIndex,
					startWorld: [wx, wy],
					lastWorld: [wx, wy]
				};
				state.mouse.savedChanged = false;
				return;
			}
		}

		const hit = lockedRef
			? findNearestVertexByRef(x, y, lockedRef.list, lockedRef.roomIndex)
			: findNearestVertex(x, y);

		if (modDown(e)) {
			// Cmd/Ctrl + Left: click adds a point, drag creates a rectangular room
			const startLonLat = screenToWorld(x, y);
			state.mouse.dragTarget = {
				type: "mod-add",
				startScreen: { x, y },
				startLonLat,
				hasRect: false,
				rectRoomIndex: null
			};
			state.mouse.savedChanged = false;
			return;
		} else if (hit) {
			if (!e.shiftKey) {
				// Without Shift, do not modify polygon; fall back to panning
				state.mouse.dragTarget = { type: "pan" };
			} else {
				ensureHistoryStartForShiftOp(e);
				state.mouse.dragTarget = {
					type: "point",
					list: hit.list,
					roomIndex: hit.roomIndex,
					pointIndex: hit.pointIndex
				};
				state.mouse.savedChanged = false;
				if (!lockedRef) {
					if (hit.list === "draft") {
						setActiveDraft(hit.roomIndex);
					} else if (hit.list === "saved") {
						setActiveRoom("saved", hit.roomIndex);
					}
				}
			}
		} else {
			if (shiftHeld && lockedRef) {
				// While Shift-locking an active room, prevent selecting other rooms.
				state.mouse.dragTarget = { type: "pan" };
				return;
			}
			// Left on a filled polygon: select that room but still allow panning
			const filled = hitTestFilledRoom(x, y);
			if (filled) {
				if (filled.list === "draft") {
					setActiveDraft(filled.roomIndex);
				} else if (filled.list === "saved") {
					setActiveRoom("saved", filled.roomIndex);
				}
				// Start view panning even when clicking on a polygon
				state.mouse.dragTarget = { type: "pan" };
			} else {
				// Left on empty space: pan view
				state.mouse.dragTarget = { type: "pan" };
			}
		}
	} else if (e.button === 2) {
		// Right button
		// Shift + Right: rotate whole room polygon around its center
		if (e.shiftKey) {
			const lockedRef = getShiftLockedRoomRef();
			const hitRoom = lockedRef
				? hitTestFilledRoomByRef(x, y, lockedRef.list, lockedRef.roomIndex)
				: hitTestFilledRoom(x, y);
			if (hitRoom) {
				const room = getRoom(hitRoom.list, hitRoom.roomIndex);

				if (room && room.points && room.points.length >= 3) {
					ensureHistoryStartForShiftOp(e);

					const centerInfo = getWorldCenterFromLonLatPoints(room.points);
					if (!centerInfo) return;
					const { cx, cy, worldPts } = centerInfo;

					state.mouse.dragTarget = {
						type: "room-rotate",
						list: hitRoom.list,
						roomIndex: hitRoom.roomIndex,
						centerWorld: { cx, cy },
						baseWorldPoints: worldPts.slice(),
						totalAngle: 0
					};
					state.mouse.savedChanged = hitRoom.list === "saved";
					return;
				}
			}
		}

		// Default: rotate view around screen center (camera center)
		const cx = canvas.width / 2;
		const cy = canvas.height / 2;
		const [wx, wy] = screenToWorld(cx, cy);
		state.mouse.dragTarget = {
			type: "rotate",
			anchorWorld: [wx, wy],
			anchorScreen: { x: cx, y: cy }
		};
	}
}
export function onMouseMove(e) {
	if (!state.mouse.isDown) return;
	const r = canvas.getBoundingClientRect();
	const x = e.clientX - r.left;
	const y = e.clientY - r.top;
	const dx = x - state.mouse.lastX;
	const dy = y - state.mouse.lastY;
	const t = state.mouse.dragTarget;
	if (t) {
		if (t.type === "mod-add") {
			const distX = x - t.startScreen.x;
			const distY = y - t.startScreen.y;
			const threshold = 4; // pixels, to distinguish click vs drag
			const moved = distX * distX + distY * distY > threshold * threshold;

			if (!moved) {
				// Still treated as a click until movement exceeds threshold
				state.mouse.lastX = x;
				state.mouse.lastY = y;
				return;
			}

			// Screen-space rectangle (axis-aligned on screen regardless of view rotation/zoom)
			const sx1 = t.startScreen.x;
			const sy1 = t.startScreen.y;
			const sx2 = x;
			const sy2 = y;

			const minSX = Math.min(sx1, sx2);
			const maxSX = Math.max(sx1, sx2);
			const minSY = Math.min(sy1, sy2);
			const maxSY = Math.max(sy1, sy2);

			// Convert the 4 screen corners back to lon/lat points
			const cornersLonLat = [
				screenToWorld(minSX, minSY),
				screenToWorld(maxSX, minSY),
				screenToWorld(maxSX, maxSY),
				screenToWorld(minSX, maxSY)
			];

			// If rectangle not yet created, create a new draft room
			if (!t.hasRect) {
				pushHistory();
				const newRoom = {
					id: state.roomIdCounter++,
					name: "",
					type: "기타",
					color: "#007aff",
					points: cornersLonLat,
					holes: [],
					closed: true,
					desc: "",
					tags: []
				};
				state.rooms.push(newRoom);
				const idx = state.rooms.length - 1;
				state.activeRoomIndex = idx;
				t.rectRoomIndex = idx;
				t.hasRect = true;
			} else if (t.rectRoomIndex != null && t.rectRoomIndex >= 0 && t.rectRoomIndex < state.rooms.length) {
				const room = state.rooms[t.rectRoomIndex];
				if (room) {
					room.points = cornersLonLat;
				}
			}

			refreshDraftList();
			draw();

			state.mouse.lastX = x;
			state.mouse.lastY = y;
			return;
		}
		if (t.type === "img-pan") {
			// translate image in world space based on mouse movement
			const [lon1, lat1] = screenToWorld(state.mouse.lastX, state.mouse.lastY);
			const [lon2, lat2] = screenToWorld(x, y);
			const [wx1, wy1] = lonLatToWorld(lon1, lat1);
			const [wx2, wy2] = lonLatToWorld(lon2, lat2);
			state.image.pos.x += wx2 - wx1;
			state.image.pos.y += wy2 - wy1;
			draw();
		} else if (t.type === "img-rotate") {
			const sensitivity = 0.005; // radians per pixel, horizontal drag
			state.image.rotation += (x - state.mouse.lastX) * sensitivity;
			draw();
		} else if (t.type === "point") {
			const [wx, wy] = screenToWorld(x, y);
			const room = getRoom(t.list, t.roomIndex);
			if (room && room.points && room.points[t.pointIndex]) {
				room.points[t.pointIndex][0] = wx;
				room.points[t.pointIndex][1] = wy;
				if (t.list === "draft") {
					refreshDraftList();
				} else if (t.list === "saved") {
					state.mouse.savedChanged = true;
					refreshSavedList();
				}
			}
			draw();
		} else if (t.type === "floor-point") {
			const [wx, wy] = screenToWorld(x, y);
			if (Array.isArray(state.floorPolygon) && state.floorPolygon[t.pointIndex]) {
				state.floorPolygon[t.pointIndex][0] = wx;
				state.floorPolygon[t.pointIndex][1] = wy;
				refreshFloorInput();
				draw();
			}
		} else if (t.type === "room-move") {
			const [wx, wy] = screenToWorld(x, y);
			const last = t.lastWorld || t.startWorld;
			const dxWorld = wx - last[0];
			const dyWorld = wy - last[1];
			if (dxWorld !== 0 || dyWorld !== 0) {
				const room = getRoom(t.list, t.roomIndex);
				if (room && room.points) {
					room.points.forEach((p) => {
						p[0] += dxWorld;
						p[1] += dyWorld;
					});
					if (t.list === "draft") {
						refreshDraftList();
					} else if (t.list === "saved") {
						state.mouse.savedChanged = true;
						refreshSavedList();
					}
				}
				draw();
			}
			t.lastWorld = [wx, wy];
		} else if (t.type === "room-rotate") {
			const room = getRoom(t.list, t.roomIndex);

			if (!room || !room.points || !room.points.length || !t.baseWorldPoints || !t.centerWorld) {
				return;
			}

			const sensitivity = 0.005; // radians per pixel, match view/image
			t.totalAngle = (t.totalAngle || 0) + dx * sensitivity;
			const angle = t.totalAngle;

			room.points = applyTransformToLonLatPoints(t.baseWorldPoints, t.centerWorld, 1, angle);

			if (t.list === "draft") {
				refreshDraftList();
			} else {
				state.mouse.savedChanged = true;
				refreshSavedList();
			}
			draw();
		} else if (t.type === "pan") {
			state.view.panX += dx;
			state.view.panY += dy; // screen-space pan
			draw();
		} else if (t.type === "rotate") {
			const sensitivity = 0.005; // radians per pixel
			const prevRot = state.view.rotation;
			state.view.rotation = prevRot + dx * sensitivity; // horizontal drag rotates


			// Keep the anchor world point under the original mouse position
			const before = t.anchorScreen; // {x,y}
			const after = worldToScreen(t.anchorWorld[0], t.anchorWorld[1]);
			state.view.panX += before.x - after.x;
			state.view.panY += before.y - after.y;
			draw();
		}
	}
	state.mouse.lastX = x;
	state.mouse.lastY = y;
}
export function onMouseUp() {
	if (state.mouse.dragTarget && state.mouse.dragTarget.type === "mod-add") {
		const t = state.mouse.dragTarget;

		// If no rectangle was created, treat as a simple point-add click
		if (!t.hasRect && t.startLonLat) {
			pushHistory();
			const room = getOrCreateActiveOpenDraft();
			room.points.push(t.startLonLat);
			refreshDraftList();
			draw();
		}

		state.mouse.dragTarget = null;
		state.mouse.isDown = false;
		return;
	}
	state.mouse.isDown = false;
	state.mouse.dragTarget = null;
}
export function onKeyDown(e) {
	if (state.floorEditMode) return;
	const tag = document.activeElement && document.activeElement.tagName;
	// Don't steal shortcuts when typing in inputs/textarea
	if (tag === "INPUT" || tag === "TEXTAREA") return;

	const key = e.key.toLowerCase();

	if ((e.ctrlKey || e.metaKey) && key === "z") {
		e.preventDefault();
		undo();
	} else if ((e.ctrlKey || e.metaKey) && key === "c") {
		// Copy from active draft or saved room
		let src = null;
		if (state.activeRoomIndex != null) {
			src = { list: "draft", index: state.activeRoomIndex };
		} else if (state.activeSavedIndex != null) {
			src = { list: "saved", index: state.activeSavedIndex };
		}
		if (src) {
			let r = null;
			if (src.list === "draft") {
				r = state.rooms[src.index];
			} else if (src.list === "saved") {
				r = state.saved[src.index];
			}
			if (r && Array.isArray(r.points) && r.points.length) {
				state.clipboard = {
					name: r.name || "",
					type: (r.type && String(r.type).trim()) ? String(r.type).trim() : "기타",
					color: r.color || "#007aff",
					desc: r.desc || "",
					tags: Array.isArray(r.tags) ? r.tags.slice() : [],
					points: r.points.map((p) => [p[0], p[1]])
				};
			}
		}
	} else if ((e.ctrlKey || e.metaKey) && key === "v") {
		// Paste as new draft room, slightly offset from original
		if (!state.clipboard || !Array.isArray(state.clipboard.points) || !state.clipboard.points.length) return;
		pushHistory();
		// Offset logic: right and down by 5% of bbox, or a small value if degenerate
		const bb = bboxOf(state.clipboard.points);
		const offsetX = (bb.maxX - bb.minX) * 0.05 || 1e-5;
		const offsetY = (bb.maxY - bb.minY) * 0.05 || 1e-5;
		const newRoom = {
			id: state.roomIdCounter++,
			name: state.clipboard.name || "",
			type: (state.clipboard.type && String(state.clipboard.type).trim()) ? String(state.clipboard.type).trim() : "기타",
			color: state.clipboard.color || "#007aff",
			points: state.clipboard.points.map((p) => [p[0] + offsetX, p[1] - offsetY]),
			closed: true,
			desc: state.clipboard.desc || "",
			tags: Array.isArray(state.clipboard.tags) ? state.clipboard.tags.slice() : []
		};
		state.rooms.push(newRoom);
		state.activeRoomIndex = state.rooms.length - 1;
		refreshDraftList();
		draw();
	} else if ((e.key === "Backspace" || key === "backspace") &&
		!e.ctrlKey &&
		!e.metaKey &&
		!e.altKey &&
		!e.shiftKey) {
		e.preventDefault();
		if (state.activeRoomIndex != null) {
			// Delete currently selected draft room
			deleteDraft(state.activeRoomIndex);
			draw();
		} else if (state.activeSavedIndex != null) {
			// Delete currently selected saved room (rooms.json)
			const idx = state.activeSavedIndex;
			if (idx != null && idx >= 0 && idx < state.saved.length) {
				pushHistory();
				state.saved.splice(idx, 1);
				writeSavedBackToDB();
				state.activeSavedIndex = null;
				refreshSavedList();
				draw();
			}
		}
	}
}
export function onKeyUp(e) {
	if (e.key === "Shift") {
		state.mouse._histShiftOp = false;
		if (state.mouse.savedChanged) {
			writeSavedBackToDB();
			state.mouse.savedChanged = false;
		}
	}
	if ((isMac && e.key === "Meta") || (!isMac && e.key === "Control")) {
		const r = getActiveOpenRoomOrNull();
		if (r && r.points.length >= 3 && state.activeRoomIndex != null && !state.rooms[state.activeRoomIndex].closed) {
			closeActiveRoom();
		}
	}
}
export function onWheel(e) {
	e.preventDefault();
	const rect = canvas.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;

	// Alt/Option + wheel: image zoom
	if (e.altKey && state.image.loaded && state.image.img) {
		const zoomImg = Math.exp(-e.deltaY * 0.002);
		state.image.scale *= zoomImg;
		draw();
		return;
	}

	if (state.floorEditMode) {
		const cx = canvas.width / 2;
		const cy = canvas.height / 2;
		const [wx, wy] = screenToWorld(cx, cy);
		const before = worldToScreen(wx, wy);
		const zoom = Math.exp(-e.deltaY * 0.002);
		state.view.scale *= zoom;
		const after = worldToScreen(wx, wy);
		state.view.panX += before.x - after.x;
		state.view.panY += before.y - after.y;
		draw();
		return;
	}

	// Shift + wheel: scale room polygon under cursor
	if (e.shiftKey) {
		const lockedRef = getShiftLockedRoomRef();
		const hit = lockedRef
			? hitTestFilledRoomByRef(x, y, lockedRef.list, lockedRef.roomIndex)
			: hitTestFilledRoom(x, y);
		if (hit) {
			ensureHistoryStartForShiftOp(e);
			const room = getRoom(hit.list, hit.roomIndex);

			if (room && room.points && room.points.length) {
				const zoomRoom = Math.exp(-e.deltaY * 0.002);
				const centerInfo = getWorldCenterFromLonLatPoints(room.points);
				if (centerInfo) {
					room.points = applyTransformToLonLatPoints(centerInfo.worldPts, centerInfo, zoomRoom, 0);

					if (hit.list === "saved") {
						state.mouse.savedChanged = true;
						refreshSavedList();
					} else {
						refreshDraftList();
					}
					draw();
					return;
				}
			}
		}
	}

	// Default: view zoom around screen center (camera center)
	const cx = canvas.width / 2;
	const cy = canvas.height / 2;
	const [wx, wy] = screenToWorld(cx, cy);
	const before = worldToScreen(wx, wy);
	const zoom = Math.exp(-e.deltaY * 0.002);
	state.view.scale *= zoom;
	const after = worldToScreen(wx, wy);
	state.view.panX += before.x - after.x;
	state.view.panY += before.y - after.y;
	draw();
}
