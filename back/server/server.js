import 'dotenv/config';
import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import readline from 'readline';
import session from "express-session";

import { __dirname } from '#scripts/serverConfig.js';
import { api } from '#scripts/api.js';
import auth from '#scripts/auth.js';
import { PORT } from '#shared/rules.js';

const app = express();
let server;

// body parsers (needed for /api/login)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session (login state)
app.use(session({
	name: 'hmh.sid',
	secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	},
}));

// expose session user to request
app.use((req, res, next) => {
	req.user = req.session?.user || null;
	next();
});

// app.use('/', express.static(path.join(__dirname)));

// auth routes first
app.use('/api', auth);
app.use('/api', api);

// public shared assets (if you truly want these public)
app.use('/shared', express.static(path.resolve(__dirname, '../shared')));

// protect map/editor assets by middleware on the prefix
app.use('/map', requireAuth, express.static(path.join(__dirname, '../map/dist')));
app.use('/editor', requireAuth, requireRole('admin'), express.static(path.join(__dirname, '../editor')));

function requireAuth(req, res, next) {
	if (!req.user) return res.status(401).end();
	next();
}
function requireRole(role) {
	return (req, res, next) => (req.user?.role === role ? next() : res.status(403).end());
}

app.get('/login', (req, res) => {
	if (req.user) return res.redirect('/map');
	res.sendFile(path.resolve(__dirname, '../public/login.html'));
});

app.get('/editor', requireAuth, requireRole('admin'), (req, res) => {
	res.redirect('/editor/editor.html');
});
app.get('/map', requireAuth, (req, res) => {
	res.redirect('/map/index.html');
});
app.get('/', (req, res) => {
	res.redirect('/login');
});

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
		const prompt = () => rl.setPrompt('> [r]estart, [q]uit, [o]pen map, [e]ditor: ');
		prompt();
		rl.prompt();
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
				const url = `http://localhost:${PORT}/editor`;
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
process.on('SIGINT', () => shutdownServer(0));
process.on('SIGTERM', () => shutdownServer(0));
readlinePrompt();
