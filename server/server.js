import express from 'express';
import path from 'path';
import { exec } from 'child_process';

import { __dirname, PORT, idRules, SC } from './scripts/server.config.js';
import { api } from './scripts/api.js';
import { fetchAllRooms, fetchBuildingsInfo } from './scripts/fileIO.js';
// import { fetchBuildings } from '../src/scripts/sideBarUtils.js';
const app = express();

app.use('/api', api);
app.use('/editor', express.static(path.join(__dirname, 'editor')));
// app.use('/', express.static(path.join(__dirname)));

app.get("/editor", (req, res) => {
	res.redirect("/editor/editor.html");
});

function openInBrowser(url) {
	const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
	const command = process.platform === "win32" ? `${opener} "" "${url}"` : `${opener} "${url}"`;
	exec(command, (err) => {
		if (err) console.error(`Failed to open ${url}: ${err.message}`);
	});
}

export function initList() {
	// 원본 방 데이터: { [bid]: Array<Array<{ name: string, ... }>> }
	const rData = fetchAllRooms();

	// 건물 정보(name, bmLevel 등) 요청
	const req = [{ bid: SC.jsonProp.id, name: 'name' }, { bmLevel: 'bmLevel' }, {}];
	const bData = fetchBuildingsInfo(SC.bidList, req); // { [bid]: { name, bmLevel, ... } }

	const res = {};

	for (const bid of Object.keys(rData || {})) {
		const buildingRooms = rData[bid] || [];
		const info = (bData && bData[bid]) || {};

		const bmLevel = typeof info.bmLevel === 'number' ? info.bmLevel : 0;
		const name = info.name || bid;

		const floorsArr = [];

		buildingRooms.forEach((floor, lvI) => {
			const roomsArr = [];
			(floor || []).forEach((room, i) => {
				if (!room) return;
				const roomName = room.name || '';
				const rid = idRules.rid(bid, lvI, i);
				roomsArr.push({ name: roomName, rid });
			});
			floorsArr[lvI] = roomsArr;
		});

		res[bid] = {
			name,
			bmLevel,
			rooms: floorsArr,
		};
	}

	// 최종 roomList 구조:
	// {
	//   [bid]: {
	//     name: string,
	//     bmLevel: number,
	//     rooms: Array<Array<{ name: string, rid: string }>>
	//   }
	// }
	SC.roomList = res;
}

app.listen(PORT, () => {
	initList();
	// console.log(SC.roomList);
	console.log(`Rooms server running at http://localhost:${PORT}`);
});
