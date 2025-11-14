// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());                  // file:// 또는 localhost 접근 허용
app.use(express.json({ limit: "5mb" }));

app.use(express.static(path.join(__dirname, "../public")));
app.use("/editor", express.static(path.join(__dirname, "../editor")));

const ROOMS_PATH = path.join(__dirname, "data/rooms.json");
const BUILDINGS_PATH = path.join(__dirname, "data/buildings.geojson");
const HMH_PATH = path.join(__dirname, "../public/scripts/index.html");

app.get("/buildings", (req, res) => {
  res.sendFile(BUILDINGS_PATH);
});

// 읽기: rooms.json 전체
app.get("/rooms", (req, res) => {
  fs.readFile(ROOMS_PATH, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "read_failed" });
    res.type("application/json").send(data);
  });
});
// 저장: 요청 바디를 rooms.json에 그대로 덮어쓰기
app.post("/rooms", (req, res) => {
  const body = req.body; // 전체 roomsDB 객체가 와야 함
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "invalid_body" });
  }
  fs.writeFile(ROOMS_PATH, JSON.stringify(body, null, 4), "utf8", (err) => {
    if (err) return res.status(500).json({ error: "write_failed" });
    res.json({ ok: true });
  });
});

// Root → redirect to the real static index path so relative URLs work
app.get("/", (req, res) => {
  res.redirect("/scripts/index.html");
});
// Optional: convenience route for the editor root
app.get("/editor", (req, res) => {
  res.redirect("/editor/editor.html");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Rooms server running at http://localhost:${PORT}`);
});