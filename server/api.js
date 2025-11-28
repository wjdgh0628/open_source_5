import express from 'express';
import cors from 'cors';
import fs from 'fs';

import {SC} from './server.config.js';
import {fetchBuildingInfo, fetchRoomsByLvI} from './fileIO.js';


// const readline = require("readline");
// const { exec } = require("child_process");

export const api = express();
api.use(cors());                  // file:// 또는 localhost 접근 허용
api.use(express.json({ limit: "5mb" }));

api.post("/request/buildings", (req, res) => {
	// res.header("Access-Control-Allow-Origin", "http://localhost:3000");
	console.log("requested", req.body.bid, req.body.opt);
	const data = fetchBuildingInfo(req.body.bid, req.body.opt);
	console.log("sent",data);
	res.json(data);
});
api.post("/request/rooms", (req, res) => {
	// res.header("Access-Control-Allow-Origin", "http://localhost:3000");
	console.log("requested", req.body.bid, req.body.lvI);
	const data = fetchRoomsByLvI(req.body.bid, req.body.lvI);
	console.log("sent",data);
	res.json(data);
});
api.get("/config", (req, res) => {
	// res.header("Access-Control-Allow-Origin", "http://localhost:3000");
	res.json(SC);
});

api.get("/json/buildings", (req, res) => {
	// res.header("Access-Control-Allow-Origin", "http://localhost:3000");
	res.sendFile(SC.buildings);
});
// 읽기: rooms.json 전체
api.get("/json/rooms", (req, res) => {
	// res.header("Access-Control-Allow-Origin", "http://localhost:3000");
	fs.readFile(SC.rooms, "utf8", (err, data) => {
		if (err) return res.status(500).json({ error: "read_failed" });
		res.type("application/json").send(data);
	});
});
// 저장: 요청 바디를 rooms.json에 그대로 덮어쓰기
api.post("/json/rooms", (req, res) => {
	// res.header("Access-Control-Allow-Origin", "http://localhost:3000");
	const body = req.body; // 전체 roomsDB 객체가 와야 함
	if (!body || typeof body !== "object") {
		return res.status(400).json({ error: "invalid_body" });
	}
	fs.writeFile(SC.rooms, JSON.stringify(body, null, 4), "utf8", (err) => {
		if (err) return res.status(500).json({ error: "write_failed" });
		res.json({ ok: true });
	});
});