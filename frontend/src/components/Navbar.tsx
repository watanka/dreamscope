import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SearchBar from './SearchBar'
import { logout as apiLogout } from '../api/client'

export default function Navbar() {
  const { pathname } = useLocation()
  const active = (p: string) => pathname === p ? 'text-indigo-400' : 'text-gray-300 hover:text-gray-100'
  const [user, setUser] = useState<{ id?: string; name?: string; email?: string; avatar_url?: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><radialGradient id="g" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="%23c4b5fd"/><stop offset="60%" stop-color="%236366f1"/><stop offset="100%" stop-color="%230b1020"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="url(%23g)"/></svg>'

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('user')
        setUser(raw ? JSON.parse(raw) : null)
      } catch { setUser(null) }
    }
    read()
    const onStorage = (e: StorageEvent) => { if (e.key === 'user') read() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    // 경로 변경 시 드랍다운 닫기
    setMenuOpen(false)
  }, [pathname])

  const googleAuthUrl = useMemo(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
    const defaultRedirect = 'http://localhost:8000/auth/google/callback'
    const redirectUri = (import.meta.env.VITE_GOOGLE_REDIRECT_URI as string) || defaultRedirect
    const scope = 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
    const authBase = 'https://accounts.google.com/o/oauth2/v2/auth'
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
    })
    const url = `${authBase}?${params.toString()}`
    try {
      console.debug('[OAuth] Base Auth URL (Navbar, no state):', url)
    } catch {}
    return url
  }, [pathname])

  const startLogin = () => {
    const csrf = Math.random().toString(36).slice(2)
    try { sessionStorage.setItem('oauth_state', csrf) } catch {}
    const state = `t=${csrf}|next=${encodeURIComponent(pathname)}`
    const url = `${googleAuthUrl}&state=${encodeURIComponent(state)}`
    try {
      console.debug('[OAuth] CSRF set (Navbar click):', csrf)
      console.debug('[OAuth] Final Auth URL (Navbar):', url)
    } catch {}
    window.location.href = url
  }
  return (
    <nav className="sticky top-0 z-20 border-b border-gray-800 bg-black/70 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-3 grid grid-cols-[auto,1fr,auto] items-center gap-6">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <span className="font-semibold">DreamScope</span>
          </Link>
        </div>
        {/* Center: Search */}
        <div className="flex items-center justify-center">
          <div className="w-full">
            <SearchBar />
          </div>
        </div>
        {/* Right: Nav & User */}
        <div className="flex items-center justify-end gap-4 text-sm">
          <Link className={active('/')} to="/">Tell your Dream</Link>
          <Link className={active('/feed')} to="/feed">Shared Dreams</Link>
          {!user ? (
            <button
              onClick={startLogin}
              className="px-3 py-1.5 rounded bg-white text-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Login
            </button>
          ) : (
            <div className="relative">
              <button
                className="flex items-center gap-2 focus:outline-none"
                onClick={() => setMenuOpen(v => !v)}
              >
                <img
                  src={user.avatar_url || DEFAULT_AVATAR}
                  alt={user.name || 'User avatar'}
                  className="h-8 w-8 rounded-full object-cover border border-gray-700"
                  referrerPolicy="no-referrer"
                />
                <span className="max-w-[160px] truncate text-gray-200" title={user.name}>{user.name}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-md border border-gray-700 bg-black/90 backdrop-blur shadow-lg z-30">
                  <button
                    className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 hover:text-white"
                    onClick={async () => {
                      try { await apiLogout() } catch {}
                      try { localStorage.removeItem('user') } catch {}
                      setUser(null)
                      setMenuOpen(false)
                      window.location.href = '/'
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
