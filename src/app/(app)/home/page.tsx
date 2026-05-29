'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Flame, Dumbbell, Clock, ChevronRight, MessageSquare,
  Zap, TrendingUp, Sparkles, CheckCircle, AlertCircle, Play, Activity as ActivityIcon,
  Camera, ScanLine, Barcode, Heart, AlertTriangle, Trophy, ArrowUp, ArrowDown,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const MealPhotoAnalyzer = dynamic(() => import('@/components/vision/MealPhotoAnalyzer'), { ssr: false })
const LabelScanner = dynamic(() => import('@/components/vision/LabelScanner'), { ssr: false })
const BarcodeScanner = dynamic(() => import('@/components/vision/BarcodeScanner'), { ssr: false })
import type { NutritionPlan, FitnessPlan } from '@/types/plans'
import type { WorkoutSession } from '@/types/workouts'
import type { ActivityLog } from '@/types/activities'
import { getLocalDate } from '@/types/nutrition'

interface TodayNutrition {
  calories_consumed: number
  calories_target: number
  protein_g: number
  protein_target_g: number
  water_ml: number
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const LOADING_MESSAGES = [
  'Analyzing your goals...',
  'Building your workout split...',
  'Calculating your nutrition targets...',
  'Customizing for your equipment...',
  'Almost ready...',
]

type GenerateState = 'idle' | 'generating' | 'success' | 'error'

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

export default function HomePage() {
  const [supabase] = useState(() => createClient())
  const [firstName, setFirstName] = useState<string | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null | undefined>(undefined)
  const [fitnessPlan, setFitnessPlan] = useState<FitnessPlan | null | undefined>(undefined)
  const [generateState, setGenerateState] = useState<GenerateState>('idle')
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  // Workout stats
  const [weekSessions, setWeekSessions] = useState<WorkoutSession[]>([])
  const [lastSession, setLastSession] = useState<WorkoutSession | null | undefined>(undefined)
  const [streak, setStreak] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)

  // Activity stats
  const [weekActiveMinutes, setWeekActiveMinutes] = useState(0)
  const [recentActivity, setRecentActivity] = useState<ActivityLog | null | undefined>(undefined)

  // Nutrition
  const [todayNutrition, setTodayNutrition] = useState<TodayNutrition | null>(null)
  const [visionMode, setVisionMode] = useState<'meal' | 'label' | 'barcode' | null>(null)

  // Progress data
  const [apexScore, setApexScore] = useState<number | null>(null)
  const [apexDelta, setApexDelta] = useState<number | null>(null)
  const [activeGoals, setActiveGoals] = useState<Array<{
    id: string; title: string; goal_type: string; target_date: string | null
    current_value: number | null; target_value: number | null; start_value: number | null
  }>>([])
  const [recentPRs, setRecentPRs] = useState<Array<{
    exercise_name: string; best_weight_kg: number; best_reps: number
  }>>([])

  // Joint health
  const [jointStatus, setJointStatus] = useState<{
    active_issues: Array<{ joint: string; side: string; pain_level: number; referral_recommended: boolean }>
    next_prehab_program: { program_name: string; estimated_duration_minutes: number; id: string } | null
    prehab_done_today: boolean
    prehab_streak: number
  } | null>(null)

  const hasPlans = nutritionPlan != null && fitnessPlan != null
  const plansLoading = nutritionPlan === undefined || fitnessPlan === undefined

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, nRes, fRes] = await Promise.all([
      supabase.from('user_profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('nutrition_plans').select('*').eq('user_id', user.id).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('fitness_plans').select('*').eq('user_id', user.id).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (profileRes.data?.full_name) setFirstName(profileRes.data.full_name.split(' ')[0])
    setNutritionPlan((nRes.data as NutritionPlan | null) ?? null)
    setFitnessPlan((fRes.data as FitnessPlan | null) ?? null)
  }, [supabase])

  const loadWorkoutStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatsLoading(false); return }

    const weekStart = getWeekStart()

    // Fetch this week's sessions + last session in parallel
    const [weekRes, lastRes, allRes] = await Promise.all([
      supabase.from('workout_sessions').select('*').eq('user_id', user.id)
        .not('completed_at', 'is', null).gte('started_at', weekStart)
        .order('started_at', { ascending: false }),
      supabase.from('workout_sessions').select('*').eq('user_id', user.id)
        .not('completed_at', 'is', null).order('started_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('workout_sessions').select('started_at').eq('user_id', user.id)
        .not('completed_at', 'is', null).order('started_at', { ascending: false }).limit(60),
    ])

    setWeekSessions((weekRes.data as WorkoutSession[]) ?? [])
    setLastSession((lastRes.data as WorkoutSession | null) ?? null)

    // Calculate streak
    if (allRes.data && allRes.data.length > 0) {
      const dates = allRes.data.map(s => {
        const d = new Date(s.started_at)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      })
      const uniqueDates = [...new Set(dates)].sort((a, b) => b - a)
      let s = 0
      let expected = new Date()
      expected.setHours(0, 0, 0, 0)
      for (const d of uniqueDates) {
        if (d === expected.getTime()) {
          s++
          expected.setDate(expected.getDate() - 1)
        } else if (d < expected.getTime()) break
      }
      setStreak(s)
    }

    setStatsLoading(false)
  }, [supabase])

  const loadActivityStats = useCallback(async () => {
    try {
      const [statsRes, { data: { user } }] = await Promise.all([
        fetch('/api/activities/stats'),
        supabase.auth.getUser(),
      ])
      if (statsRes.ok) {
        const data = (await statsRes.json()) as { this_week: { active_minutes: number } }
        setWeekActiveMinutes(data.this_week.active_minutes)
      }
      if (user) {
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        setRecentActivity((logs as ActivityLog | null) ?? null)
      }
    } catch {
      setRecentActivity(null)
    }
  }, [supabase])

  const loadNutritionSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/nutrition/daily-summary?date=${getLocalDate()}`)
      if (res.ok) {
        const data = await res.json() as {
          todays_nutrition: {
            calories_consumed: number
            calories_target: number
            protein_g: number
            protein_target_g: number
            water_ml: number
          }
        }
        setTodayNutrition(data.todays_nutrition)
      }
    } catch { /* silent */ }
  }, [])

  const loadJointStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/joint-health/status')
      if (res.ok) setJointStatus(await res.json())
    } catch { /* silent */ }
  }, [])

  const loadProgressData = useCallback(async () => {
    try {
      const [overviewRes, goalsRes, prsRes] = await Promise.all([
        fetch('/api/progress/overview'),
        fetch('/api/progress/goals'),
        supabase.from('exercise_history')
          .select('exercise_name, best_weight_kg, best_reps, personal_record_set_at')
          .gte('personal_record_set_at', new Date(Date.now() - 7 * 86400000).toISOString())
          .order('personal_record_set_at', { ascending: false })
          .limit(5),
      ])
      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setApexScore(data.apex_score ?? null)
        if (data.latest_recap?.apex_score != null && data.apex_score != null) {
          setApexDelta(data.apex_score - data.latest_recap.apex_score)
        }
      }
      if (goalsRes.ok) {
        const goals = await goalsRes.json()
        if (Array.isArray(goals)) {
          setActiveGoals(goals.filter((g: { is_active: boolean; is_achieved: boolean }) => g.is_active && !g.is_achieved).slice(0, 3))
        }
      }
      if (prsRes.data) setRecentPRs(prsRes.data)
    } catch { /* silent */ }
  }, [supabase])

  useEffect(() => {
    loadData()
    loadWorkoutStats()
    loadActivityStats()
    loadNutritionSummary()
    loadJointStatus()
    loadProgressData()
  }, [loadData, loadWorkoutStats, loadActivityStats, loadNutritionSummary, loadJointStatus, loadProgressData])

  useEffect(() => {
    if (generateState !== 'generating') return
    const iv = setInterval(() => setLoadingMessageIdx(i => (i + 1) % LOADING_MESSAGES.length), 1800)
    return () => clearInterval(iv)
  }, [generateState])

  const handleGeneratePlans = async () => {
    setGenerateState('generating')
    setLoadingMessageIdx(0)
    setErrorMsg('')
    try {
      const res = await fetch('/api/plans/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Generation failed')
      setNutritionPlan(data.nutritionPlan)
      setFitnessPlan(data.fitnessPlan)
      setGenerateState('success')
      setTimeout(() => setGenerateState('idle'), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setGenerateState('error')
      setTimeout(() => setGenerateState('idle'), 4000)
    }
  }

  // Derived stats
  const weekVolumeKg = weekSessions.reduce((sum, s) => sum + (s.total_volume_kg ?? 0), 0)
  const weekVolumeLbs = Math.round(weekVolumeKg * 2.205)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const todayWorkout = (() => {
    if (!fitnessPlan?.weekly_structure) return null
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    return fitnessPlan.weekly_structure.find(d => d.day === dayName) ?? null
  })()

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (hours < 1) return 'just now'
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="px-5 pt-14 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[#6B7280] text-xs mb-1">{today}</p>
          <h1 className="text-2xl font-bold font-space-grotesk text-[#F0F0FF] leading-tight">
            {getGreeting()},{' '}
            <span className="gradient-text">{firstName ?? 'there'}</span>
          </h1>
        </div>
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
        >
          <Zap size={18} className="text-white" fill="white" />
        </div>
      </div>

      {/* Plan generation banner */}
      {!plansLoading && !hasPlans && generateState === 'idle' && (
        <div
          className="rounded-card p-5 mb-5 border"
          style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(0,212,170,0.12))', borderColor: 'rgba(108,99,255,0.35)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-[#6C63FF]" />
            <p className="text-[#6C63FF] text-xs font-semibold uppercase tracking-wider">Your trainer is ready</p>
          </div>
          <h2 className="text-base font-bold font-space-grotesk text-[#F0F0FF] mb-1.5">Let&apos;s build your plan</h2>
          <p className="text-[#6B7280] text-xs leading-relaxed mb-4">
            APEX will generate a personalized workout split and nutrition targets based on your profile.
          </p>
          <button
            onClick={handleGeneratePlans}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            Generate My Plans
          </button>
        </div>
      )}

      {generateState === 'generating' && (
        <div className="rounded-card p-5 mb-5 border text-center" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(0,212,170,0.08))', borderColor: 'rgba(108,99,255,0.2)' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            {[0, 150, 300].map(delay => (
              <div key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)', animationDelay: `${delay}ms` }} />
            ))}
          </div>
          <p className="text-sm font-medium transition-all duration-500" style={{ color: '#6C63FF' }}>
            {LOADING_MESSAGES[loadingMessageIdx]}
          </p>
        </div>
      )}

      {generateState === 'success' && (
        <div className="rounded-card p-4 mb-5 border border-[#00D4AA]/30 bg-[#00D4AA]/10 flex items-center gap-3">
          <CheckCircle size={20} className="text-[#00D4AA] flex-shrink-0" />
          <p className="text-sm text-[#00D4AA] font-medium">Your plans are ready!</p>
        </div>
      )}

      {generateState === 'error' && (
        <div className="rounded-card p-4 mb-5 border border-red-500/30 bg-red-500/10 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{errorMsg || 'Generation failed. Please try again.'}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { icon: Dumbbell, label: 'workouts', value: statsLoading ? '—' : String(weekSessions.length), color: '#6C63FF' },
          { icon: ActivityIcon, label: 'active min', value: statsLoading ? '—' : String(weekActiveMinutes), color: '#FF6B35' },
          { icon: TrendingUp, label: 'lbs lifted', value: statsLoading ? '—' : weekVolumeLbs > 0 ? weekVolumeLbs >= 1000 ? `${(weekVolumeLbs / 1000).toFixed(1)}k` : String(weekVolumeLbs) : '0', color: '#00D4AA' },
          { icon: Flame, label: 'day streak', value: statsLoading ? '—' : String(streak), color: streak > 0 ? '#FF6B35' : '#6B7280' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-3.5 text-center">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${color}20` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-[#F0F0FF] text-xl font-bold font-space-grotesk leading-none mb-1">{value}</p>
            <p className="text-[#6B7280] text-[10px] leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* APEX Score widget */}
      {apexScore !== null && (
        <Link href="/progress">
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4 mb-4 active:opacity-80 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mini score ring */}
                <div className="relative flex items-center justify-center">
                  <svg width="52" height="52" className="-rotate-90">
                    <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle
                      cx="26" cy="26" r="20" fill="none"
                      stroke={apexScore >= 80 ? '#00D4AA' : apexScore >= 60 ? '#6C63FF' : apexScore >= 40 ? '#FECB02' : '#E63312'}
                      strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - apexScore / 100)}`}
                    />
                  </svg>
                  <span className="absolute text-xs font-black"
                    style={{ color: apexScore >= 80 ? '#00D4AA' : apexScore >= 60 ? '#6C63FF' : apexScore >= 40 ? '#FECB02' : '#E63312' }}>
                    {apexScore}
                  </span>
                </div>
                <div>
                  <p className="text-[#F0F0FF] text-sm font-semibold">APEX Score</p>
                  <p className="text-[#6B7280] text-xs">Your overall health score</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {apexDelta !== null && apexDelta !== 0 && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    apexDelta > 0 ? 'text-[#00D4AA] bg-[#00D4AA]/10' : 'text-[#E63312] bg-[#E63312]/10'
                  }`}>
                    {apexDelta > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    {Math.abs(apexDelta)}
                  </div>
                )}
                <ChevronRight size={16} className="text-[#6B7280]" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Today's workout */}
      <Link href="/train">
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4 mb-4 active:opacity-80 transition-opacity">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold font-space-grotesk text-[#F0F0FF]">Today&apos;s Workout</h2>
            <ChevronRight size={16} className="text-[#6B7280]" />
          </div>
          {plansLoading ? (
            <div className="h-10 bg-[#1E1E2E] rounded-xl animate-pulse" />
          ) : todayWorkout ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C63FF22, #00D4AA22)' }}>
                {todayWorkout.exercises.length > 0
                  ? <Play size={16} className="text-[#6C63FF]" fill="#6C63FF" />
                  : <CheckCircle size={16} className="text-[#00D4AA]" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#F0F0FF] text-sm font-medium">{todayWorkout.focus}</p>
                <p className="text-[#6B7280] text-xs">
                  {todayWorkout.exercises.length > 0
                    ? `${todayWorkout.exercises.length} exercises · ~${todayWorkout.session_duration_min ?? '—'} min`
                    : 'Rest & Recovery Day'}
                </p>
              </div>
              {todayWorkout.exercises.length > 0 && (
                <span
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                >
                  Start
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1E1E2E] flex items-center justify-center flex-shrink-0">
                <Dumbbell size={18} className="text-[#6B7280]" />
              </div>
              <p className="text-[#6B7280] text-xs">Generate your plans to see today&apos;s workout</p>
            </div>
          )}
        </div>
      </Link>

      {/* Last session card */}
      {lastSession !== undefined && (
        <Link href="/train/history">
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4 mb-4 active:opacity-80 transition-opacity">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold font-space-grotesk text-[#F0F0FF]">Last Session</h2>
              <ChevronRight size={16} className="text-[#6B7280]" />
            </div>
            {lastSession === null ? (
              <p className="text-[#6B7280] text-xs">No sessions yet — start your first workout!</p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#F0F0FF] text-sm font-medium truncate max-w-[180px]">{lastSession.session_name}</p>
                  <p className="text-[#6B7280] text-xs">{formatTimeAgo(lastSession.started_at)}</p>
                </div>
                <div className="text-right">
                  {lastSession.duration_minutes && (
                    <p className="text-[#6C63FF] text-sm font-bold">{lastSession.duration_minutes} min</p>
                  )}
                  {lastSession.total_volume_kg && (
                    <p className="text-[#6B7280] text-xs">{Math.round(lastSession.total_volume_kg * 2.205).toLocaleString()} lbs</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Recent Activity */}
      <Link href="/activity">
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4 mb-4 active:opacity-80 transition-opacity">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold font-space-grotesk text-[#F0F0FF]">Activity</h2>
            <ChevronRight size={16} className="text-[#6B7280]" />
          </div>
          {recentActivity === undefined ? (
            <div className="h-8 bg-[#1E1E2E] rounded-xl animate-pulse" />
          ) : recentActivity === null ? (
            <p className="text-[#6B7280] text-xs">No activity logged — tap to log your first</p>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#F0F0FF] text-sm font-medium truncate max-w-[180px]">{recentActivity.activity_name}</p>
                <p className="text-[#6B7280] text-xs">{formatTimeAgo(recentActivity.logged_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-[#FF6B35] text-sm font-bold">{recentActivity.duration_minutes} min</p>
                <p className="text-[#6B7280] text-xs">{recentActivity.calories_burned} cal</p>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Today's Nutrition */}
      <Link href="/nutrition">
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4 mb-4 active:opacity-80 transition-opacity">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold font-space-grotesk text-[#F0F0FF]">Today&apos;s Nutrition</h2>
            <ChevronRight size={16} className="text-[#6B7280]" />
          </div>
          {todayNutrition ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#FF6B35] text-sm font-bold">{todayNutrition.calories_consumed.toLocaleString()} kcal</span>
                <span className="text-[#6B7280] text-xs">/ {todayNutrition.calories_target.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((todayNutrition.calories_consumed / Math.max(todayNutrition.calories_target, 1)) * 100, 100)}%`,
                    background: todayNutrition.calories_consumed > todayNutrition.calories_target ? '#E63312' : 'linear-gradient(90deg, #FF6B35, #FECB02)',
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6C63FF]" />
                  <span className="text-[10px] text-[#6B7280]">{Math.round(todayNutrition.protein_g)}g / {todayNutrition.protein_target_g}g protein</span>
                </div>
                {todayNutrition.water_ml > 0 && (
                  <span className="text-[10px] text-[#38BDF8]">{(todayNutrition.water_ml / 1000).toFixed(1)}L water</span>
                )}
              </div>
            </div>
          ) : plansLoading ? (
            <div className="h-10 bg-[#1E1E2E] rounded-xl animate-pulse" />
          ) : (
            <p className="text-[#6B7280] text-xs">Log food to track your daily nutrition</p>
          )}
        </div>
      </Link>

      {/* Goal countdown */}
      {activeGoals.length > 0 && (
        <Link href="/progress">
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4 mb-4 active:opacity-80 transition-opacity">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold font-space-grotesk text-[#F0F0FF]">Active Goals</h2>
              <ChevronRight size={16} className="text-[#6B7280]" />
            </div>
            <div className="space-y-2.5">
              {activeGoals.slice(0, 2).map((goal) => {
                const progress = goal.target_value != null && goal.start_value != null && goal.current_value != null && goal.target_value !== goal.start_value
                  ? Math.min(100, Math.max(0, Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100)))
                  : null
                const daysLeft = goal.target_date
                  ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
                  : null
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-[#F0F0FF] font-medium truncate max-w-[200px]">{goal.title}</p>
                      {daysLeft !== null && daysLeft > 0 && (
                        <span className="text-[10px] text-[#6B7280] ml-2 shrink-0">{daysLeft}d left</span>
                      )}
                    </div>
                    {progress !== null && (
                      <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${progress}%`,
                            background: progress >= 80 ? '#00D4AA' : progress >= 50 ? '#6C63FF' : '#FECB02',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Link>
      )}

      {/* Recent PRs ticker */}
      {recentPRs.length > 0 && (
        <Link href="/progress">
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4 mb-4 active:opacity-80 transition-opacity">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-yellow-400" />
                <h2 className="text-sm font-semibold font-space-grotesk text-[#F0F0FF]">This Week&apos;s PRs</h2>
              </div>
              <ChevronRight size={16} className="text-[#6B7280]" />
            </div>
            <div className="space-y-1.5">
              {recentPRs.slice(0, 3).map((pr, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-xs text-[#F0F0FF] truncate max-w-[180px]">{pr.exercise_name}</p>
                  <p className="text-xs text-yellow-400 font-semibold shrink-0">
                    {Math.round(pr.best_weight_kg * 2.205)} lbs × {pr.best_reps}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Link>
      )}

      {/* AI Coach CTA */}
      <Link href="/coach">
        <div
          className="rounded-card p-4 mb-5 border active:opacity-80 transition-opacity"
          style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.10), rgba(0,212,170,0.10))', borderColor: 'rgba(108,99,255,0.25)' }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
              <MessageSquare size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[#F0F0FF]">Your AI Coach</h3>
              <p className="text-xs text-[#6B7280] truncate">Ask to adjust workouts, meals, anything</p>
            </div>
            <ChevronRight size={16} className="text-[#6B7280] flex-shrink-0" />
          </div>
        </div>
      </Link>

      {/* Quick Scan row */}
      <div className="mb-5">
        <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-2">Quick Scan</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Camera, label: 'Log Meal Photo', color: '#00D4AA', action: () => setVisionMode('meal') },
            { icon: Barcode, label: 'Scan Barcode', color: '#6C63FF', action: () => setVisionMode('barcode') },
            { icon: ScanLine, label: 'Scan Label', color: '#FF6B35', action: () => setVisionMode('label') },
          ].map(({ icon: Icon, label, color, action }) => (
            <button key={label} onClick={action}
              className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3 flex flex-col items-center gap-2 active:opacity-70 transition-opacity">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-[10px] text-[#6B7280] text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vision overlays */}
      {visionMode === 'meal' && (
        <MealPhotoAnalyzer onLogged={() => setVisionMode(null)} onClose={() => setVisionMode(null)} />
      )}
      {visionMode === 'barcode' && (
        <BarcodeScanner onLogged={() => setVisionMode(null)} onClose={() => setVisionMode(null)} />
      )}
      {visionMode === 'label' && (
        <LabelScanner onLogged={() => setVisionMode(null)} onClose={() => setVisionMode(null)} />
      )}

      {/* Body Status card */}
      {jointStatus && (
        <Link href="/joint-health">
          <div className={`rounded-card p-4 mb-4 border active:opacity-80 transition-opacity ${
            jointStatus.active_issues.some(i => i.referral_recommended)
              ? 'border-[#EE8100]/40 bg-[#EE8100]/6'
              : jointStatus.active_issues.length > 0
              ? 'border-[#FF6B35]/30 bg-[#FF6B35]/5'
              : 'bg-[#13131A] border-[#1E1E2E]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold font-space-grotesk text-[#F0F0FF]">Body Status</h2>
              <ChevronRight size={16} className="text-[#6B7280]" />
            </div>
            {jointStatus.active_issues.length === 0 ? (
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-[#00D4AA]" />
                <p className="text-[#00D4AA] text-sm font-medium">All clear — ready to train</p>
              </div>
            ) : (
              <div>
                {jointStatus.active_issues.some(i => i.referral_recommended) && (
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-[#EE8100]" />
                    <p className="text-[#EE8100] text-xs font-medium">Professional evaluation recommended</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {jointStatus.active_issues.slice(0, 3).map((issue, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: issue.pain_level >= 6 ? 'rgba(230,51,18,0.15)' : 'rgba(238,129,0,0.15)',
                        color: issue.pain_level >= 6 ? '#E63312' : '#EE8100',
                      }}>
                      {issue.side !== 'center' && issue.side !== 'both' ? `${issue.side} ` : ''}{issue.joint.replace('_', ' ')} · {issue.pain_level}/10
                    </span>
                  ))}
                  {jointStatus.active_issues.length > 3 && (
                    <span className="px-2.5 py-1 rounded-full text-xs text-white/40 bg-white/5">+{jointStatus.active_issues.length - 3} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Prehab reminder banner */}
      {jointStatus?.next_prehab_program && !jointStatus.prehab_done_today && (
        <Link href={`/joint-health/prehab/${jointStatus.next_prehab_program.id}`}>
          <div className="rounded-card p-3.5 mb-4 border border-[#6C63FF]/30 active:opacity-80 transition-opacity"
            style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.10), rgba(0,212,170,0.10))' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6C63FF]/20 flex items-center justify-center flex-shrink-0">
                <Heart size={16} className="text-[#6C63FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">Prehab due today</p>
                <p className="text-white/40 text-xs">{jointStatus.next_prehab_program.program_name} · {jointStatus.next_prehab_program.estimated_duration_minutes} min</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-xl text-white font-medium"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>Start</span>
            </div>
          </div>
        </Link>
      )}

      {/* This week strip */}
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold font-space-grotesk text-[#F0F0FF]">This Week</h2>
          <Clock size={14} className="text-[#6B7280]" />
        </div>
        <div className="flex justify-between">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
            const today = new Date().getDay()
            const dayIndex = i === 6 ? 0 : i + 1
            const isToday = dayIndex === today
            const isPast = (dayIndex < today && !(today === 0 && i === 6)) || (today === 0 && i < 6)

            const dayDate = new Date()
            dayDate.setDate(dayDate.getDate() - ((dayDate.getDay() + 6) % 7) + i)
            dayDate.setHours(0, 0, 0, 0)
            const nextDay = new Date(dayDate)
            nextDay.setDate(nextDay.getDate() + 1)
            const hasSession = weekSessions.some(s => {
              const sd = new Date(s.started_at)
              return sd >= dayDate && sd < nextDay
            })

            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className={`text-[10px] font-medium ${isToday ? 'text-[#6C63FF]' : 'text-[#6B7280]'}`}>{d}</span>
                <div
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                    hasSession ? 'border-[#00D4AA] bg-[#00D4AA]/20'
                    : isToday ? 'border-[#6C63FF] bg-[#6C63FF]/15'
                    : isPast ? 'border-[#1E1E2E] bg-[#1E1E2E]/50'
                    : 'border-[#1E1E2E] bg-transparent'
                  }`}
                >
                  {hasSession && <CheckCircle size={12} className="text-[#00D4AA]" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
