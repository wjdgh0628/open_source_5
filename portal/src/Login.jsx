import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()

    const existing = document.querySelector('script[data-gsi="true"]')
    if (existing) {
      const onLoad = () => resolve()
      const onErr = () => reject(new Error('GSI load failed'))
      existing.addEventListener('load', onLoad, { once: true })
      existing.addEventListener('error', onErr, { once: true })
      return
    }

    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.dataset.gsi = 'true'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('GSI load failed'))
    document.head.appendChild(s)
  })
}

function Login() {
  const gbtnRef = useRef(null)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true

    ;(async () => {
      setErr('')

      // 이미 로그인 상태면 포털로
      const me = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)

      if (me?.user) {
        navigate('/portal')
        return
      }

      // 서버에서 Client ID 가져오기
      const cfg = await fetch(`${API_BASE}/auth/config`, { credentials: 'include' })
        .then(r => r.json())
        .catch(() => null)

      const clientId = cfg?.clientId || ''
      if (!clientId) {
        if (alive) setErr('GOOGLE_CLIENT_ID가 설정되어 있지 않습니다.')
        return
      }

      // GSI 로드 + 버튼 렌더
      try {
        await loadGsiScript()
      } catch {
        if (alive) setErr('Google 로그인 스크립트를 불러오지 못했습니다.')
        return
      }

      if (!alive) return
      if (!gbtnRef.current) return
      if (!window.google?.accounts?.id) {
        setErr('Google 로그인 초기화에 실패했습니다.')
        return
      }

      async function onCredential(resp) {
        setErr('')
        try {
          const r = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ credential: resp.credential }),
          })

          if (!r.ok) {
            const e = await r.json().catch(() => ({}))
            setErr('로그인 실패: ' + (e.error || r.status))
            return
          }

          navigate('/portal')
        } catch {
          setErr('네트워크 오류')
        }
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: onCredential,
        auto_select: false,
      })

      // 같은 DOM에 재렌더 대비: 기존 버튼 비우고 다시 렌더
      gbtnRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(gbtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'rect',
        logo_alignment: 'left',
      })
    })()

    return () => {
      alive = false
      window.google?.accounts?.id?.cancel?.()
    }
  }, [navigate])

  return (
    <div className="wrap">
      <div className="box">
        <h1>Sign in</h1>
        <div ref={gbtnRef} id="gbtn" />
        <p id="err">{err}</p>
      </div>
    </div>
  )
}

export default Login