import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export default function SearchBar() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const [loadingTags, setLoadingTags] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Initialize from URL if present
  useEffect(() => {
    const qp = (params.get('q') || '').trim()
    const tp = (params.get('tags') || '').trim()
    if (qp) setQ(qp)
    if (tp) setSelected(tp.split(',').map((t) => t.trim()).filter(Boolean))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingTags(true)
        const res = await api.get<string[]>('/tags')
        setAllTags(res.data || [])
      } catch {
        setAllTags([])
      } finally {
        setLoadingTags(false)
      }
    }
    // Load only when opened first time
    if (open && allTags.length === 0 && !loadingTags) load()
  }, [open, allTags.length, loadingTags])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      // Quick focus with '/'
      const target = e.target as HTMLElement | null
      const isTyping = !!target && (target.closest('input, textarea, [contenteditable="true"]') !== null)
      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const submit = () => {
    const query: string[] = []
    if (q.trim()) query.push(`q=${encodeURIComponent(q.trim())}`)
    if (selected.length) query.push(`tags=${encodeURIComponent(selected.join(','))}`)
    const qs = query.length ? `?${query.join('&')}` : ''
    navigate(`/feed${qs}`)
    setOpen(false)
  }

  const toggleTag = (t: string) => {
    setSelected((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  const tagStyle = (t: string) => {
    // Deterministic hue by simple hash
    let h = 0
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360
    const bg = `hsl(${h} 70% 20%)`
    const bd = `hsl(${h} 70% 30%)`
    const tx = `hsl(${h} 80% 85%)`
    return { backgroundColor: bg, borderColor: bd, color: tx }
  }

  const filteredTags = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return allTags
    return allTags.filter((t) => t.includes(s))
  }, [q, allTags])

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        className="flex items-center gap-2 w-full"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-700 bg-gray-900/90 hover:bg-gray-900 focus-within:ring-2 focus-within:ring-indigo-500 shadow-sm transition">
          <div className="text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <input
            ref={inputRef}
            className="w-full bg-transparent outline-none placeholder-gray-500 text-base md:text-lg"
            placeholder="Search dreams and tags"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setOpen(true)}
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ('')}
              className="p-1 rounded-full hover:bg-gray-700 text-gray-400"
            >
              ×
            </button>
          )}
          <button type="submit" className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500">
            Search
          </button>
        </div>
      </form>
      {open && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-800 bg-black/80 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-150">
          <div className="p-3 border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">Selected Tags</div>
              <div className="flex items-center gap-3">
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="text-xs text-gray-300 hover:text-white"
                  >
                    Clear tags
                  </button>
                )}
                {(selected.length > 0 || q.trim()) && (
                  <button
                    type="button"
                    onClick={() => { setSelected([]); setQ('') }}
                    className="text-xs text-gray-300 hover:text-white"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.length === 0 && (
                <span className="text-gray-500 text-sm">No tags selected</span>
              )}
              {selected.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  style={tagStyle(t)}
                  className="px-3 py-1.5 rounded-full border text-sm hover:opacity-90"
                  title="Remove tag"
                >
                  {t} ×
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="text-xs text-gray-400 mb-1">All Tags</div>
            {loadingTags ? (
              <div className="text-sm text-gray-500 p-2">Loading tags…</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    style={tagStyle(t)}
                    className={`px-3 py-1.5 rounded-full border text-sm hover:opacity-90 ${
                      selected.includes(t) ? 'ring-2 ring-indigo-400' : ''
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {filteredTags.length === 0 && (
                  <div className="text-sm text-gray-500 p-2">No tags found</div>
                )}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-gray-800 sticky bottom-0 bg-black/80 backdrop-blur-md flex justify-end">
            <button
              type="button"
              onClick={submit}
              className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
