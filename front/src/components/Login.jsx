import { useEffect, useState, useRef } from "react";
import "./Login.css";

function Login({ setUser, urls }) {
	const [error, setError] = useState("");
	const gbtnRef = useRef(null);

	useEffect(() => {
		// 이미 로그인되어 있으면 역할만 설정
		(async () => {
			try {
				const r = await fetch(urls.me, { credentials: "include" });
				const j = await r.json();
				if (j && j.user) {
					console.log("Already logged in as", j);
					setUser(j);
				}
			} catch {
				/* ignore */
			}
		})();
	}, [urls, setUser]);

	useEffect(() => {
		let cancelled = false;

		async function init() {
			// Client ID 요청
			let clientId = "";
			try {
				const r = await fetch(urls.clientId, { credentials: "include" });
				const j = await r.json();
				clientId = j.clientId || "";
			} catch {
				setError("서버에 연결할 수 없습니다.");
				return;
			}

			if (!clientId) {
				setError("GOOGLE_CLIENT_ID가 설정되어 있지 않습니다.");
				return;
			}

			// GSI 로드 대기
			const startedAt = Date.now();
			function waitAndInit() {
				if (cancelled) return;

				// 6초 안에 GSI가 안 올라오면 메시지 출력
				if (Date.now() - startedAt > 6000) {
					setError(
						"Google 로그인 스크립트(GSI)가 로드되지 않았습니다. (네트워크/광고차단/추적방지 설정 또는 index.html의 GSI 스크립트 포함 여부를 확인하세요.)"
					);
					return;
				}

				if (window.google && window.google.accounts && window.google.accounts.id) {
					if (!gbtnRef.current) {
						setError("구글 로그인 버튼 컨테이너를 찾을 수 없습니다.");
						return;
					}
					try {
						window.google.accounts.id.initialize({
							client_id: clientId,
							callback: onCredential,
						});
						window.google.accounts.id.renderButton(gbtnRef.current, {
							type: "standard",
							theme: "outline",
							size: "large",
							shape: "rect",
							logo_alignment: "left",
						});
					} catch (e) {
						setError(
							"Google 로그인 버튼을 초기화하는 중 오류가 발생했습니다: " +
								(e?.message || String(e))
						);
					}
				} else {
					setTimeout(waitAndInit, 50);
				}
			}

			// 이전 에러가 남아있을 수 있으니, 로드 시도 시작 시 초기화
			setError("");
			waitAndInit();
		}

		async function onCredential(resp) {
			try {
				const r = await fetch(urls.login, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ credential: resp.credential }),
				});
				if (!r.ok) {
					const e = await r.json().catch(() => ({}));
					setError("로그인 실패: " + (e.error || r.status));
					return;
				}
				// 로그인 성공 시 역할만 갱신
				const me = await fetch(urls.me, { credentials: "include" });
				const mj = await me.json();
				setUser(mj || null);
			} catch {
				setError("네트워크 오류");
			}
		}

		init();
		return () => {
			cancelled = true;
		};
	}, [urls, setUser]);

	return (
		<aside className="login-sidebar" aria-label="Login">
			<div className="login-sidebar__inner">
				<h1 className="login-sidebar__title">Sign in</h1>
				<div className="login-sidebar__button" ref={gbtnRef} />
				{error && <p className="login-sidebar__error">{error}</p>}
			</div>
		</aside>
	);
}

export default Login;