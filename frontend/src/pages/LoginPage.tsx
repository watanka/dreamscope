import Navbar from '../components/Navbar'
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export default function LoginPage() {
  const { pathname } = useLocation()
  // Build base URL without state. We'll append state at click time.
  const googleAuthBaseUrl = useMemo(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const defaultRedirect = 'http://localhost:8000/auth/google/callback'
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || defaultRedirect
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
    try { console.debug('[OAuth] Base Auth URL (LoginPage, no state):', url) } catch {}
    return url
  }, [pathname])

  const startLogin = () => {
    const csrf = Math.random().toString(36).slice(2)
    try { sessionStorage.setItem('oauth_state', csrf) } catch {}
    const state = `t=${csrf}|next=${encodeURIComponent(pathname)}`
    const url = `${googleAuthBaseUrl}&state=${encodeURIComponent(state)}`
    try {
      console.debug('[OAuth] CSRF set (LoginPage click):', csrf)
      console.debug('[OAuth] Final Auth URL (LoginPage):', url)
    } catch {}
    window.location.href = url
  }

  return (
    <div className="min-h-screen w-full">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-sm text-gray-400 mt-1">Sign in with Google</p>
        <div className="mt-6 flex">
          <button
            onClick={startLogin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white text-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.104,6.053,28.805,4,24,4C12.954,4,4,12.954,4,24 s8.954,20,20,20s20-8.954,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.35,16.108,18.834,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.104,6.053,28.805,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c4.697,0,8.985-1.802,12.242-4.743l-5.648-4.727C28.542,35.46,26.385,36,24,36 c-5.202,0-9.617-3.317-11.283-7.946l-6.49,5.002C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.062,5.53 c0.001-0.001,0.002-0.001,0.003-0.002l5.648,4.727C36.482,39.32,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </main>
    </div>
  )
}
