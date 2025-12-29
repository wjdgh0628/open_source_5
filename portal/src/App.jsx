const AUTH_ORIGIN = String(import.meta.env.VITE_AUTH_ORIGIN || '').replace(/\/+$/, '')
const authUrl = (p) => (AUTH_ORIGIN ? `${AUTH_ORIGIN}${p}` : p)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './login.jsx'
import Portal from './portal.jsx'

function useSessionUser() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(authUrl('/auth/me'), {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json().catch(() => null)
      setUser(data?.user ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return useMemo(() => ({ loading, user, refresh }), [loading, user, refresh])
}

function RequireAuth({ loading, user, children }) {
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireGuest({ loading, user, children }) {
  if (loading) return null
  if (user) return <Navigate to="/portal" replace />
  return children
}

export default function App() {
  const { loading, user, refresh } = useSessionUser()

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RequireGuest loading={loading} user={user}>
            <Login />
          </RequireGuest>
        }
      />

      <Route
        path="/portal"
        element={
          <RequireAuth loading={loading} user={user}>
            <Portal />
          </RequireAuth>
        }
      />

      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  )
}