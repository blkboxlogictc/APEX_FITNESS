'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, Dumbbell, Scale, Activity, Target, Trophy,
  ChevronRight, Plus, Camera, Calendar, Flame, Check,
  ChevronDown, X, Loader2, Star,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  body: { current_weight_lbs: number | null; weight_change_4_weeks: number | null; last_measurement_date: string | null }
  strength: { total_prs_all_time: number; prs_this_month: number; top_lifts: { exercise: string; weight_lbs: number; estimated_1rm: number; date: string }[] }
  workouts: { this_week: number; this_month: number; streak: number; longest_streak: number; total_all_time: number }
  nutrition: { avg_compliance_7_days: number; avg_calories_7_days: number; avg_protein_7_days: number; days_logged_this_week: number }
  activity: { minutes_this_week: number; calories_this_week: number; goal_minutes: number; goal_met: boolean }
  active_goals: Goal[]
  latest_recap: WeeklyRecap | null
}

interface WeeklyRecap {
  id: string
  week_start: string
  week_end: string
  headline: string | null
  ai_narrative: string | null
  highlights: string[]
  focus_areas: string[]
  apex_score: number
  recap_data: Record<string, unknown>
}

interface Goal {
  id: string
  goal_type: string
  title: string
  description: string | null
  target_value: number | null
  target_unit: string | null
  target_date: string | null
  current_value: number | null
  start_value: number | null
  is_active: boolean
  is_achieved: boolean
  coach_note: string | null
}

interface StrengthExercise {
  exercise_id: string
  exercise_name: string
  best_weight_lbs: number
  best_reps: number
  estimated_1rm: number
  total_sets_logged: number
  last_logged_at: string
  pr_date: string | null
}

interface StrengthPoint {
  date: string
  best_weight_lbs: number
  estimated_1rm_lbs: number
  volume: number
}

interface BodyPoint {
  measured_at: string
  weight_lbs: number | null
  ma_lbs: number | null
  body_fat_percent: number | null
}

interface NutritionPoint {
  date: string
  calories_target: number
  calories_consumed: number
  protein_target: number
  protein_consumed: number
  compliance_score: number
}

// ─── Chart theme helpers ──────────────────────────────────────────────────────

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#13131A',
  border: '1px solid #1E1E2E',
  borderRadius: 12,
  color: '#F0F0FF',
  fontSize: 12,
}

const CHART_GRID_COLOR = '#1E1E2E'
const CHART_AXIS_COLOR = '#6B7280'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function goalProgress(goal: Goal): number {
  if (!goal.target_value || !goal.start_value || !goal.current_value) return 0
  if (goal.goal_type === 'weight') {
    const total = Math.abs(goal.target_value - goal.start_value)
    const done = Math.abs(goal.current_value - goal.start_value)
    return Math.min(100, Math.round((done / total) * 100))
  }
  const total = goal.target_value - goal.start_value
  const done = (goal.current_value ?? goal.start_value) - goal.start_value
  if (total === 0) return goal.current_value >= goal.target_value ? 100 : 0
  return Math.min(100, Math.round((done / total) * 100))
}

const GOAL_TYPE_EMOJI: Record<string, string> = {
  event: '🎯', weight: '⚖️', strength: '🏋️', habit: '🔥', body_comp: '📏', custom: '✏️',
}

const MACRO_COLORS = ['#6C63FF', '#00D4AA', '#FF6B35']

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1E1E2E] rounded-xl ${className ?? ''}`} />
}

// ─── Empty chart state ────────────────────────────────────────────────────────

function EmptyChart({ message, height = 140 }: { message: string; height?: number }) {
  return (
    <div className="flex items-center justify-center text-center" style={{ height }}>
      <div>
        <TrendingUp size={28} className="text-[#1E1E2E] mx-auto mb-2" />
        <p className="text-white/20 text-xs">{message}</p>
      </div>
    </div>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'strength' | 'body' | 'nutrition' | 'activity' | 'goals'
const TABS: { id: Tab; label: string; icon: typeof TrendingUp }[] = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'strength', label: 'Strength', icon: Dumbbell },
  { id: 'body', label: 'Body', icon: Scale },
  { id: 'nutrition', label: 'Nutrition', icon: Flame },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'goals', label: 'Goals', icon: Target },
]

// ─── APEX Score Ring ──────────────────────────────────────────────────────────

function ApexScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const color = score >= 80 ? '#00D4AA' : score >= 60 ? '#6C63FF' : score >= 40 ? '#FF6B35' : '#E63312'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E1E2E" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-black text-3xl" style={{ color }}>{score}</span>
        <span className="text-white/30 text-xs">/ 100</span>
      </div>
    </div>
  )
}

// ─── Mini progress bar ─────────────────────────────────────────────────────────

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 text-xs w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-white text-xs font-medium w-7 text-right">{value}</span>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ data, onGenerateRecap, generatingRecap }: {
  data: OverviewData | null
  onGenerateRecap: () => void
  generatingRecap: boolean
}) {
  if (!data) return (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-44" /><Skeleton className="h-32" /><Skeleton className="h-28" />
    </div>
  )

  const thisWeekStart = (() => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d.toISOString().split('T')[0]
  })()

  const hasThisWeekRecap = data.latest_recap?.week_start === thisWeekStart

  return (
    <div className="space-y-4 mt-4">
      {/* APEX Score card */}
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-5">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-4">APEX Score</p>
        <div className="flex items-center gap-6 mb-4">
          <ApexScoreRing score={data.latest_recap?.apex_score ?? 0} />
          <div className="flex-1">
            <p className="text-white/50 text-sm mb-3">Score breakdown</p>
            <div className="space-y-2">
              <MiniBar label="Consistency" value={Math.min(100, data.workouts.streak * 10 + data.workouts.this_week * 15)} color="#6C63FF" />
              <MiniBar label="Nutrition" value={data.nutrition.avg_compliance_7_days} color="#00D4AA" />
              <MiniBar label="Activity" value={Math.min(100, Math.round((data.activity.minutes_this_week / 150) * 100))} color="#FF6B35" />
              <MiniBar label="Progression" value={Math.min(100, data.strength.prs_this_month * 20 + 40)} color="#FECB02" />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Recap card */}
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Weekly Recap</p>
          {data.latest_recap && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#6C63FF]/20 text-[#6C63FF]">
              Score: {data.latest_recap.apex_score}
            </span>
          )}
        </div>
        {data.latest_recap ? (
          <div>
            <p className="text-white/40 text-xs mb-1">{formatWeekRange(data.latest_recap.week_start)}</p>
            <p className="text-white font-semibold text-sm mb-3 leading-snug">
              &ldquo;{data.latest_recap.headline ?? 'Your week at a glance'}&rdquo;
            </p>
            {data.latest_recap.highlights.slice(0, 2).map((h, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <Check size={12} className="text-[#00D4AA] flex-shrink-0 mt-0.5" />
                <p className="text-white/60 text-xs">{h}</p>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <Link href={`/progress/recap/${data.latest_recap.week_start}`}
                className="flex-1 py-2 rounded-xl text-center text-xs font-medium bg-[#1E1E2E] text-white/60">
                Read Full Recap
              </Link>
              {!hasThisWeekRecap && (
                <button onClick={onGenerateRecap} disabled={generatingRecap}
                  className="flex-1 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
                  {generatingRecap ? 'Generating…' : 'Generate This Week'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-white/40 text-sm mb-3">No recap generated yet.</p>
            <button onClick={onGenerateRecap} disabled={generatingRecap}
              className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
              {generatingRecap ? 'Generating your recap…' : 'Generate This Week\'s Recap'}
            </button>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Day Streak', value: data.workouts.streak, icon: '🔥', color: '#FF6B35' },
          { label: 'Total Workouts', value: data.workouts.total_all_time, icon: '🏋️', color: '#6C63FF' },
          { label: 'Nutrition Compliance', value: `${data.nutrition.avg_compliance_7_days}%`, icon: '🍎', color: '#00D4AA' },
          { label: 'Active Min/Wk', value: data.activity.minutes_this_week, icon: '⚡', color: '#FECB02' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-white font-bold text-2xl mt-2" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent PRs */}
      {data.strength.top_lifts.length > 0 && (
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-xs uppercase tracking-wider">All-Time PRs</p>
            <Trophy size={14} className="text-[#FECB02]" />
          </div>
          <div className="space-y-2">
            {data.strength.top_lifts.map((lift, i) => (
              <div key={lift.exercise} className="flex items-center gap-3">
                <span className="text-[#FECB02] font-bold text-sm w-5">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{lift.exercise}</p>
                  <p className="text-white/40 text-xs">{formatDate(lift.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">{lift.weight_lbs} lbs</p>
                  <p className="text-white/40 text-xs">~{lift.estimated_1rm} 1RM</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals preview */}
      {data.active_goals.length > 0 && (
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-xs uppercase tracking-wider">Active Goals</p>
            <Link href="#goals" className="text-[#6C63FF] text-xs">View all</Link>
          </div>
          <div className="space-y-3">
            {data.active_goals.slice(0, 2).map((goal) => {
              const pct = goalProgress(goal)
              return (
                <div key={goal.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{GOAL_TYPE_EMOJI[goal.goal_type] ?? '🎯'}</span>
                    <p className="text-white text-sm font-medium flex-1">{goal.title}</p>
                    <span className="text-white/40 text-xs">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6C63FF, #00D4AA)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Strength Tab ─────────────────────────────────────────────────────────────

function StrengthTab() {
  const [exercises, setExercises] = useState<StrengthExercise[]>([])
  const [selected, setSelected] = useState<StrengthExercise | null>(null)
  const [chartData, setChartData] = useState<StrengthPoint[]>([])
  const [range, setRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'All'>('3M')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/progress/strength').then(r => r.json()).then((data: StrengthExercise[]) => {
      setExercises(data)
      if (data.length > 0) setSelected(data[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    const weeksMap = { '1M': 4, '3M': 13, '6M': 26, '1Y': 52, 'All': 200 }
    fetch(`/api/progress/strength?exercise_id=${selected.exercise_id}&weeks=${weeksMap[range]}`)
      .then(r => r.json())
      .then((data: StrengthPoint[]) => setChartData(data))
      .catch(() => setChartData([]))
  }, [selected, range])

  const filtered = exercises.filter((e) =>
    e.exercise_name.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) return (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-10" /><Skeleton className="h-48" /><Skeleton className="h-32" />
    </div>
  )

  return (
    <div className="space-y-4 mt-4">
      {/* Exercise selector */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#6C63FF]"
        />
      </div>

      {(search ? filtered : []).length > 0 && (
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-xl overflow-hidden max-h-40 overflow-y-auto">
          {(search ? filtered : exercises).slice(0, 8).map((ex) => (
            <button key={ex.exercise_id} onClick={() => { setSelected(ex); setSearch('') }}
              className="w-full px-4 py-3 text-left border-b border-[#1E1E2E] last:border-0 hover:bg-white/5">
              <p className="text-white text-sm">{ex.exercise_name}</p>
              <p className="text-white/40 text-xs">{ex.best_weight_lbs} lbs × {ex.best_reps} · {ex.total_sets_logged} sets logged</p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          {/* Current exercise header */}
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-bold text-lg">{selected.exercise_name}</p>
              {selected.pr_date && <Star size={16} className="text-[#FECB02]" fill="#FECB02" />}
            </div>
            <div className="flex gap-4 mt-3">
              {[
                { label: 'Best', value: `${selected.best_weight_lbs} lbs` },
                { label: 'Reps', value: `×${selected.best_reps}` },
                { label: 'Est. 1RM', value: `${selected.estimated_1rm} lbs` },
                { label: 'Sessions', value: String(selected.total_sets_logged) },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-white font-bold text-sm">{s.value}</p>
                  <p className="text-white/30 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="flex gap-1">
            {(['1M', '3M', '6M', '1Y', 'All'] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${range === r ? 'bg-[#6C63FF] text-white' : 'text-white/40 bg-[#13131A]'}`}>
                {r}
              </button>
            ))}
          </div>

          {/* Strength chart */}
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Estimated 1RM Progress</p>
            {chartData.length < 3 ? (
              <EmptyChart message="Keep logging to see your strength trend" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={((v: number) => [`${v} lbs`, 'Est. 1RM']) as any} labelFormatter={formatDate as any} />
                  <Line type="monotone" dataKey="estimated_1rm_lbs" stroke="#6C63FF" strokeWidth={2} dot={false} animationDuration={800} />
                  <Line type="monotone" dataKey="best_weight_lbs" stroke="#00D4AA" strokeWidth={1.5} dot={false} strokeDasharray="4 2" animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Volume chart */}
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Session Volume</p>
            {chartData.length < 2 ? (
              <EmptyChart message="Log more sets to see volume trend" height={100} />
            ) : (
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 9, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={((v: number) => [`${Math.round(v)} kg`, 'Volume']) as any} labelFormatter={formatDate as any} />
                  <Bar dataKey="volume" fill="#6C63FF" radius={[3, 3, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {exercises.length === 0 && !loading && (
        <div className="text-center py-12">
          <Dumbbell size={36} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No exercises logged yet</p>
          <p className="text-white/20 text-xs mt-1">Complete workouts to track strength progress</p>
        </div>
      )}

      {/* PR Hall of Fame */}
      {exercises.length > 0 && (
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-[#1E1E2E]">
            <Trophy size={14} className="text-[#FECB02]" />
            <p className="text-white font-semibold text-sm">PR Hall of Fame</p>
          </div>
          <div className="divide-y divide-[#1E1E2E]">
            {exercises.slice(0, 10).map((ex, i) => (
              <div key={ex.exercise_id} className="px-4 py-3 flex items-center gap-3">
                <span className={`text-xs font-bold w-6 ${i < 3 ? 'text-[#FECB02]' : 'text-white/30'}`}>#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-white text-sm">{ex.exercise_name}</p>
                  <p className="text-white/30 text-xs">{ex.pr_date ? formatDate(ex.pr_date) : 'Date unknown'}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">{ex.best_weight_lbs} lbs</p>
                  <p className="text-white/30 text-xs">~{ex.estimated_1rm} 1RM</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Body Tab ─────────────────────────────────────────────────────────────────

function BodyTab() {
  const [bodyData, setBodyData] = useState<{ measurements: BodyPoint[]; weight_series: BodyPoint[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWeightForm, setShowWeightForm] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [range, setRange] = useState<4 | 12 | 26>(12)

  useEffect(() => {
    fetch(`/api/progress/body?weeks=${range}`)
      .then(r => r.json())
      .then((data) => { setBodyData(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  const logWeight = async () => {
    const kg = parseFloat(weightInput) / 2.205
    if (!kg || isNaN(kg)) return
    setSaving(true)
    await fetch('/api/progress/body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: parseFloat(kg.toFixed(2)) }),
    })
    setSaving(false)
    setShowWeightForm(false)
    setWeightInput('')
    fetch(`/api/progress/body?weeks=${range}`).then(r => r.json()).then(setBodyData)
  }

  if (loading) return (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-48" /><Skeleton className="h-28" />
    </div>
  )

  const weightSeries = bodyData?.weight_series ?? []
  const lastWeight = weightSeries[weightSeries.length - 1]

  const trendRate = (() => {
    if (weightSeries.length < 2) return null
    const first = weightSeries[0].weight_lbs ?? 0
    const last_ = lastWeight?.weight_lbs ?? 0
    const weeks = weightSeries.length / 7
    return parseFloat(((last_ - first) / Math.max(1, weeks)).toFixed(1))
  })()

  return (
    <div className="space-y-4 mt-4">
      {/* Log weight FAB */}
      {showWeightForm ? (
        <div className="bg-[#13131A] border border-[#6C63FF]/40 rounded-2xl p-4">
          <p className="text-white font-semibold text-sm mb-3">Log Weight</p>
          <div className="flex gap-3">
            <input
              type="number" placeholder="lbs" value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-white text-lg font-bold text-center focus:outline-none focus:border-[#6C63FF]"
            />
            <button onClick={logWeight} disabled={saving}
              className="px-5 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setShowWeightForm(false)} className="p-3 text-white/40">
              <X size={18} />
            </button>
          </div>
          {weightSeries.slice(-3).reverse().map((p) => (
            <p key={p.measured_at} className="text-white/30 text-xs mt-2">
              {formatDate(p.measured_at)} — {p.weight_lbs} lbs
            </p>
          ))}
        </div>
      ) : (
        <button onClick={() => setShowWeightForm(true)}
          className="w-full py-3 rounded-xl text-sm font-medium border border-dashed border-[#6C63FF]/40 text-[#6C63FF]">
          + Log Today's Weight
        </button>
      )}

      {/* Current weight */}
      {lastWeight && (
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 flex items-center gap-4">
          <div>
            <p className="text-white/40 text-xs mb-1">Current Weight</p>
            <p className="text-white font-black text-3xl">{lastWeight.weight_lbs} <span className="text-white/30 text-base font-normal">lbs</span></p>
          </div>
          {trendRate !== null && (
            <div className="ml-auto text-right">
              <p className="text-white/40 text-xs mb-1">Weekly rate</p>
              <p className="font-bold text-lg" style={{ color: trendRate < -0.1 ? '#00D4AA' : trendRate > 0.1 ? '#FF6B35' : '#6B7280' }}>
                {trendRate > 0 ? '+' : ''}{trendRate} lbs/wk
              </p>
            </div>
          )}
        </div>
      )}

      {/* Time range */}
      <div className="flex gap-1">
        {([4, 12, 26] as const).map((w) => (
          <button key={w} onClick={() => setRange(w)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${range === w ? 'bg-[#6C63FF] text-white' : 'text-white/40 bg-[#13131A]'}`}>
            {w === 4 ? '1M' : w === 12 ? '3M' : '6M'}
          </button>
        ))}
      </div>

      {/* Weight chart */}
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Body Weight</p>
        {weightSeries.length < 3 ? (
          <EmptyChart message="Log your weight to see trends" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
              <XAxis dataKey="measured_at" tickFormatter={formatDate} tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={((v: number) => [`${v} lbs`, '']) as any} labelFormatter={formatDate as any} />
              <Line type="monotone" dataKey="weight_lbs" stroke="#1E1E2E" strokeWidth={1} dot={{ r: 2, fill: '#6C63FF' }} animationDuration={800} />
              <Line type="monotone" dataKey="ma_lbs" stroke="#00D4AA" strokeWidth={2} dot={false} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {trendRate !== null && (
          <p className="text-white/30 text-xs text-center mt-2">
            {Math.abs(trendRate) < 0.1 ? 'Maintaining weight' : trendRate < 0 ? `Losing ~${Math.abs(trendRate)} lbs/week` : `Gaining ~${trendRate} lbs/week`}
          </p>
        )}
      </div>

      {/* Progress Photos */}
      <Link href="/progress/photos">
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 flex items-center gap-3 active:opacity-80">
          <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/15 flex items-center justify-center">
            <Camera size={18} className="text-[#6C63FF]" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">Progress Photos</p>
            <p className="text-white/40 text-xs">Before & after comparisons</p>
          </div>
          <ChevronRight size={16} className="text-white/30" />
        </div>
      </Link>
    </div>
  )
}

// ─── Nutrition Tab ─────────────────────────────────────────────────────────────

function NutritionTab() {
  const [data, setData] = useState<NutritionPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/progress/strength') // reuse nutrition endpoint pattern
    fetch('/api/joint-health/status') // dummy — replace with actual nutrition endpoint
    // Load 4 weeks of compliance
    const load = async () => {
      try {
        const res = await fetch('/api/nutrition/daily-summary?date=' + new Date().toISOString().split('T')[0])
        if (res.ok) {
          const json = await res.json() as { weekly_targets?: { daily_calories: number; protein_g: number }; recent_days?: NutritionPoint[] }
          setData(json.recent_days ?? [])
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [])

  const avgCompliance = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.compliance_score, 0) / data.length)
    : 0

  const complianceLabel =
    avgCompliance >= 90 ? 'Excellent' :
    avgCompliance >= 75 ? 'Good' :
    avgCompliance >= 60 ? 'Developing' : 'Needs Focus'

  const complianceColor =
    avgCompliance >= 90 ? '#00D4AA' :
    avgCompliance >= 75 ? '#6C63FF' :
    avgCompliance >= 60 ? '#FF6B35' : '#E63312'

  const last7 = data.slice(-7)

  if (loading) return (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-32" />
    </div>
  )

  const macroData = data.length > 0
    ? [
        { name: 'Protein', value: Math.round(data.reduce((s, d) => s + d.protein_consumed, 0) / data.length) },
        { name: 'Carbs', value: 0 },
        { name: 'Fat', value: 0 },
      ]
    : []

  return (
    <div className="space-y-4 mt-4">
      {/* Compliance hero */}
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-5 text-center">
        <p className="text-white font-black text-4xl mb-1" style={{ color: complianceColor }}>{avgCompliance}%</p>
        <p className="text-white/60 text-sm">{complianceLabel} — last 30 days</p>
        <p className="text-white/30 text-xs mt-1">average nutrition compliance</p>
      </div>

      {/* Weekly compliance bars */}
      {last7.length > 0 && (
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Last 7 Days</p>
          <div className="flex items-end gap-1.5 h-16">
            {last7.map((d) => {
              const h = Math.max(4, (d.compliance_score / 100) * 64)
              const color = d.compliance_score >= 90 ? '#00D4AA' : d.compliance_score >= 70 ? '#6C63FF' : d.compliance_score >= 50 ? '#FF6B35' : '#E63312'
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md transition-all" style={{ height: h, background: color }} />
                  <span className="text-white/30 text-[9px]">{new Date(d.date).toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Calories trend */}
      {last7.length > 0 && (
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Calorie Trend</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={last7} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
              <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' })} tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={((v: number) => [`${Math.round(v)} kcal`, '']) as any} />
              <ReferenceLine y={last7[0]?.calories_target} stroke="#FF6B35" strokeDasharray="4 2" strokeWidth={1} />
              <Area type="monotone" dataKey="calories_consumed" stroke="#6C63FF" fill="#6C63FF20" strokeWidth={2} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center py-12">
          <Flame size={36} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No nutrition data yet</p>
          <p className="text-white/20 text-xs mt-1">Log your meals to track compliance</p>
        </div>
      )}
    </div>
  )
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab() {
  const [weeklyData, setWeeklyData] = useState<{ week_start: string; minutes: number; goal_minutes: number; met_goal: boolean }[]>([])
  const [activityLogs, setActivityLogs] = useState<{ logged_at: string; duration_minutes: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [weekRes, logsRes] = await Promise.all([
          fetch('/api/activities/stats'),
          fetch('/api/activities?limit=365'),
        ])
        if (weekRes.ok) {
          const d = await weekRes.json() as { weekly_trend?: { week_start: string; minutes: number }[] }
          setWeeklyData(
            (d.weekly_trend ?? []).map((w) => ({
              ...w,
              goal_minutes: 150,
              met_goal: w.minutes >= 150,
            })),
          )
        }
        if (logsRes.ok) {
          const logs = await logsRes.json() as { logged_at: string; duration_minutes: number }[]
          setActivityLogs(logs)
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [])

  // Build 52-week heatmap
  const heatmap = (() => {
    const logMap: Record<string, number> = {}
    for (const log of activityLogs) {
      const d = log.logged_at.split('T')[0]
      logMap[d] = (logMap[d] ?? 0) + log.duration_minutes
    }
    const today = new Date()
    const weeks: { date: string; minutes: number }[][] = []
    for (let w = 51; w >= 0; w--) {
      const week: { date: string; minutes: number }[] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(today)
        date.setDate(today.getDate() - w * 7 - (6 - d))
        const dateStr = date.toISOString().split('T')[0]
        week.push({ date: dateStr, minutes: logMap[dateStr] ?? 0 })
      }
      weeks.push(week)
    }
    return weeks
  })()

  const heatColor = (min: number) =>
    min === 0 ? '#1E1E2E' : min <= 30 ? '#2D4A3E' : min <= 60 ? '#00A882' : min <= 120 ? '#00D4AA' : '#7FFFEE'

  if (loading) return (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-48" /><Skeleton className="h-32" />
    </div>
  )

  return (
    <div className="space-y-4 mt-4">
      {/* Weekly bar chart */}
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Weekly Active Minutes</p>
        {weeklyData.length < 2 ? (
          <EmptyChart message="Log activities to see your weekly minutes" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData.slice(-8)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
              <XAxis dataKey="week_start" tickFormatter={formatDate} tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={((v: number) => [`${v} min`, 'Active']) as any} labelFormatter={formatDate as any} />
              <ReferenceLine y={150} stroke="#FF6B35" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'Goal', fill: '#FF6B35', fontSize: 9 }} />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]} animationDuration={800}>
                {weeklyData.slice(-8).map((entry, index) => (
                  <Cell key={index} fill={entry.met_goal ? '#00D4AA' : '#6C63FF40'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* GitHub-style heatmap */}
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Activity Heatmap</p>
        <div className="overflow-x-auto">
          <div className="flex gap-0.5 min-w-0">
            {heatmap.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: heatColor(day.minutes) }}
                    title={`${day.date}: ${day.minutes} min`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-white/30 text-xs">Less</span>
          {['#1E1E2E', '#2D4A3E', '#00A882', '#00D4AA', '#7FFFEE'].map((c) => (
            <div key={c} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
          ))}
          <span className="text-white/30 text-xs">More</span>
        </div>
      </div>

      {activityLogs.length === 0 && (
        <div className="text-center py-12">
          <Activity size={36} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No activities logged yet</p>
          <Link href="/activity" className="text-[#6C63FF] text-xs mt-2 block">Log your first activity →</Link>
        </div>
      )}
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

type GoalStep = 'type' | 'details' | 'loading' | 'done'

const GOAL_TYPES = [
  { id: 'event', emoji: '🎯', label: 'Event', desc: 'Marathon, competition, tournament' },
  { id: 'strength', emoji: '🏋️', label: 'Strength', desc: 'Hit a specific lift' },
  { id: 'weight', emoji: '⚖️', label: 'Weight', desc: 'Reach a target weight' },
  { id: 'body_comp', emoji: '📏', label: 'Body Comp', desc: 'Lose body fat' },
  { id: 'habit', emoji: '🔥', label: 'Habit', desc: 'Train X days per week' },
  { id: 'custom', emoji: '✏️', label: 'Custom', desc: 'Anything else' },
]

function GoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formStep, setFormStep] = useState<GoalStep>('type')
  const [selectedType, setSelectedType] = useState('')
  const [form, setForm] = useState({ title: '', target_value: '', target_unit: 'lbs', target_date: '', current_value: '', description: '' })
  const [saving, setSaving] = useState(false)

  const loadGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/progress/goals')
      if (res.ok) setGoals(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadGoals() }, [loadGoals])

  const createGoal = async () => {
    setSaving(true)
    setFormStep('loading')
    try {
      await fetch('/api/progress/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_type: selectedType,
          title: form.title,
          description: form.description || undefined,
          target_value: form.target_value ? parseFloat(form.target_value) : undefined,
          target_unit: form.target_unit || undefined,
          target_date: form.target_date || undefined,
          current_value: form.current_value ? parseFloat(form.current_value) : undefined,
          start_value: form.current_value ? parseFloat(form.current_value) : undefined,
        }),
      })
      await loadGoals()
      setFormStep('done')
      setTimeout(() => { setShowForm(false); setFormStep('type') }, 1500)
    } catch { /* silent */ }
    setSaving(false)
  }

  const markAchieved = async (goalId: string) => {
    await fetch(`/api/progress/goals/${goalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_achieved: true, is_active: false }),
    })
    loadGoals()
  }

  const active = goals.filter((g) => g.is_active && !g.is_achieved)
  const achieved = goals.filter((g) => g.is_achieved)

  if (loading) return (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-40" /><Skeleton className="h-40" />
    </div>
  )

  return (
    <div className="space-y-4 mt-4">
      {/* Add goal button */}
      <button onClick={() => { setShowForm(true); setFormStep('type') }}
        className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
        <Plus size={18} /> Add Goal
      </button>

      {/* Goal creation form */}
      {showForm && (
        <div className="bg-[#13131A] border border-[#6C63FF]/40 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-bold">New Goal</p>
            <button onClick={() => setShowForm(false)} className="text-white/40"><X size={18} /></button>
          </div>

          {formStep === 'type' && (
            <div className="grid grid-cols-2 gap-2">
              {GOAL_TYPES.map((t) => (
                <button key={t.id} onClick={() => { setSelectedType(t.id); setFormStep('details') }}
                  className="p-3 rounded-xl border border-[#1E1E2E] bg-[#0A0A0F] text-left active:border-[#6C63FF]">
                  <span className="text-2xl">{t.emoji}</span>
                  <p className="text-white font-medium text-sm mt-1">{t.label}</p>
                  <p className="text-white/40 text-xs leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          )}

          {formStep === 'details' && (
            <div className="space-y-3">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Goal Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={selectedType === 'strength' ? 'Squat 315 lbs' : selectedType === 'weight' ? 'Reach 180 lbs' : selectedType === 'event' ? 'Run a marathon' : 'My goal'}
                  className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6C63FF]" />
              </div>
              {(selectedType === 'strength' || selectedType === 'weight' || selectedType === 'body_comp') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Current</label>
                    <input type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })}
                      placeholder="0" className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6C63FF]" />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Target</label>
                    <input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                      placeholder="0" className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6C63FF]" />
                  </div>
                </div>
              )}
              {(selectedType === 'event' || selectedType === 'strength' || selectedType === 'weight') && (
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Target Date (optional)</label>
                  <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6C63FF]" />
                </div>
              )}
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Notes (optional)</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Any extra context…"
                  className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6C63FF]" />
              </div>
              <button onClick={createGoal} disabled={!form.title || saving}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
                Create Goal
              </button>
            </div>
          )}

          {formStep === 'loading' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 size={28} className="text-[#6C63FF] animate-spin" />
              <p className="text-white/50 text-sm">APEX is building your roadmap…</p>
            </div>
          )}

          {formStep === 'done' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-12 h-12 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
                <Check size={24} className="text-[#00D4AA]" />
              </div>
              <p className="text-white font-semibold">Goal created!</p>
            </div>
          )}
        </div>
      )}

      {/* Active goals */}
      {active.length === 0 && !showForm && (
        <div className="text-center py-12">
          <Target size={36} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No active goals</p>
          <p className="text-white/20 text-xs mt-1">Add a goal to track your progress</p>
        </div>
      )}

      {active.map((goal) => {
        const pct = goalProgress(goal)
        const daysLeft = goal.target_date ? daysUntil(goal.target_date) : null
        return (
          <div key={goal.id} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl mt-0.5">{GOAL_TYPE_EMOJI[goal.goal_type] ?? '🎯'}</span>
              <div className="flex-1">
                <p className="text-white font-semibold text-base">{goal.title}</p>
                {daysLeft !== null && (
                  <p className="text-white/40 text-xs mt-0.5">
                    {daysLeft > 0 ? `${daysLeft} days away` : daysLeft === 0 ? 'Today!' : 'Past deadline'}
                  </p>
                )}
              </div>
              <button onClick={() => markAchieved(goal.id)}
                className="text-white/20 text-xs px-2 py-1 rounded-lg border border-[#1E1E2E] hover:border-[#00D4AA] hover:text-[#00D4AA]">
                Done
              </button>
            </div>

            {(goal.current_value !== null && goal.target_value !== null) && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Start: {goal.start_value} {goal.target_unit}</span>
                  <span>Target: {goal.target_value} {goal.target_unit}</span>
                </div>
                <div className="h-2 bg-[#1E1E2E] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6C63FF, #00D4AA)' }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-white/40">Current: {goal.current_value} {goal.target_unit}</span>
                  <span className="text-white/60 font-medium">{pct}%</span>
                </div>
              </div>
            )}

            {goal.coach_note && (
              <div className="bg-[#6C63FF]/10 border border-[#6C63FF]/20 rounded-xl px-3 py-2.5">
                <p className="text-[#6C63FF] text-xs font-medium mb-0.5">Coach says</p>
                <p className="text-white/60 text-xs leading-relaxed">{goal.coach_note}</p>
              </div>
            )}
          </div>
        )
      })}

      {/* Achieved goals */}
      {achieved.length > 0 && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Achieved</p>
          <div className="space-y-2">
            {achieved.map((goal) => (
              <div key={goal.id} className="bg-[#13131A] border border-[#00D4AA]/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00D4AA]/15 flex items-center justify-center flex-shrink-0">
                  <Trophy size={14} className="text-[#00D4AA]" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{goal.title}</p>
                  <p className="text-white/40 text-xs">Achieved ✓</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [generatingRecap, setGeneratingRecap] = useState(false)
  const tabBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/progress/overview')
      .then((r) => r.json())
      .then((data: OverviewData) => setOverview(data))
      .catch(() => { /* silent */ })
  }, [])

  const generateRecap = async () => {
    setGeneratingRecap(true)
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const weekStart = monday.toISOString().split('T')[0]
    try {
      const res = await fetch('/api/progress/recap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart }),
      })
      if (res.ok) {
        const recap = await res.json() as { week_start: string }
        router.push(`/progress/recap/${recap.week_start}`)
      }
    } catch { /* silent */ }
    setGeneratingRecap(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur-sm border-b border-white/5">
        <div className="px-4 pt-safe-top pt-4 pb-1">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-white font-bold text-xl">Progress</h1>
            <Link href="/progress/recaps" className="text-white/30 text-xs flex items-center gap-1">
              <Calendar size={14} /> History
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div ref={tabBarRef} className="flex overflow-x-auto scrollbar-hide px-4 pb-3 gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                tab === id
                  ? 'bg-[#6C63FF] text-white'
                  : 'text-white/40 bg-[#13131A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {tab === 'overview' && (
          <OverviewTab data={overview} onGenerateRecap={generateRecap} generatingRecap={generatingRecap} />
        )}
        {tab === 'strength' && <StrengthTab />}
        {tab === 'body' && <BodyTab />}
        {tab === 'nutrition' && <NutritionTab />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'goals' && <GoalsTab />}
      </div>
    </div>
  )
}
