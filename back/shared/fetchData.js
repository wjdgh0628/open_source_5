import { jsonProp, idRules, setApiUrl } from './rules.js';
async function fetchJson(path) {
	console.log(`Fetching JSON from: ${path}`);
	return await fetch(path)
		.then(response => response.json())
		.then(data => {
			// console.log(data);
			return data;
		})
		.catch(err => { console.error("파일 불러오기 실패:", err); return false; });
}
export async function fetchBuildingsInfo(buildingsPath, roomsPath) {
	const features = (await fetchJson(buildingsPath)).features;
	const rooms = await fetchJson(roomsPath);
	let res = {};
	for (const feature of features) {
		if (feature.properties.origin) continue;
		const p = feature.properties;
		const bid = p[jsonProp.id];
		const room = rooms[bid] || [];
		/* room.forEach((f, lvI) => {
			f.forEach((r, index) => {
				r.rid = idRules.rid(bid, lvI, index);
			});
		}); */
		const props = {
			bid: bid,
			name: p[jsonProp.name],
			center: p[jsonProp.center],
			bearing: p[jsonProp.bearing],
			floorBearing: p[jsonProp.floorBearing],
			flLevel: p[jsonProp.floors][jsonProp.flProps.flLevel],
			bmLevel: p[jsonProp.floors][jsonProp.flProps.bmLevel],
			lvCount: p[jsonProp.floors][jsonProp.flProps.flLevel] + p[jsonProp.floors][jsonProp.flProps.bmLevel],
			flList: p[jsonProp.floors][jsonProp.flProps.flList],
			flVars: p[jsonProp.floors][jsonProp.flProps.flVars],
			rooms: room
		};
		res[bid] = props;
	}
	console.log("fetchBuildingsInfo result:", res);
	return res;
}
// Rooms DB I/O (unified here for reuse)
export async function fetchRoomsDB(path) {
	const urls = setApiUrl("../");
	const target = path || urls.roomsUrl;
	const data = await fetchJson(target);
	return data || {};
}
export async function saveRoomsDB(data, path) {
	const urls = setApiUrl("../");
	const target = path || urls.roomsUrl;
	try {
		const res = await fetch(target, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data)
		});
		return res; // caller may check res.ok
	} catch (e) {
		console.error("rooms.json 저장 실패:", e);
		throw e; // 필요시 호출부에서 주석처리 가능
	}
}

// Build minimal rooms.json payload from infos
function buildRoomsJsonFromInfos(infos) {
	const out = {};
	if (!infos) return out;
	for (const bid of Object.keys(infos)) {
		const b = infos[bid];
		// const {rid, ...rest} = b.rooms;
		out[bid] = Array.isArray(b.rooms) ? b.rooms : [];
	}
	return out;
}

// Save rooms.json based on current infos
export async function saveRoomsJsonFromInfos(infos, path) {
	const urls = setApiUrl("../");
	const target = path || urls.roomsUrl;
	const payload = buildRoomsJsonFromInfos(infos);
	const res = await fetch(target, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload)
	});
	return res;
}