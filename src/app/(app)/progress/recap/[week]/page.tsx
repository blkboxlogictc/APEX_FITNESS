'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Share2, Trophy, Target, TrendingUp, Dumbbell, Flame, Zap, Activity, Star, ChevronRight } from 'lucide-react'

interface RecapData {
  id: string
  week_start: string
  week_end: string
  headline: string
  narrative: string
  highlights: string[]
  by_the_numbers: {
    workouts_completed: number
    total_volume_kg: number
    avg_daily_protein: number
    active_minutes: number
    nutrition_compliance: number
    prehab_sessions: number
  }
  what_worked: string[]
  focus_next_week: string[]
  coach_note: string
  apex_score: number
  score_breakdown: {
    consistency: number
    nutrition: number
    activity: number
    progression: number
    recovery: number
  }
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function ApexRing({ score }: { score: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#00D4AA' : score >= 60 ? '#6C63FF' : score >= 40 ? '#FECB02' : '#E63312'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="132" height="132" className="-rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="66" cy="66" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">APEX</span>
      </div>
    </div>
  )
}

function HighlightIcon({ text }: { text: string }) {
  const t = text.toLowerCase()
  if (t.includes('pr') || t.includes('record') || t.includes('personal')) return <Trophy className="text-yellow-400" size={20} />
  if (t.includes('workout') || t.includes('session') || t.includes('train')) return <Dumbbell className="text-violet-400" size={20} />
  if (t.includes('nutrition') || t.includes('protein') || t.includes('calor')) return <Target className="text-mint-400" size={20} />
  if (t.includes('streak') || t.includes('consist')) return <Flame className="text-orange-400" size={20} />
  if (t.includes('volume') || t.includes('progress')) return <TrendingUp className="text-blue-400" size={20} />
  return <Star className="text-yellow-400" size={20} />
}

export default function RecapDetailPage() {
  const params = useParams()
  const router = useRouter()
  const week = params.week as string

  const [recap, setRecap] = useState<RecapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    if (!week) return
    fetch(`/api/progress/recap?week=${week}`)
      .then(r => r.json())
      .then(d => {
        if (d && !d.error) setRecap(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [week])

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + 'T12:00:00')
    const e = new Date(end + 'T12:00:00')
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }

  const handleShare = async () => {
    if (!recap) return
    const text = `My APEX Week: ${recap.headline}\nScore: ${recap.apex_score}/100`
    if (navigator.share) {
      await navigator.share({ title: 'My APEX Weekly Recap', text })
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Loading your recap...</p>
        </div>
      </div>
    )
  }

  if (!recap) {
    return (
      <div className="min-h-screen bg-[#0D0D14] flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Recap not found.</p>
          <button onClick={() => router.back()} className="text-violet-400 text-sm">Go back</button>
        </div>
      </div>
    )
  }

  const scoreColors = {
    consistency: '#00D4AA',
    nutrition: '#6C63FF',
    activity: '#FECB02',
    progression: '#00A8FF',
    recovery: '#FF6B6B',
  }

  const nums = recap.by_the_numbers

  return (
    <div className="min-h-screen bg-[#0D0D14] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0D0D14]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 active:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm">Progress</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-violet-400 active:text-violet-300"
        >
          <Share2 size={16} />
          <span>{shared ? 'Copied!' : 'Share'}</span>
        </button>
      </div>

      <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto">
        {/* Week Label */}
        <p className="text-center text-sm text-gray-500 uppercase tracking-wider">
          {recap.week_start && recap.week_end ? formatDateRange(recap.week_start, recap.week_end) : `Week of ${week}`}
        </p>

        {/* Headline */}
        <h1 className="text-center text-2xl font-black leading-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-mint-400 bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
          {recap.headline}
        </h1>

        {/* APEX Score */}
        <div className="flex flex-col items-center gap-3 py-4">
          <ApexRing score={recap.apex_score} />
          <p className="text-sm text-gray-400">
            {recap.apex_score >= 85 ? 'Outstanding week' : recap.apex_score >= 70 ? 'Strong performance' : recap.apex_score >= 55 ? 'Solid effort' : 'Room to grow'}
          </p>
        </div>

        {/* Highlights */}
        {recap.highlights && recap.highlights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Highlights</h2>
            <div className="grid gap-3">
              {recap.highlights.map((h, i) => (
                <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center">
                    <HighlightIcon text={h} />
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">{h}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By the Numbers */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">By the Numbers</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Workouts', value: nums.workouts_completed, unit: '' },
              { label: 'Volume', value: `${Math.round((nums.total_volume_kg ?? 0) * 2.205).toLocaleString()}`, unit: 'lbs' },
              { label: 'Protein', value: Math.round(nums.avg_daily_protein ?? 0), unit: 'g/day' },
              { label: 'Active Min', value: Math.round(nums.active_minutes ?? 0), unit: 'min' },
              { label: 'Nutrition', value: Math.round(nums.nutrition_compliance ?? 0), unit: '%' },
              { label: 'Prehab', value: nums.prehab_sessions ?? 0, unit: 'sessions' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                <div className="text-xl font-black text-white">{value}</div>
                {unit && <div className="text-xs text-gray-500">{unit}</div>}
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Narrative */}
        {recap.narrative && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">From Your Coach</h2>
            <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/5 border border-violet-500/20 rounded-2xl p-5">
              <div className="space-y-3">
                {recap.narrative.split('\n\n').filter(Boolean).map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-gray-200">{para}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* What Worked */}
        {recap.what_worked && recap.what_worked.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00D4AA]" />
              What Worked
            </h2>
            <div className="space-y-2">
              {recap.what_worked.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-[#00D4AA]/5 border border-[#00D4AA]/20 rounded-xl p-3">
                  <Zap size={16} className="text-[#00D4AA] shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-200">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Focus Next Week */}
        {recap.focus_next_week && recap.focus_next_week.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6C63FF]" />
              Focus Next Week
            </h2>
            <div className="space-y-2">
              {recap.focus_next_week.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-[#6C63FF]/5 border border-[#6C63FF]/20 rounded-xl p-3">
                  <div className="shrink-0 w-5 h-5 rounded-full bg-[#6C63FF]/20 flex items-center justify-center text-xs font-bold text-[#6C63FF]">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-200">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coach's Eye */}
        {recap.coach_note && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Coach's Eye</h2>
            <div className="relative rounded-2xl p-[1px] overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
              <div className="bg-[#0D0D14] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
                    <Activity size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white">APEX Insight</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-200">{recap.coach_note}</p>
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown */}
        {recap.score_breakdown && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Score Breakdown</h2>
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5 space-y-4">
              <ScoreBar label="Consistency" value={recap.score_breakdown.consistency} color={scoreColors.consistency} />
              <ScoreBar label="Nutrition" value={recap.score_breakdown.nutrition} color={scoreColors.nutrition} />
              <ScoreBar label="Activity" value={recap.score_breakdown.activity} color={scoreColors.activity} />
              <ScoreBar label="Progression" value={recap.score_breakdown.progression} color={scoreColors.progression} />
              <ScoreBar label="Recovery" value={recap.score_breakdown.recovery} color={scoreColors.recovery} />
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => router.push('/progress')}
          className="w-full py-4 rounded-2xl border border-white/10 text-gray-400 text-sm font-medium flex items-center justify-center gap-2 active:bg-white/5 transition-colors"
        >
          <ChevronRight size={16} className="rotate-180" />
          Back to Progress
        </button>
      </div>
    </div>
  )
}
