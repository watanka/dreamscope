import React from 'react'
import type { DreamInterpretation } from '../api/client'

function Tag({ label, variant = 'events', i = 0 }: { label: string; variant?: 'events' | 'subjects'; i?: number }) {
  const palettes = {
    events: [
      'from-indigo-600/30 to-purple-600/30 text-indigo-200 ring-indigo-500/40',
      'from-fuchsia-600/30 to-violet-600/30 text-fuchsia-200 ring-fuchsia-500/40',
      'from-sky-600/30 to-indigo-600/30 text-sky-200 ring-sky-500/40',
    ],
    subjects: [
      'from-emerald-600/30 to-teal-600/30 text-emerald-200 ring-emerald-500/40',
      'from-amber-600/30 to-rose-600/30 text-amber-200 ring-amber-500/40',
      'from-cyan-600/30 to-teal-600/30 text-cyan-200 ring-cyan-500/40',
    ],
  } as const
  const cls = palettes[variant][i % palettes[variant].length]
  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ring-1 ring-inset mr-2 mb-2 
      bg-gradient-to-br ${cls} shadow-[0_0_10px_rgba(99,102,241,0.15)]`} 
      data-tag-type={variant}
      data-tag={label}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/60 shadow-[0_0_6px_rgba(255,255,255,0.8)]"></span>
      {label}
    </span>
  )
}

export default function InterpretationView({ data }: { data: DreamInterpretation }) {
  const { summary, analysis, tags } = data
  return (
    <div className="mt-6 space-y-6">
      {/* Mystic frame */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-900/40 bg-gradient-to-b from-indigo-950/40 to-black/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.25),rgba(2,6,23,0))]"></div>
        <div className="absolute -inset-1 rounded-[20px] opacity-20 blur-2xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600" />
        <div className="relative p-5">
          {/* Summary - first, card style */}
          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4 shadow-[0_0_30px_rgba(99,102,241,0.08)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-700/30 ring-1 ring-inset ring-gray-500/40 text-[10px]">S</span>
              <h3 className="text-xs tracking-wide text-gray-300/90 uppercase">Summary</h3>
            </div>
            <p className="mt-2 text-gray-100 leading-relaxed">{summary}</p>
            {Array.isArray(tags) && tags.length > 0 && (
              <div className="mt-3 flex flex-wrap">
                {tags.map((t, i) => (
                  <Tag key={t + String(i)} label={t} variant="events" i={i} />
                ))}
              </div>
            )}
          </section>

          {/* Analysis - emphasized*/}
          <section className="mt-4 rounded-xl border border-indigo-800/60 bg-indigo-950/40 p-4 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600/30 ring-1 ring-inset ring-indigo-400/40 text-[10px]">★</span>
              <h3 className="text-xs tracking-wide text-indigo-300/90 uppercase">Analysis</h3>
              <span className="ml-2 rounded-full bg-indigo-600/20 px-2 py-0.5 text-[10px] tracking-wide text-indigo-200 ring-1 ring-inset ring-indigo-500/40">Key Insight</span>
            </div>
            <p className="mt-2 text-base text-indigo-100 leading-relaxed">{analysis}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
