import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { api, type DreamItem, type CommentItem, type DreamInterpretation } from '../api/client'
import InterpretationView from '../components/InterpretationView'

export default function DreamDetailPage() {
  const { id } = useParams()
  const [dream, setDream] = useState<DreamItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({})
  const [composingReplies, setComposingReplies] = useState<Record<string, boolean>>({})
  const [composingNew, setComposingNew] = useState(false)

  useEffect(() => {
    if (!id) return
    const run = async () => {
      try {
        setLoading(true)
        const [dRes, cRes] = await Promise.all([
          api.get<DreamItem>(`/dreams/${id}`),
          api.get<CommentItem[]>(`/dreams/${id}/comments`),
        ])
        setDream(dRes.data)
        setComments(cRes.data)
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Failed to load dream')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  const parsed = useMemo(() => {
    if (!dream) return null
    const tagsArr = Array.isArray((dream as any).tags) ? (dream as any).tags : []
    const tags: string[] = tagsArr
      .map((t: any) => (typeof t === 'string' ? t : (t && (t.name || t.label)) || ''))
      .map((s: string) => s.trim())
      .filter(Boolean)
    const data: DreamInterpretation = {
      summary: String((dream as any).summary || ''),
      tags,
      analysis: String((dream as any).analysis || ''),
    }
    return data
  }, [dream])

  const tree = useMemo(() => {
    const byParent: Record<string, CommentItem[]> = {}
    const roots: CommentItem[] = []
    for (const c of comments) {
      const pid = c.parent_id || ''
      if (!pid) {
        roots.push(c)
      } else {
        if (!byParent[pid]) byParent[pid] = []
        byParent[pid].push(c)
      }
    }
    return { roots, byParent }
  }, [comments])

  async function reloadComments() {
    if (!id) return
    try {
      const cRes = await api.get<CommentItem[]>(`/dreams/${id}/comments`)
      setComments(cRes.data)
    } catch (e) { /* noop */ }
  }

  async function postComment(parent_id?: string) {
    if (!id) return
    const content = parent_id ? (replyDrafts[parent_id] || '').trim() : newComment.trim()
    if (!content) return
    try {
      if (parent_id) {
        await api.post(`/dreams/${id}/comments/${parent_id}/replies`, { content })
      } else {
        await api.post(`/dreams/${id}/comments`, { content })
      }
      await reloadComments()
      if (parent_id) {
        setReplyDrafts((s) => ({ ...s, [parent_id!]: '' }))
        setReplyOpen((s) => ({ ...s, [parent_id!]: false }))
      } else {
        setNewComment('')
      }
    } catch (e) {
      console.error(e)
    }
  }

  function CommentNode({ c }: { c: CommentItem }) {
    const children = tree.byParent[c.id] || []
    const replyValue = replyDrafts[c.id] || ''
    const isOpen = !!replyOpen[c.id]
    return (
      <li className="text-sm text-gray-300">
        <div className="flex items-center gap-2">
          {c.user_avatar_url ? (
            <img src={c.user_avatar_url} alt={c.user_name || 'User'} className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
              {(c.user_name?.[0] || 'U').toUpperCase()}
            </div>
          )}
          <div className="text-xs text-gray-300">{c.user_name || 'Dreamer'}</div>
          <div className="ml-auto text-[11px] text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words">{c.content}</div>
        <div className="mt-1">
          <button
            type="button"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
            onClick={(e) => { e.stopPropagation(); setReplyOpen((s) => ({ ...s, [c.id]: !s[c.id] })) }}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            {isOpen ? 'Cancel' : 'Reply'}
          </button>
        </div>
        {isOpen && (
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 px-3 py-1.5 rounded bg-gray-950 border border-gray-800 outline-none focus:border-gray-600 text-sm"
              placeholder="Reply..."
              value={replyValue}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setReplyDrafts((s) => ({ ...s, [c.id]: e.target.value }))}
              onCompositionStart={() => setComposingReplies((s) => ({ ...s, [c.id]: true }))}
              onCompositionEnd={(e) => {
                const v = (e.target as HTMLInputElement).value
                setComposingReplies((s) => ({ ...s, [c.id]: false }))
                setReplyDrafts((s) => ({ ...s, [c.id]: v }))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !composingReplies[c.id]) {
                  e.preventDefault()
                  e.stopPropagation()
                  postComment(c.id)
                }
              }}
            />
            <button
              type="button"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
              onClick={(e) => { e.stopPropagation(); postComment(c.id) }}
              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-sm"
            >
              Reply
            </button>
          </div>
        )}
        {children.length > 0 && (
          <ul className="mt-2 ml-4 border-l border-gray-800 pl-3 space-y-2">
            {children.map((child) => (
              <CommentNode key={child.id} c={child} />
            ))}
          </ul>
        )}
      </li>
    )
  }

  if (loading) return (
    <div className="min-h-screen w-full text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6">Loading…</main>
    </div>
  )

  if (error) return (
    <div className="min-h-screen w-full text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6 text-red-400">{error}</main>
    </div>
  )

  if (!dream) return null

  return (
    <div className="min-h-screen w-full text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6">
        {/* Post header */}
        <div className="flex items-center gap-3">
          {dream.author_avatar_url ? (
            <img src={dream.author_avatar_url} alt={dream.author_name || 'User'} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white text-sm flex items-center justify-center">
              {(dream.author_name?.[0] || 'D').toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-base text-gray-100">{dream.author_name || 'Dreamer'}</div>
            <div className="text-xs text-gray-400">{new Date(dream.created_at).toLocaleString()}</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold mt-4">Dream</h1>
        <p className="mt-2 text-gray-300 whitespace-pre-wrap break-words">{dream.content}</p>
        <div className="mt-4 border-t border-gray-800 pt-4">
          <h2 className="font-medium mb-2">Interpretation</h2>
          {parsed ? (
            <InterpretationView data={parsed} />
          ) : (
            <p className="text-gray-400">No summary available.</p>
          )}
        </div>

        <section className="mt-8 border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Comments ({comments.length})</h3>
          </div>

          <ul className="space-y-3">
            {tree.roots.map((c) => (
              <CommentNode key={c.id} c={c} />
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded bg-gray-950 border border-gray-800 outline-none focus:border-gray-600 text-sm"
              placeholder="Add a comment"
              value={newComment}
              onChange={(e) => {
                // Update value even during IME composition so characters show up
                setNewComment(e.target.value)
              }}
              onCompositionStart={() => setComposingNew(true)}
              onCompositionEnd={(e) => {
                const v = (e.target as HTMLInputElement).value
                setComposingNew(false)
                setNewComment(v)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !composingNew) {
                  e.preventDefault()
                  e.stopPropagation()
                  postComment()
                }
              }}
            />
            <button
              type="button"
              onClick={() => postComment()}
              className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm"
            >
              Post
            </button>
          </div>
        </section>

        <div className="mt-6">
          <Link to="/feed" className="text-sm text-indigo-400 hover:text-indigo-300">← Back to feed</Link>
        </div>
      </main>
    </div>
  )
}
