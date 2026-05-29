'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Clock, ChevronLeft, ChevronRight, Play,
  MessageSquare, History, Check, AlertTriangle, Zap, ScanEye, Activity, X,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const FormCheckAnalyzer = dynamic(() => import('@/components/vision/FormCheckAnalyzer'), { ssr: false })
import { createClient } from '@/lib/supabase/client'
import type { FitnessPlan, WorkoutDay } from '@/types/plans'
import type { ActiveExercise, LoggedSet, CompletionSummary } from '@/types/workouts'
import type { Exercise } from '@/lib/exercises'
import { findExerciseByName, getImageUrl, getMuscleColor } from '@/lib/exercises'
import RestTimer from '@/components/workout/RestTimer'
import SetLogger from '@/components/workout/SetLogger'
import ExerciseCard from '@/components/workout/ExerciseCard'
import ExercisePicker from '@/components/workout/ExercisePicker'
import WorkoutSummaryCard from '@/components/workout/WorkoutSummaryCard'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const OFFLINE_QUEUE_KEY = 'apex_offline_sets'
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%231E1E2E'/%3E%3Ccircle cx='40' cy='30' r='10' fill='%236B7280'/%3E%3Cellipse cx='40' cy='60' rx='16' ry='10' fill='%236B7280'/%3E%3C/svg%3E`

// ─── Types ────────────────────────────────────────────────────────────────────

type TrainView = 'plan' | 'active' | 'complete'

interface WorkoutExercise extends ActiveExercise {
  dbExercise?: Exercise
}

interface ActiveState {
  sessionId: string | null
  sessionName: string
  exercises: WorkoutExercise[]
  currentIdx: number
  setsByExercise: Record<string, LoggedSet[]>
  restTimer: { active: boolean; duration: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

function planToExercises(day: WorkoutDay): ActiveExercise[] {
  const result: ActiveExercise[] = []

  day.warmup.forEach((name, i) => {
    result.push({
      exercise_id: `warmup_${i}`,
      exercise_name: name,
      sets: 1,
      rep_range: '30–60 sec',
      rest_seconds: 30,
      rpe_target: 5,
      coaching_notes: '',
      modification_if_pain: '',
      is_warmup: true,
    })
  })

  day.exercises.forEach(e => {
    result.push({
      exercise_id: e.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      exercise_name: e.name,
      sets: e.sets,
      rep_range: String(e.reps),
      rest_seconds: e.rest_seconds,
      rpe_target: e.rpe ? parseFloat(e.rpe) : 7,
      coaching_notes: e.coaching_notes ?? '',
      modification_if_pain: e.modifications ?? '',
    })
  })

  day.cooldown.forEach((name, i) => {
    result.push({
      exercise_id: `cooldown_${i}`,
      exercise_name: name,
      sets: 1,
      rep_range: '30–60 sec',
      rest_seconds: 0,
      rpe_target: 3,
      coaching_notes: '',
      modification_if_pain: '',
      is_cooldown: true,
    })
  })

  return result
}

function initSets(exercise: WorkoutExercise): LoggedSet[] {
  return Array.from({ length: exercise.sets }, (_, i) => ({
    localId: `${exercise.exercise_id}_${i}_${Date.now()}`,
    set_number: i + 1,
    weight: '',
    actual_reps: '',
    rpe: null,
    completed: false,
    synced: false,
  }))
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

async function syncOfflineQueue() {
  const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
  if (!raw) return
  const queue: object[] = JSON.parse(raw)
  if (queue.length === 0) return
  const done: number[] = []
  for (let i = 0; i < queue.length; i++) {
    try {
      const res = await fetch('/api/workouts/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue[i]),
      })
      if (res.ok) done.push(i)
    } catch { break }
  }
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.filter((_, i) => !done.includes(i))))
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrainPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [view, setView] = useState<TrainView>('plan')

  // Plan view
  const [fitnessPlan, setFitnessPlan] = useState<FitnessPlan | null | undefined>(undefined)
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayDayIndex())
  const [dbExercises, setDbExercises] = useState<Record<string, Exercise>>({})
  const [swapTarget, setSwapTarget] = useState<{ idx: number; muscle: string } | null>(null)
  const [userEquipment, setUserEquipment] = useState<string[]>([])

  // Active workout
  const [active, setActive] = useState<ActiveState | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const [showFormCheck, setShowFormCheck] = useState(false)
  const [showPainCheck, setShowPainCheck] = useState(false)
  const [painCheckJoint, setPainCheckJoint] = useState('knee')
  const [painCheckLevel, setPainCheckLevel] = useState(0)
  const touchStartX = useRef(0)

  // Complete screen
  const [summary, setSummary] = useState<CompletionSummary | null>(null)
  const [weightUnit] = useState<'lbs' | 'kg'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('apex_weight_unit') as 'lbs' | 'kg') ?? 'lbs'
    }
    return 'lbs'
  })

  // ── Load plan & profile ──────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [planRes, profileRes] = await Promise.all([
        supabase.from('fitness_plans').select('*').eq('user_id', user.id)
          .eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('user_profiles').select('available_equipment').eq('id', user.id).single(),
      ])
      setFitnessPlan((planRes.data as FitnessPlan | null) ?? null)
      if (profileRes.data?.available_equipment) {
        setUserEquipment(profileRes.data.available_equipment as string[])
      }
    }
    load()
  }, [supabase])

  // ── Enrich plan exercises with DB data ───────────────────────────────────

  const currentDayPlan = fitnessPlan?.weekly_structure?.find(
    d => d.day.toLowerCase() === DAY_NAMES[selectedDayIdx].toLowerCase()
  ) ?? null

  useEffect(() => {
    if (!currentDayPlan || currentDayPlan.exercises.length === 0) return
    Promise.all(currentDayPlan.exercises.map(e => findExerciseByName(e.name))).then(results => {
      const map: Record<string, Exercise> = {}
      results.forEach((ex, i) => { if (ex) map[currentDayPlan.exercises[i].name] = ex })
      setDbExercises(map)
    })
  }, [selectedDayIdx, fitnessPlan]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session elapsed timer ────────────────────────────────────────────────

  useEffect(() => {
    if (view !== 'active') return
    const startTime = Date.now()
    let offset = 0
    const hiddenAt = { value: null as number | null }
    const handleVisibility = () => {
      if (document.hidden) { hiddenAt.value = Date.now() }
      else if (hiddenAt.value !== null) { offset += Date.now() - hiddenAt.value; hiddenAt.value = null }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    const timer = setInterval(() => {
      if (!document.hidden) setElapsedSeconds(Math.floor((Date.now() - startTime - offset) / 1000))
    }, 1000)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', handleVisibility) }
  }, [view])

  // ── Offline sync ─────────────────────────────────────────────────────────

  useEffect(() => {
    const onOnline = () => syncOfflineQueue()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  // ── Start workout ────────────────────────────────────────────────────────

  const startWorkout = useCallback(async () => {
    if (!currentDayPlan) return

    const exercises = planToExercises(currentDayPlan)
    const enriched: WorkoutExercise[] = exercises.map(ex => ({
      ...ex,
      dbExercise: dbExercises[ex.exercise_name] ?? undefined,
    }))

    const initialSets: Record<string, LoggedSet[]> = {}
    enriched.filter(ex => !ex.is_warmup && !ex.is_cooldown).forEach(ex => {
      initialSets[ex.exercise_id] = initSets(ex)
    })

    let sessionId: string | null = null
    try {
      const res = await fetch('/api/workouts/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_name: `${currentDayPlan.focus} — ${DAY_NAMES[selectedDayIdx]}`,
          plan_day_reference: `${DAY_NAMES[selectedDayIdx]} - ${currentDayPlan.focus}`,
        }),
      })
      const data = await res.json() as { session: { id: string } }
      sessionId = data.session.id
    } catch { /* offline */ }

    setActive({
      sessionId,
      sessionName: currentDayPlan.focus,
      exercises: enriched,
      currentIdx: 0,
      setsByExercise: initialSets,
      restTimer: { active: false, duration: 0 },
    })
    setElapsedSeconds(0)
    setImgIndex(0)
    setView('active')
  }, [currentDayPlan, dbExercises, selectedDayIdx])

  // ── Set actions ──────────────────────────────────────────────────────────

  const updateSet = useCallback((exId: string, localId: string, field: 'weight' | 'actual_reps' | 'rpe', value: string | number) => {
    setActive(prev => {
      if (!prev) return prev
      return {
        ...prev,
        setsByExercise: {
          ...prev.setsByExercise,
          [exId]: (prev.setsByExercise[exId] ?? []).map(s =>
            s.localId === localId ? { ...s, [field]: value } : s
          ),
        },
      }
    })
  }, [])

  const completeSet = useCallback((exId: string, localId: string) => {
    setActive(prev => {
      if (!prev) return prev
      const sets = prev.setsByExercise[exId] ?? []
      const set = sets.find(s => s.localId === localId)
      if (!set || set.completed) return prev
      const ex = prev.exercises.find(e => e.exercise_id === exId)

      const weightVal = parseFloat(set.weight) || 0
      const weightKg = weightUnit === 'lbs' ? weightVal * 0.453592 : weightVal
      const weightLbs = weightUnit === 'lbs' ? weightVal : weightVal * 2.205

      const payload = {
        session_id: prev.sessionId,
        exercise_id: exId,
        exercise_name: ex?.exercise_name ?? '',
        set_number: set.set_number,
        target_reps: ex ? parseInt(String(ex.rep_range).split(/[-–]/)[0]) || null : null,
        actual_reps: parseInt(set.actual_reps) || null,
        weight_kg: weightKg || null,
        weight_lbs: weightLbs || null,
        rpe: set.rpe,
        is_warmup: ex?.is_warmup ?? false,
        completed: true,
      }

      if (!prev.sessionId || !navigator.onLine) {
        const q: object[] = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]')
        q.push(payload)
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q))
      } else {
        fetch('/api/workouts/sets', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        }).catch(() => {
          const q: object[] = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]')
          q.push(payload)
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q))
        })
      }

      navigator.vibrate?.(50)
      const restDuration = ex?.rest_seconds ?? 90
      return {
        ...prev,
        setsByExercise: {
          ...prev.setsByExercise,
          [exId]: sets.map(s => s.localId === localId ? { ...s, completed: true } : s),
        },
        restTimer: restDuration > 0 ? { active: true, duration: restDuration } : prev.restTimer,
      }
    })
  }, [weightUnit])

  const addSet = useCallback((exId: string) => {
    setActive(prev => {
      if (!prev) return prev
      const sets = prev.setsByExercise[exId] ?? []
      const last = sets[sets.length - 1]
      const newSet: LoggedSet = {
        localId: `${exId}_add_${Date.now()}`,
        set_number: sets.length + 1,
        weight: last?.weight ?? '',
        actual_reps: '',
        rpe: null,
        completed: false,
        synced: false,
      }
      return { ...prev, setsByExercise: { ...prev.setsByExercise, [exId]: [...sets, newSet] } }
    })
  }, [])

  const deleteSet = useCallback((exId: string, localId: string) => {
    setActive(prev => {
      if (!prev) return prev
      return {
        ...prev,
        setsByExercise: {
          ...prev.setsByExercise,
          [exId]: (prev.setsByExercise[exId] ?? []).filter(s => s.localId !== localId),
        },
      }
    })
  }, [])

  // ── Finish workout ───────────────────────────────────────────────────────

  const finishWorkout = useCallback(async () => {
    if (!active) return
    setIsCompleting(true)
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60))

    const exerciseSummary = active.exercises
      .filter(ex => !ex.is_cooldown)
      .map(ex => {
        const sets = (active.setsByExercise[ex.exercise_id] ?? []).filter(s => s.completed)
        const weights = sets.map(s => {
          const w = parseFloat(s.weight) || 0
          return weightUnit === 'lbs' ? w * 0.453592 : w
        })
        const reps = sets.map(s => parseInt(s.actual_reps) || 0)
        return {
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          sets_completed: sets.length,
          best_weight_kg: weights.length > 0 ? Math.max(0, ...weights) : 0,
          best_reps: reps.length > 0 ? Math.max(0, ...reps) : 0,
          is_warmup: ex.is_warmup ?? false,
        }
      })

    try {
      const res = await fetch('/api/workouts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: active.sessionId, duration_minutes: durationMinutes, exercise_summary: exerciseSummary }),
      })
      const data = await res.json() as { summary: CompletionSummary }
      setSummary(data.summary)
    } catch {
      setSummary({
        sessionId: active.sessionId ?? '',
        duration_minutes: durationMinutes,
        total_volume_kg: 0,
        total_volume_lbs: 0,
        exercises_count: exerciseSummary.filter(e => !e.is_warmup).length,
        sets_count: exerciseSummary.reduce((a, e) => a + e.sets_completed, 0),
        prs_broken: [],
        ai_feedback: 'Great work completing this session! Keep the momentum going.',
      })
    }

    import('canvas-confetti').then(m => {
      m.default({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#6C63FF', '#00D4AA', '#FF6B35', '#FFB347'] })
    }).catch(() => {})

    setIsCompleting(false)
    setView('complete')
  }, [active, elapsedSeconds, weightUnit])

  // ─── Derived ─────────────────────────────────────────────────────────────

  const totalCompletedSets = active
    ? Object.values(active.setsByExercise).flat().filter(s => s.completed).length
    : 0

  const currentExercise = active?.exercises[active.currentIdx]
  const currentSets = active && currentExercise
    ? (active.setsByExercise[currentExercise.exercise_id] ?? [])
    : []
  const currentDbEx = currentExercise?.dbExercise ?? null
  const currentImages = currentDbEx?.images ?? []

  // ─── RENDER ──────────────────────────────────────────────────────────────

  // ── State C: Complete ────────────────────────────────────────────────────

  if (view === 'complete' && summary) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] px-5 pt-14 pb-8 flex flex-col">
        <div className="flex flex-col items-center mb-8 mt-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            <Check size={36} className="text-white" strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-bold font-space-grotesk text-[#F0F0FF] mb-1">
            Workout Complete!
          </h1>
          <p className="text-[#6B7280] text-sm">{active?.sessionName}</p>
        </div>

        <WorkoutSummaryCard summary={summary} weightUnit={weightUnit} />

        {summary.ai_feedback && (
          <div
            className="mt-4 p-4 rounded-2xl border"
            style={{ background: 'rgba(108,99,255,0.08)', borderColor: 'rgba(108,99,255,0.25)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-[#6C63FF]" />
              <span className="text-[#6C63FF] text-xs font-semibold uppercase tracking-wider">APEX Coach</span>
            </div>
            <p className="text-[#F0F0FF]/90 text-sm leading-relaxed">{summary.ai_feedback}</p>
          </div>
        )}

        <div className="mt-auto pt-6 space-y-3">
          <button
            onClick={() => router.push('/home')}
            className="w-full py-4 rounded-2xl font-semibold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            Back to Home
          </button>
          <button
            onClick={() => { setActive(null); setSummary(null); setView('plan') }}
            className="w-full py-3.5 rounded-2xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium active:opacity-70"
          >
            View Plan
          </button>
        </div>
      </div>
    )
  }

  // ── State B: Active workout ──────────────────────────────────────────────

  if (view === 'active' && active) {
    const allEx = active.exercises
    const exTotal = allEx.length
    const exProgress = active.currentIdx + 1

    return (
      <div className="flex flex-col h-screen bg-[#0A0A0F] overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-14 pb-3 border-b border-[#1E1E2E]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[#6B7280] text-[10px] uppercase tracking-wider font-medium mb-0.5">
                {exProgress} of {exTotal}
              </p>
              <h2 className="text-base font-bold font-space-grotesk text-[#F0F0FF]">
                {active.sessionName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPainCheck(true)}
                className="p-2 rounded-xl bg-[#13131A] border border-[#EE8100]/40 text-[#EE8100]"
                title="Pain check"
              >
                <Activity size={18} />
              </button>
              <button
                onClick={() => setShowFormCheck(true)}
                className="p-2 rounded-xl bg-[#13131A] border border-[#1E1E2E] text-[#6C63FF]"
                title="Check form"
              >
                <ScanEye size={18} />
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13131A] border border-[#1E1E2E]">
                <Clock size={12} className="text-[#6C63FF]" />
                <span className="text-[#F0F0FF] text-sm font-bold font-space-grotesk tabular-nums">
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>
          <div className="h-1 bg-[#1E1E2E] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(exProgress / exTotal) * 100}%`, background: 'linear-gradient(90deg, #6C63FF, #00D4AA)' }}
            />
          </div>
        </div>

        {/* Exercise panel */}
        <div className="flex-1 overflow-y-auto relative">
          {active.restTimer.active && (
            <RestTimer
              duration={active.restTimer.duration}
              onComplete={() => setActive(p => p ? { ...p, restTimer: { active: false, duration: 0 } } : p)}
              onSkip={() => setActive(p => p ? { ...p, restTimer: { active: false, duration: 0 } } : p)}
            />
          )}

          {currentExercise && (
            <div className="px-5 pt-4 pb-6">
              {(currentExercise.is_warmup || currentExercise.is_cooldown) && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                  style={{ background: '#FFB34720', color: '#FFB347' }}
                >
                  {currentExercise.is_warmup ? 'Warm-up' : 'Cool-down'}
                </div>
              )}

              <h3 className="text-xl font-bold font-space-grotesk text-[#F0F0FF] mb-1">
                {currentExercise.exercise_name}
              </h3>
              <p className="text-[#6B7280] text-sm mb-4">
                {currentExercise.is_warmup || currentExercise.is_cooldown
                  ? currentExercise.rep_range
                  : `${currentExercise.sets} sets × ${currentExercise.rep_range} reps · ${currentExercise.rest_seconds}s rest`}
              </p>

              {/* Image carousel */}
              {currentImages.length > 0 && (
                <div
                  className="w-full h-48 rounded-2xl overflow-hidden bg-[#13131A] mb-4 relative"
                  onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
                  onTouchEnd={e => {
                    const dx = e.changedTouches[0].clientX - touchStartX.current
                    if (Math.abs(dx) > 40) {
                      if (dx < 0 && imgIndex < currentImages.length - 1) setImgIndex(i => i + 1)
                      if (dx > 0 && imgIndex > 0) setImgIndex(i => i - 1)
                    }
                  }}
                >
                  <img
                    src={currentDbEx ? getImageUrl(currentDbEx, imgIndex) : PLACEHOLDER_SVG}
                    alt={currentExercise.exercise_name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG }}
                  />
                  {currentImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {currentImages.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentExercise.coaching_notes && (
                <p className="text-[#6B7280] text-xs leading-relaxed mb-3">{currentExercise.coaching_notes}</p>
              )}

              {currentExercise.modification_if_pain && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                  <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300 text-xs leading-relaxed">{currentExercise.modification_if_pain}</p>
                </div>
              )}

              {!currentExercise.is_warmup && !currentExercise.is_cooldown && (
                <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 mb-4">
                  <SetLogger
                    sets={currentSets}
                    targetReps={currentExercise.rep_range}
                    weightUnit={weightUnit}
                    onUpdate={(localId, field, value) => updateSet(currentExercise.exercise_id, localId, field, value)}
                    onComplete={localId => completeSet(currentExercise.exercise_id, localId)}
                    onDelete={localId => deleteSet(currentExercise.exercise_id, localId)}
                    onAddSet={() => addSet(currentExercise.exercise_id)}
                  />
                </div>
              )}

              {(currentExercise.is_warmup || currentExercise.is_cooldown) && (
                <button
                  onClick={() => {
                    const next = active.currentIdx + 1
                    if (next < active.exercises.length) {
                      setActive(p => p ? { ...p, currentIdx: next } : p)
                      setImgIndex(0)
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                >
                  Done — Next Exercise
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-[#1E1E2E] bg-[#0A0A0F]">
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => { if (active.currentIdx > 0) { setActive(p => p ? { ...p, currentIdx: p.currentIdx - 1 } : p); setImgIndex(0) } }}
              disabled={active.currentIdx === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium disabled:opacity-30 active:opacity-70"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <button
              onClick={() => {
                const next = active.currentIdx + 1
                if (next < active.exercises.length) { setActive(p => p ? { ...p, currentIdx: next } : p); setImgIndex(0) }
              }}
              disabled={active.currentIdx >= active.exercises.length - 1}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium disabled:opacity-30 active:opacity-70"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={finishWorkout}
            disabled={totalCompletedSets === 0 || isCompleting}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white disabled:opacity-40 active:opacity-80"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            {isCompleting ? 'Saving...' : `Finish Workout${totalCompletedSets > 0 ? ` (${totalCompletedSets} sets)` : ''}`}
          </button>
        </div>

        {/* Pain check modal */}
        {showPainCheck && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowPainCheck(false)}>
            <div className="w-full max-w-md bg-[#13131A] border border-[#1E1E2E] rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">Pain Check</h3>
                <button onClick={() => setShowPainCheck(false)} className="text-white/40"><X size={20} /></button>
              </div>

              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Where does it hurt?</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {['knee', 'lower_back', 'shoulder', 'hip', 'ankle', 'wrist', 'elbow', 'neck', 'upper_back'].map(j => (
                  <button key={j} onClick={() => setPainCheckJoint(j)}
                    className={`py-2 px-3 rounded-xl border text-xs transition-all ${painCheckJoint === j ? 'border-[#EE8100] bg-[#EE8100]/15 text-[#EE8100]' : 'border-[#1E1E2E] bg-[#0A0A0F] text-white/50'}`}>
                    {j.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Pain level (0–10)</p>
              <div className="flex items-center gap-4 mb-2">
                <input type="range" min={0} max={10} value={painCheckLevel}
                  onChange={e => setPainCheckLevel(Number(e.target.value))}
                  className="flex-1 accent-[#EE8100]" />
                <span className="text-white font-bold text-xl w-6 text-center">{painCheckLevel}</span>
              </div>

              {painCheckLevel >= 6 && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-[#E63312]/10 border border-[#E63312]/20">
                  <p className="text-[#E63312] text-sm font-semibold">Stop this exercise</p>
                  <p className="text-[#E63312]/70 text-xs mt-0.5">Pain at 6+ means stop. Do not push through — this can turn acute pain into chronic injury.</p>
                </div>
              )}
              {painCheckLevel >= 4 && painCheckLevel < 6 && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-[#EE8100]/10 border border-[#EE8100]/20">
                  <p className="text-[#EE8100] text-sm font-semibold">Reduce load & monitor</p>
                  <p className="text-[#EE8100]/70 text-xs mt-0.5">Drop weight 20–30%. Switch to bodyweight or machine variation. Pain should stay at 3 or below during movement.</p>
                </div>
              )}
              {painCheckLevel > 0 && painCheckLevel < 4 && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-[#00D4AA]/10 border border-[#00D4AA]/20">
                  <p className="text-[#00D4AA] text-sm font-semibold">Acceptable — monitor closely</p>
                  <p className="text-[#00D4AA]/70 text-xs mt-0.5">1–3/10 during training is acceptable. Watch for increases during sets. Pain should return to baseline within 24 hours.</p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                {painCheckLevel >= 4 && (
                  <button
                    onClick={async () => {
                      await fetch('/api/joint-health/screen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          joint: painCheckJoint,
                          side: 'both',
                          pain_level: painCheckLevel,
                          pain_type: ['During exercise'],
                          when_painful: ['During exercise'],
                          movements_that_hurt: [],
                          duration_weeks: 0,
                          has_red_flags: false,
                          red_flags_present: [],
                          context: 'during_workout',
                        }),
                      })
                      setShowPainCheck(false)
                    }}
                    className="flex-1 py-3 rounded-xl text-white text-sm font-medium"
                    style={{ background: 'linear-gradient(135deg, #EE8100, #E63312)' }}
                  >
                    Log & Get Rehab Plan
                  </button>
                )}
                <button onClick={() => setShowPainCheck(false)}
                  className="flex-1 py-3 rounded-xl text-white/60 text-sm font-medium bg-[#1E1E2E]">
                  {painCheckLevel < 4 ? 'Continue Training' : 'Dismiss'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form check overlay */}
        {showFormCheck && (
          <FormCheckAnalyzer
            exerciseName={active.exercises[active.currentIdx]?.exercise_name}
            onClose={() => setShowFormCheck(false)}
          />
        )}
      </div>
    )
  }

  // ── State A: Plan view ───────────────────────────────────────────────────

  const hasPlan = fitnessPlan !== undefined && fitnessPlan !== null
  const planLoading = fitnessPlan === undefined

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="px-5 pt-14 pb-3">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold font-space-grotesk text-[#F0F0FF]">Train</h1>
            {fitnessPlan?.plan_name && (
              <p className="text-[#6B7280] text-xs">{fitnessPlan.plan_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/exercises')}
              className="w-9 h-9 rounded-2xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center active:opacity-70"
            >
              <Search size={15} className="text-[#F0F0FF]" />
            </button>
            <button
              onClick={() => router.push('/train/history')}
              className="w-9 h-9 rounded-2xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center active:opacity-70"
            >
              <History size={15} className="text-[#F0F0FF]" />
            </button>
          </div>
        </div>

        {/* Day strip */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {DAYS.map((d, i) => {
            const isToday = i === todayDayIndex()
            const isSelected = i === selectedDayIdx
            const hasTraining = (fitnessPlan?.weekly_structure?.find(wd => wd.day.toLowerCase() === DAY_NAMES[i].toLowerCase())?.exercises?.length ?? 0) > 0
            return (
              <button
                key={d}
                onClick={() => setSelectedDayIdx(i)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 min-w-[44px] ${
                  isSelected ? 'text-white'
                  : isToday ? 'bg-[#13131A] border border-[#6C63FF]/50 text-[#6C63FF]'
                  : 'bg-[#13131A] border border-[#1E1E2E] text-[#6B7280]'
                }`}
                style={isSelected ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : undefined}
              >
                {d}
                {hasTraining && (
                  <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60' : 'bg-[#6C63FF]'}`} />
                )}
                {isToday && !isSelected && (
                  <span className="text-[8px] font-bold text-[#6C63FF] -mt-0.5">TODAY</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-5 pb-32">
        {planLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-[#13131A] animate-pulse" />
            ))}
          </div>
        ) : !hasPlan ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center mb-4">
              <Play size={24} className="text-[#6B7280]" />
            </div>
            <p className="text-[#F0F0FF] font-semibold mb-2">No fitness plan yet</p>
            <p className="text-[#6B7280] text-sm mb-5 max-w-[240px] leading-relaxed">
              Generate your AI plan from the Home tab to see your personalized workout schedule.
            </p>
            <button
              onClick={() => router.push('/home')}
              className="px-6 py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              Go to Home
            </button>
          </div>
        ) : !currentDayPlan || currentDayPlan.exercises.length === 0 ? (
          <div>
            <div className="rounded-2xl p-5 mb-4 border text-center" style={{ background: 'rgba(0,212,170,0.06)', borderColor: 'rgba(0,212,170,0.2)' }}>
              <p className="text-[#00D4AA] text-lg font-bold font-space-grotesk mb-1">Rest Day</p>
              <p className="text-[#6B7280] text-sm leading-relaxed">Recovery is where the gains happen. Stay light today.</p>
            </div>
            {(currentDayPlan?.active_recovery_suggestions ?? []).map((s, i) => (
              <div key={i} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3.5 flex items-center gap-3 mb-2">
                <div className="w-6 h-6 rounded-lg bg-[#00D4AA]/15 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-[#00D4AA]" />
                </div>
                <p className="text-[#F0F0FF]/80 text-sm">{s}</p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[#F0F0FF] font-bold font-space-grotesk">{currentDayPlan.focus}</p>
                {currentDayPlan.session_duration_min && (
                  <p className="text-[#6B7280] text-xs flex items-center gap-1">
                    <Clock size={10} />~{currentDayPlan.session_duration_min} min
                  </p>
                )}
              </div>
              <span className="text-[#6B7280] text-xs">{currentDayPlan.exercises.length} exercises</span>
            </div>

            {currentDayPlan.warmup.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-[#FFB347] font-semibold uppercase tracking-wider mb-2">Warm-up</p>
                {currentDayPlan.warmup.map((name, i) => (
                  <div key={i} className="bg-[#13131A] border border-[#1E1E2E] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFB347] flex-shrink-0" />
                    <p className="text-[#F0F0FF]/80 text-sm">{name}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 mb-4">
              {currentDayPlan.exercises.map((exercise, i) => (
                <ExerciseCard
                  key={i}
                  name={exercise.name}
                  sets={exercise.sets}
                  repRange={String(exercise.reps)}
                  restSeconds={exercise.rest_seconds}
                  rpe={exercise.rpe}
                  coachingNotes={exercise.coaching_notes}
                  modification={exercise.modifications}
                  dbExercise={dbExercises[exercise.name] ?? null}
                  onSwap={() => {
                    const muscle = dbExercises[exercise.name]?.primaryMuscles[0] ?? ''
                    setSwapTarget({ idx: i, muscle })
                  }}
                />
              ))}
            </div>

            {currentDayPlan.cooldown.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] text-[#00D4AA] font-semibold uppercase tracking-wider mb-2">Cool-down</p>
                {currentDayPlan.cooldown.map((name, i) => (
                  <div key={i} className="bg-[#13131A] border border-[#1E1E2E] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] flex-shrink-0" />
                    <p className="text-[#F0F0FF]/80 text-sm">{name}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={startWorkout}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              Start This Workout
            </button>

            <button
              onClick={() => {
                const msg = encodeURIComponent(`I'm about to do ${currentDayPlan.focus} on ${DAY_NAMES[selectedDayIdx]}. Any tips?`)
                router.push(`/coach?prefill=${msg}`)
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium active:border-[#6C63FF] active:text-[#6C63FF] transition-colors"
            >
              <MessageSquare size={14} />
              Ask Coach About This Workout
            </button>
          </>
        )}
      </div>

      {swapTarget && (
        <ExercisePicker
          targetMuscle={swapTarget.muscle}
          userEquipment={userEquipment}
          onSelect={ex => { setDbExercises(prev => ({ ...prev, [ex.name]: ex })); setSwapTarget(null) }}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  )
}
