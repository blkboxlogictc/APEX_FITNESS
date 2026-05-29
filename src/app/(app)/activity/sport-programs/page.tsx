'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import SportProgramCard from '@/components/activity/SportProgramCard'
import type { SportProgram } from '@/types/activities'

const SPORTS = [
  { id: 'golf', label: 'Golf' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'pickleball', label: 'Pickleball' },
  { id: 'running', label: 'Running' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'swimming', label: 'Swimming' },
  { id: 'hiking', label: 'Hiking' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'bjj_mma', label: 'BJJ / MMA' },
  { id: 'wrestling', label: 'Wrestling' },
  { id: 'volleyball', label: 'Volleyball' },
  { id: 'skiing', label: 'Skiing' },
  { id: 'baseball', label: 'Baseball' },
  { id: 'hockey', label: 'Hockey' },
  { id: 'lacrosse', label: 'Lacrosse' },
]

const SESSION_OPTIONS = [2, 3, 4, 5, 6]
const WEEK_OPTIONS = [4, 6, 8, 12, 16]

export default function SportProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms] = useState<SportProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Generator form
  const [sport, setSport] = useState('running')
  const [focus, setFocus] = useState('')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)
  const [durationWeeks, setDurationWeeks] = useState(8)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activities/sport-program')
      const data = (await res.json()) as { programs: SportProgram[] }
      setPrograms(data.programs ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/activities/sport-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          focus: focus.trim() || undefined,
          sessions_per_week: sessionsPerWeek,
          duration_weeks: durationWeeks,
        }),
      })
      const data = (await res.json()) as { program: SportProgram }
      if (data.program) {
        setPrograms((prev) => [data.program, ...prev.filter((p) => p.sport !== sport || !p.is_active)])
        setShowGenerator(false)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/activities/sport-program?id=${id}`, { method: 'DELETE' })
    setPrograms((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-14 pb-4 border-b border-[#1E1E2E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-2xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center active:opacity-70"
            >
              <ArrowLeft size={16} className="text-[#F0F0FF]" />
            </button>
            <h1 className="text-xl font-bold font-space-grotesk text-[#F0F0FF]">Sport Programs</h1>
          </div>
          <button
            onClick={() => setShowGenerator(true)}
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 pb-28">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-[#13131A] animate-pulse" />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🏅</div>
            <p className="text-[#F0F0FF] font-semibold mb-1">No programs yet</p>
            <p className="text-[#6B7280] text-sm mb-6">Generate a sport-specific training program tailored to you.</p>
            <button
              onClick={() => setShowGenerator(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              Generate Program
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((p) => (
              <SportProgramCard key={p.id} program={p} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Generate Sheet */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !generating && setShowGenerator(false)}
          />
          <div
            className="relative bg-[#13131A] rounded-t-3xl border-t border-[#1E1E2E] px-5 pt-5"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
          >
            <div className="w-10 h-1 bg-[#2E2E3E] rounded-full mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#F0F0FF]">Generate Program</h3>
              <button onClick={() => setShowGenerator(false)} disabled={generating}>
                <X size={18} className="text-[#6B7280]" />
              </button>
            </div>

            {/* Sport selector */}
            <div className="mb-4">
              <p className="text-xs text-[#6B7280] mb-2 font-medium">Sport</p>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSport(s.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      sport === s.id ? 'text-white' : 'bg-[#1E1E2E] text-[#6B7280]'
                    }`}
                    style={sport === s.id ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : {}}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus (optional) */}
            <div className="mb-4">
              <p className="text-xs text-[#6B7280] mb-2 font-medium">Specific Focus (optional)</p>
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. increase distance, competition prep, injury recovery…"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-3.5 py-2.5 text-sm text-[#F0F0FF] placeholder-[#6B7280] focus:outline-none focus:border-[#6C63FF]/50"
              />
            </div>

            {/* Sessions per week */}
            <div className="mb-4">
              <p className="text-xs text-[#6B7280] mb-2 font-medium">Sessions per Week</p>
              <div className="flex gap-2">
                {SESSION_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSessionsPerWeek(n)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      sessionsPerWeek === n ? 'text-white' : 'bg-[#1E1E2E] text-[#6B7280]'
                    }`}
                    style={sessionsPerWeek === n ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : {}}
                  >
                    {n}×
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="mb-6">
              <p className="text-xs text-[#6B7280] mb-2 font-medium">Program Duration</p>
              <div className="flex gap-2">
                {WEEK_OPTIONS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setDurationWeeks(w)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      durationWeeks === w ? 'text-white' : 'bg-[#1E1E2E] text-[#6B7280]'
                    }`}
                    style={durationWeeks === w ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : {}}
                  >
                    {w}w
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Building your program…
                </span>
              ) : (
                'Generate Program'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
