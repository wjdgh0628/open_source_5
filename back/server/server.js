import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import readline from 'readline';

import { __dirname} from '#scripts/serverConfig.js';
import { api } from '#scripts/api.js';
import { PORT } from '#shared/rules.js';

const app = express();
let server;

// app.use('/', express.static(path.join(__dirname)));
app.use('/api', api);
app.use('/editor', express.static(path.join(__dirname, '../editor')));
app.use('/map', express.static(path.join(__dirname, '../map/dist')));
app.use('/shared', express.static(path.resolve(__dirname, '../shared')));

app.get("/editor", (req, res) => {
	res.redirect("/editor/editor.html");
});
app.get("/", (req, res) => {
	res.redirect("/map/index.html");
});
/** 
 *	console.log('Initialized basicInfos:', basicInfos);
 *	최종 roomList 구조:
 *	{
 *		[bid]: {
 *	    	name: string,
 *	    	bmLevel: number,
 *	    	rooms: Array<Array<{ name: string, rid: string }>>
 *		}
 *	}
 */
function openInBrowser(url) {
	const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
	const command = process.platform === "win32" ? `${opener} "" "${url}"` : `${opener} "${url}"`;
	exec(command, (err) => {
		if (err) console.error(`Failed to open ${url}: ${err.message}`);
	});
}

function startServer() {
	server = app.listen(PORT, () => {
		console.log(`Rooms server running at http://localhost:${PORT}`);
	});
}

function restartServer() {
	if (!server) return startServer();
	console.log('Restarting server...');
	server.close(() => {
		// 재시작 시 필요한 초기화가 있으면 여기서 수행
		startServer();
	});
}

function shutdownServer(code = 0) {
	if (!server) process.exit(code);
	console.log('Shutting down server...');
	server.close(() => {
		process.exit(code);
	});
}

function readlinePrompt() {
	if (process.stdin.isTTY) {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		const prompt = () => rl.setPrompt('> [r]estart, [q]uit, [o]pen editor: ');
		// prompt();
		// rl.prompt();
		rl.on('line', (line) => {
			const k = (line || '').trim().toLowerCase();
			if (k === 'r') {
				restartServer();
			} else if (k === 'q') {
				rl.close();
				shutdownServer(0);
				return;
			} else if (k === 'o') {
				const url = `http://localhost:${PORT}/`;
				console.log(`Opening map: ${url}`);
				openInBrowser(url);
			} else if (k === 'e') {
				const url = `http://localhost:${PORT}/editor/editor.html`;
				console.log(`Opening editor: ${url}`);
				openInBrowser(url);
			} else if (k) {
				console.log('Unknown command:', k);
			}
			prompt();
			rl.prompt();
		});
		rl.on('SIGINT', () => {
			rl.close();
			shutdownServer(0);
		});
	}
}

startServer();
// 일반 시그널 처리
process.on('SIGINT', () => shutdownServer(0));
process.on('SIGTERM', () => shutdownServer(0));
readlinePrompt();

