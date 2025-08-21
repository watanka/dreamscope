import React, { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import CrystalBall from '../components/CrystalBall'
import { api, type DreamInterpretation } from '../api/client'
import InterpretationView from '../components/InterpretationView'
// No longer parsing legacy interpretation strings; backend returns { summary, tags }

export default function DreamPage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DreamInterpretation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const MAX = 1000

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const interpret = async () => {
    const content = text.trim()
    if (!content) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<any>('/dreams', { content })
      const data = res.data || {}
      const rawTags = Array.isArray(data.tags) ? data.tags : []
      const tags: string[] = rawTags
        .map((t: any) => (typeof t === 'string' ? t : (t && (t.name || t.label)) || ''))
        .map((s: string) => s.trim())
        .filter(Boolean)
      const parsed: DreamInterpretation = {
        summary: String(data.summary || ''),
        tags,
        analysis: String(data.analysis || ''),
      }
      setResult(parsed)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to interpret dream')
    } finally {
      setLoading(false)
    }
  }

  const share = async () => {
    // Optional: call backend share endpoint if available
    alert('Share feature will publish this dream to the feed when backend is ready.')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (composing) return
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      interpret()
    }
  }

  const remaining = Math.max(0, MAX - text.length)

  return (
    <div className="min-h-screen w-full">
      <Navbar />
      {/* Hero with crystal ball */}
      <section className="relative pt-6 pb-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 max-w-3xl blur-3xl opacity-40"
             style={{ background: 'radial-gradient(60% 60% at 50% 0%, rgba(99,102,241,0.35), rgba(2,6,23,0.0))' }} />
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-center">
          <CrystalBall active={loading || !!result} size={280} />
          <h1 className="mt-4 text-2xl font-semibold">Tell me about your dream</h1>
          <p className="text-sm text-gray-400 mt-1">Every dream holds a meaning, whether you realize it or not. It reflects your subconscious and hints at what the future may hold. Describe your dream, and DreamScope will unveil its secrets!</p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto p-6 pt-2">
        <div className="rounded-xl border border-gray-800 bg-gray-950/60 backdrop-blur-sm p-4">
          <textarea
            ref={inputRef}
            className="w-full min-h-[160px] px-4 py-3 rounded-lg bg-gray-950 border border-gray-800 outline-none focus:border-gray-600"
            placeholder="Describe your dream here…"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={onKeyDown}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={(e) => {
              setComposing(false)
              setText((e.target as HTMLTextAreaElement).value)
            }}
            aria-label="Dream text"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">{remaining} characters left</div>
            <div className="flex gap-2">
              {!result && (
                <button
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={interpret}
                  disabled={loading || !text.trim()}
                >
                  {loading ? 'Interpreting…' : 'Interpret Dream'}
                </button>
              )}
              {result && (
                <button
                  className="px-4 py-2 rounded border border-gray-700 hover:border-gray-600"
                  onClick={share}
                >
                  Share
                </button>
              )}
            </div>
          </div>

          {/* Loading shimmer lines under input while waiting */}
          {loading && (
            <div className="mt-4" aria-live="polite">
              <div className="h-3 w-2/3 rounded shimmer-line mb-2" />
              <div className="h-3 w-4/5 rounded shimmer-line mb-2" />
              <div className="h-3 w-3/5 rounded shimmer-line" />
            </div>
          )}
        </div>

        {error && <div className="mt-3 text-red-400 text-sm" role="alert">{error}</div>}

        {result && (
          <section className="mt-6 border-t border-gray-800 pt-4">
            <h2 className="font-medium mb-2">Interpretation</h2>
            <InterpretationView data={result} />
          </section>
        )}
      </main>
    </div>
  )
}
