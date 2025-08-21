import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import { useSearchParams } from 'react-router-dom'
import DreamCard from '../components/DreamCard'
import { api, type DreamItem } from '../api/client'

export default function FeedPage() {
  const [items, setItems] = useState<DreamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const tags = (params.get('tags') || '').trim()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const query: Record<string, any> = { page, limit }
        if (q) query.q = q
        if (tags) query.tags = tags
        const res = await api.get<DreamItem[]>('/dreams', { params: query })
        setItems(res.data)
        const totalHeader = res.headers?.['x-total-count'] || res.headers?.['X-Total-Count']
        setTotal(parseInt(totalHeader || '0', 10) || 0)
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Failed to load feed')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [q, tags, page, limit])

  return (
    <div className="min-h-screen w-full">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Shared Dreams</h1>
        </div>
        {/* SearchBar moved into Navbar */}
        {loading && <div className="mt-4">Loading dreams…</div>}
        {error && <div className="mt-4 text-red-400">{error}</div>}
        <ul className="mt-4 space-y-4">
          {items.map((d) => (
            <DreamCard key={d.id} d={d} />
          ))}
        </ul>
        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {total ? page : 0} of {Math.max(1, Math.ceil(total / Math.max(1, limit)))} · {total} results
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-900 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              Prev
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-900 disabled:opacity-50"
              onClick={() => {
                const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)))
                setPage((p) => Math.min(totalPages, p + 1))
              }}
              disabled={loading || (total > 0 && page >= Math.ceil(total / Math.max(1, limit)))}
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
