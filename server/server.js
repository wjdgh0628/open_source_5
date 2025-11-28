import express from 'express';
import path from 'path';
import { exec } from 'child_process';

import { __dirname, PORT, idRules, SC } from './server.config.js';
import { api } from './api.js';
import { fetchAllRooms } from './fileIO.js';
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

function initList() {
	let data = fetchAllRooms();
	for (const bid in data) {
		data[bid].forEach((floor, lvI) => {
			floor.forEach((room, i) => {
				data[bid][lvI][i] = { name: room.name, rid: idRules.rid(bid, lvI, i) };
				// console.log(room);
			});
		})
	}
	SC.roomList = data;
}

app.listen(PORT, () => {
	initList();
	console.log(SC.roomList);
	console.log(`Rooms server running at http://localhost:${PORT}`);
});
