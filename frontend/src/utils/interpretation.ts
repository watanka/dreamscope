import type { DreamInterpretation } from '../api/client'

// Try to coerce various backend responses into DreamInterpretation
export function parseDreamInterpretationResponse(data: any): DreamInterpretation | null {
  if (!data) return null
  // Case 1: Already structured
  if (
    typeof data === 'object' &&
    typeof data.summary === 'string' &&
    Array.isArray(data.events) &&
    Array.isArray(data.subjects) &&
    typeof data.background === 'string' &&
    typeof data.analysis === 'string'
  ) {
    return data as DreamInterpretation
  }

  // Case 2: Wrapped under { interpretation: string | object }
  if (typeof data === 'object' && data.interpretation) {
    const inner = data.interpretation
    if (typeof inner === 'object') {
      return parseDreamInterpretationResponse(inner)
    }
    if (typeof inner === 'string') {
      const parsed = parseFromString(inner)
      if (parsed) return parsed
    }
  }

  // Case 3: Raw string
  if (typeof data === 'string') {
    const parsed = parseFromString(data)
    if (parsed) return parsed
  }

  return null
}

function parseFromString(text: string): DreamInterpretation | null {
  const s = text.trim()
  if (!s) return null
  // Try JSON first
  try {
    const obj = JSON.parse(s)
    return parseDreamInterpretationResponse(obj)
  } catch {}

  // Heuristic parse for legacy to_str format
  // Expected patterns:
  // events listed per line first, then
  // subjects: a, b, c
  // background: ...
  // analysis: ... (till end)
  const lower = s.toLowerCase()
  const idxSubjects = lower.indexOf('subjects:')
  const idxBackground = lower.indexOf('background:')
  const idxAnalysis = lower.indexOf('analysis:')
  const idxSummary = lower.indexOf('summary:')

  let summary = ''
  let eventsBlock = ''
  let subjectsLine = ''
  let background = ''
  let analysis = ''

  if (idxSummary >= 0) {
    const end = Math.min(
      ...[idxSubjects, idxBackground, idxAnalysis].filter((i) => i >= 0).concat([s.length])
    )
    summary = s.slice(idxSummary + 'summary:'.length, end).trim()
  }

  if (idxAnalysis >= 0) {
    analysis = s.slice(idxAnalysis + 'analysis:'.length).trim()
  }
  if (idxBackground >= 0) {
    const end = idxAnalysis >= 0 ? idxAnalysis : s.length
    background = s.slice(idxBackground + 'background:'.length, end).trim()
  }
  if (idxSubjects >= 0) {
    const end = Math.min(
      ...[idxBackground, idxAnalysis].filter((i) => i >= 0).concat([s.length])
    )
    subjectsLine = s.slice(idxSubjects + 'subjects:'.length, end).trim()
  }

  // Events: take leading lines before first labeled section
  const firstLabelIdx = Math.min(
    ...[idxSummary, idxSubjects, idxBackground, idxAnalysis].filter((i) => i >= 0).concat([s.length])
  )
  if (firstLabelIdx > 0) {
    eventsBlock = s.slice(0, firstLabelIdx).trim()
  } else if (idxSummary >= 0) {
    // If summary exists at start, take following lines until next label as events
    const afterSummaryStart = idxSummary + 'summary:'.length
    const nextIdx = Math.min(
      ...[idxSubjects, idxBackground, idxAnalysis].filter((i) => i > afterSummaryStart).concat([s.length])
    )
    eventsBlock = s.slice(afterSummaryStart, nextIdx).trim()
  }

  const events: string[] = eventsBlock
    ? eventsBlock
        .split(/\r?\n+/)
        .map((l) => l.replace(/^[-•\s]+/, '').trim())
        .filter(Boolean)
    : []

  const subjects: string[] = subjectsLine
    ? subjectsLine
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : []

  if (!summary) {
    summary = events[0] || background.split(/\.|!|\?/)[0]?.trim() || ''
  }

  if (!summary && !analysis && !background && events.length === 0 && subjects.length === 0) {
    return null
  }

  return { summary, events, subjects, background, analysis }
}
