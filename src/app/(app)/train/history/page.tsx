'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Dumbbell, Trophy, MessageSquare } from 'lucide-react'
import type { WorkoutSession, WorkoutSet } from '@/types/workouts'

interface SessionWithSets extends WorkoutSession {
  sets?: WorkoutSet[]
  expanded?: boolean
}

export default function WorkoutHistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionWithSets[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const fetchSessions = async (p: number, replace = false) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const res = await fetch(`/api/workouts/sessions?page=${p}&limit=20`)
      const data = await res.json() as { sessions: WorkoutSession[]; hasMore: boolean }
      setSessions(prev => replace ? data.sessions : [...prev, ...data.sessions])
      setHasMore(data.hasMore)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchSessions(1, true)
  }, [])

  const toggleExpand = async (id: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s
      return { ...s, expanded: !s.expanded }
    }))

    const session = sessions.find(s => s.id === id)
    if (session && !session.sets) {
      const res = await fetch(`/api/workouts/sessions/${id}`)
      const data = await res.json() as { session: WorkoutSession; sets: WorkoutSet[] }
      setSessions(prev => prev.map(s => s.id === id ? { ...s, sets: data.sets } : s))
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatVolume = (kg: number | null) => {
    if (!kg) return '—'
    const lbs = Math.round(kg * 2.205)
    return `${lbs.toLocaleString()} lbs`
  }

  // Group sets by exercise
  const groupByExercise = (sets: WorkoutSet[]) => {
    const groups = new Map<string, WorkoutSet[]>()
    sets.forEach(s => {
      const key = s.exercise_name
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(s)
    })
    return groups
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-14 pb-4 border-b border-[#1E1E2E]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-2xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={16} className="text-[#F0F0FF]" />
          </button>
          <h1 className="text-xl font-bold font-space-grotesk text-[#F0F0FF]">Workout History</h1>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-5 py-4 pb-28 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#13131A] animate-pulse" />
          ))
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center mb-4">
              <Dumbbell size={24} className="text-[#6B7280]" />
            </div>
            <p className="text-[#F0F0FF] font-semibold mb-1">No sessions yet</p>
            <p className="text-[#6B7280] text-sm">Complete your first workout to see history</p>
          </div>
        ) : (
          sessions.map(session => {
            const date = formatDate(session.started_at)
            const grouped = session.sets ? groupByExercise(session.sets) : null

            return (
              <div key={session.id} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl overflow-hidden">
                {/* Session header */}
                <button
                  onClick={() => toggleExpand(session.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[#6B7280] text-[10px] font-medium uppercase tracking-wider mb-1">{date}</p>
                      <p className="text-[#F0F0FF] text-sm font-semibold leading-tight">{session.session_name}</p>
                    </div>
                    {session.expanded ? (
                      <ChevronUp size={16} className="text-[#6B7280] flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown size={16} className="text-[#6B7280] flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {session.duration_minutes && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} className="text-[#6B7280]" />
                        <span className="text-[#6B7280] text-xs">{session.duration_minutes} min</span>
                      </div>
                    )}
                    {session.total_volume_kg && (
                      <div className="flex items-center gap-1.5">
                        <Dumbbell size={11} className="text-[#6B7280]" />
                        <span className="text-[#6B7280] text-xs">{formatVolume(session.total_volume_kg)}</span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {session.expanded && (
                  <div className="px-4 pb-4 border-t border-[#1E1E2E]">
                    {/* AI Feedback */}
                    {session.ai_feedback && (
                      <div
                        className="mt-3 mb-4 p-3 rounded-xl border"
                        style={{ background: 'rgba(108,99,255,0.06)', borderColor: 'rgba(108,99,255,0.2)' }}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MessageSquare size={11} className="text-[#6C63FF]" />
                          <span className="text-[#6C63FF] text-[10px] font-semibold uppercase tracking-wider">APEX Feedback</span>
                        </div>
                        <p className="text-[#F0F0FF]/80 text-xs leading-relaxed">{session.ai_feedback}</p>
                      </div>
                    )}

                    {/* Sets by exercise */}
                    {session.sets === undefined ? (
                      <div className="py-4 flex justify-center">
                        <div className="w-5 h-5 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                      </div>
                    ) : grouped && grouped.size > 0 ? (
                      <div className="space-y-3 mt-3">
                        {Array.from(grouped.entries()).map(([exName, sets]) => (
                          <div key={exName}>
                            <p className="text-[#F0F0FF] text-xs font-semibold mb-1.5">{exName}</p>
                            <div className="space-y-1">
                              {sets.filter(s => s.completed).map((s, i) => {
                                const weight = s.weight_lbs
                                  ? `${s.weight_lbs} lbs`
                                  : s.weight_kg
                                  ? `${(s.weight_kg * 2.205).toFixed(1)} lbs`
                                  : 'BW'
                                return (
                                  <div key={s.id} className="flex items-center gap-2 text-xs text-[#6B7280]">
                                    <span className="w-5 text-center font-medium">{i + 1}</span>
                                    <span>{weight}</span>
                                    <span>×</span>
                                    <span>{s.actual_reps ?? '—'} reps</span>
                                    {s.rpe && (
                                      <span className="ml-auto text-[#6C63FF]">RPE {s.rpe}</span>
                                    )}
                                    {s.is_warmup && (
                                      <span className="text-[#FFB347] text-[9px]">W</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })
        )}

        {hasMore && (
          <button
            onClick={() => {
              const next = page + 1
              setPage(next)
              fetchSessions(next)
            }}
            disabled={loadingMore}
            className="w-full py-3 rounded-2xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium active:border-[#6C63FF] active:text-[#6C63FF] disabled:opacity-50 transition-colors"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  )
}
