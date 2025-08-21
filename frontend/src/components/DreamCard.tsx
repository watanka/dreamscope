import React from 'react'
import { Link } from 'react-router-dom'
import type { DreamItem } from '../api/client'

export default function DreamCard({ d }: { d: DreamItem }) {
  return (
    <li>
      <Link
        to={`/dream/${d.id}`}
        className="group block rounded-lg border border-gray-800 bg-black/40 p-4 hover:border-gray-700 hover:bg-gray-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-transform duration-200 ease-out"
      >
        <div className="flex items-center gap-3">
          {d.author_avatar_url ? (
            <img src={d.author_avatar_url} alt={d.author_name || 'User'} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white text-sm flex items-center justify-center">
              {(d.author_name?.[0] || 'D').toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-200 truncate group-hover:text-white">{d.author_name || 'Dreamer'}</div>
            <div className="text-xs text-gray-500">{new Date(d.created_at).toLocaleString()}</div>
          </div>
          <span className="text-xs text-indigo-400 group-hover:text-indigo-300">View</span>
        </div>
        <div className="mt-3 text-gray-300 whitespace-pre-wrap break-words line-clamp-3 group-hover:text-gray-200">{d.content}</div>
        {Array.isArray(d.tags) && d.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {d.tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 text-xs rounded-full border border-indigo-700/60 bg-indigo-900/30 text-indigo-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </Link>
    </li>
  )
}

