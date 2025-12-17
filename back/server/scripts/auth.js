import express from "express";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();
const client = new OAuth2Client();

router.post("/login", async (req, res) => {
	try {
		const { credential } = req.body; // GIS가 주는 ID token
		if (!credential) return res.status(400).json({ error: "missing credential" });

		const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
		const ALLOWED_HD = process.env.ALLOWED_HD;
		const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

		if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "missing GOOGLE_CLIENT_ID" });
		if (!ALLOWED_HD) return res.status(500).json({ error: "missing ALLOWED_HD" });

		const ticket = await client.verifyIdToken({
			idToken: credential,
			audience: GOOGLE_CLIENT_ID,
		});

		const p = ticket.getPayload();

		// 도메인 제한 (학생 계정만)
		if (!p?.hd || p.hd !== ALLOWED_HD) return res.status(403).json({ error: "domain not allowed" });
		if (!p?.email || !p.email.endsWith(`@${ALLOWED_HD}`)) return res.status(403).json({ error: "email not allowed" });

		// role 결정 (기본 student, admin 화이트리스트면 admin)
		const isAdmin = ADMIN_EMAILS.includes(p.email);
		const role = isAdmin ? 'admin' : 'student';

		// 세션 쿠키 발급: 서버가 로그인 상태를 유지
		req.session.user = {
			email: p.email,
			name: p.name || '',
			picture: p.picture || '',
			role,
		};

		return res.json({ ok: true, role });
	} catch (e) {
		return res.status(401).json({ error: "invalid token" });
	}
});

router.get('/me', (req, res) => {
	return res.json({ user: req.session?.user || null });
});

router.post('/logout', (req, res) => {
	req.session.destroy(() => {
		res.clearCookie('hmh.sid');
		res.json({ ok: true });
	});
});

router.get('/auth/config', (req, res) => {
	return res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

export default router;