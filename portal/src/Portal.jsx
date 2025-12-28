import { useEffect, useState } from 'react'
import './Portal.css'

const API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

function Portal() {
  const [user, setUser] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
        if (!r.ok) {
          location.href = '/login'
          return
        }
        const j = await r.json().catch(() => ({}))
        if (!j.user) {
          location.href = '/login'
          return
        }
        if (!alive) return
        setUser(j.user)
      } catch {
        location.href = '/login'
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const onLogout = async () => {
    setErr('')
    try {
      const r = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (r.ok) location.href = '/login'
      else setErr('로그아웃 실패')
    } catch {
      setErr('네트워크 오류')
    }
  }

  if (!user) return null

  return (
    <div className="wrap">
      <div className="box">
        <h1>환영합니다</h1>

        <p id="who">
          {user.email}
          {user.role === 'admin' ? ' · 관리자' : ''}
        </p>

        <div>
          <button className="primary" onClick={() => (location.href = '/map')}>
            맵 열기
          </button>

          {user.role === 'admin' && (
            <button onClick={() => (location.href = '/editor')}>
              에디터 열기
            </button>
          )}

          <button onClick={onLogout}>로그아웃</button>
        </div>

        <p id="err">{err}</p>
      </div>
    </div>
  )
}

export default Portal