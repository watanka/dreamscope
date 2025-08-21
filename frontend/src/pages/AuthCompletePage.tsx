import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function AuthCompletePage() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<{ expected?: string; stateParam?: string; receivedToken?: string; nextParam?: string; name?: string; email?: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(search)
    const name = params.get('name') || ''
    const email = params.get('email') || ''
    const avatar_url = params.get('avatar_url') || ''
    const id_token = params.get('id_token') || ''
    const nextParam = params.get('next')
    const stateParam = params.get('state')

    // Validate state (CSRF)
    try {
      const expected = sessionStorage.getItem('oauth_state') || ''
      if (stateParam) {
        const m = stateParam.match(/(?:^|[|&])t=([^|&]+)/)
        const received = m && m[1] ? m[1] : ''
        // Debug info for inspection
        setDebug({ expected, stateParam, receivedToken: received, nextParam: nextParam || undefined, name: name || undefined, email: email || undefined })
        try {
          console.debug('[OAuth] Callback search:', search)
          console.debug('[OAuth] Expected CSRF (sessionStorage):', expected)
          console.debug('[OAuth] State param (from URL):', stateParam)
          console.debug('[OAuth] Parsed token t:', received)
          console.debug('[OAuth] next param:', nextParam)
          console.debug('[OAuth] user name/email:', { name, email })
        } catch {}
        if (expected && received && expected !== received) {
          setError('Invalid login state. Please try again.')
          return
        }
      }
    } catch {}

    if (!name && !email) {
      setError('Missing user information in callback')
      return
    }

    try {
      const user = { name, email, avatar_url }
      localStorage.setItem('user', JSON.stringify(user))
      if (id_token) localStorage.setItem('id_token', id_token)
      // Clear CSRF token after successful login
      try { sessionStorage.removeItem('oauth_state') } catch {}
    } catch {}

    // Determine where to go next
    let nextPath: string | null = null
    if (nextParam && /^\//.test(nextParam)) {
      nextPath = nextParam
    } else if (stateParam) {
      // naive parse: look for `next=` inside state
      try {
        const m = stateParam.match(/(?:^|[|&])next=([^|&]+)/)
        if (m && m[1]) {
          const decoded = decodeURIComponent(m[1])
          if (/^\//.test(decoded)) nextPath = decoded
        }
      } catch {}
    }
    // Only navigate if no error has been set
    navigate(nextPath || '/', { replace: true })
  }, [search, navigate])

  return (
    <div className="min-h-screen w-full">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Completing sign-in…</h1>
        <p className="text-sm text-gray-400 mt-1">Please wait while we finalize your login.</p>
        {error && (
          <div className="mt-4 text-red-400">
            {error}
            {debug && (
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-gray-300 bg-gray-900/60 p-3 rounded border border-gray-800">
{`Debug info:\nexpected (sessionStorage oauth_state): ${debug.expected || '(empty)'}\nstateParam: ${debug.stateParam || '(none)'}\nparsed t: ${debug.receivedToken || '(empty)'}\nnext: ${debug.nextParam || '(none)'}\nname/email: ${debug.name || ''} / ${debug.email || ''}`}
              </pre>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
