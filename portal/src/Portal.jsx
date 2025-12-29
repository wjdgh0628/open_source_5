import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Portal.css'

const API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

function Portal() {
  const [user, setUser] = useState(null)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true

    ;(async () => {
      const me = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)

      if (!me?.user) {
        navigate('/login')
        return
      }
      if (!alive) return
      setUser(me.user)
    })()

    return () => {
      alive = false
    }
  }, [navigate])

  const onLogout = async () => {
    setErr('')

    const ok = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(r => r.ok)
      .catch(() => false)

    window.google?.accounts?.id?.disableAutoSelect?.()
    window.google?.accounts?.id?.cancel?.()

    if (ok) navigate('/login')
    else setErr('로그아웃 실패')
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