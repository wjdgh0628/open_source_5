
import { jsonProp, idRules } from '@shared/rules.js';
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
		room.forEach((f, lvI) => {
			f.forEach((r, index) => {
				r.rid = idRules.rid(bid, lvI, index);
			});
		});
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
		}
		res[bid] = props;
	}
	// console.log("fetchBuildingsInfo result:", res);
	return res;
}