import {api} from './api.js';
import {__dirname, PORT} from './server.config.js';
import express from 'express';
import path from 'path';
import {exec} from 'child_process';
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

app.listen(PORT, () => {
  console.log(`Rooms server running at http://localhost:${PORT}`);
});
