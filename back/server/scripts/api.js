import express from 'express';
import cors from 'cors';
import fs from 'fs';

import { basicInfos, SC } from './serverConfig.js';
import { fetchBuildingInfo, fetchBuildingsInfo, fetchRoomsByLvI } from './fileIO.js';
import { initList } from '#server/server.js';

let requested = 0; // 요청 횟수 카운트
let jsonRequested = 0; // JSON 요청 횟수 카운트

export const api = express();
api.use(cors());                  // file:// 또는 localhost 접근 허용
api.use(express.json({ limit: "5mb" }));

api.post("/request/buildings", (req, res) => {
	// res.header("Access-Control-Allow-Origin", "http://localhost:3000");
	console.log("buildings requested", ++requested);
	let data = null;
	if(req.body.bids)
		data = fetchBuildingsInfo(req.body.bids, req.body.opt);
	else
		data = fetchBuildingInfo(req.body.bid, req.body.opt);
	// console.log("sent",data);
	res.json(data);
});
api.post("/request/rooms", (req, res) => {
	console.log("rooms requested", ++requested);
	const data = fetchRoomsByLvI(req.body.bid, req.body.lvI);
	// console.log("sent",data);
	res.json(data);
});
api.get("/basicInfos", (req, res) => {
	console.log("basicInfos requested", ++requested);
	res.json(basicInfos);
});

api.get("/json/buildings", (req, res) => {
	console.log("json buildings requested", ++jsonRequested);
	res.sendFile(SC.buildings);
});
// 읽기: rooms.json 전체
api.get("/json/rooms", (req, res) => {
	console.log("json rooms requested", ++jsonRequested);
	fs.readFile(SC.rooms, "utf8", (err, data) => {
		if (err) return res.status(500).json({ error: "read_failed" });
		res.type("application/json").send(data);
	});
});
// 저장: 요청 바디를 rooms.json에 그대로 덮어쓰기
api.post("/json/rooms", (req, res) => {
	console.log("json rooms pushed", ++jsonRequested);
	const body = req.body; // 전체 roomsDB 객체가 와야 함
	if (!body || typeof body !== "object") {
		return res.status(400).json({ error: "invalid_body" });
	}

	fs.writeFile(SC.rooms, JSON.stringify(body, null, 4), "utf8", (err) => {
		if (err) {
			return res.status(500).json({ error: "write_failed" });
		}

		// 파일이 제대로 저장된 뒤에 목록 다시 로드
		try {
			initList();
		} catch (e) {
			console.error("initList error:", e);
			return res.status(500).json({ error: "init_failed" });
		}

		return res.json({ ok: true });
	});
});