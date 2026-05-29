'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ChevronLeft, Play, Pause, CheckCircle, SkipForward,
  Clock, Dumbbell, ChevronRight, ExternalLink,
} from 'lucide-react'

interface Exercise {
  name: string
  category: string
  joint_target: string[]
  sets: number
  reps_or_duration: string
  frequency: string
  instructions: string[]
  coaching_cues: string[]
  progression: string
  regression: string
  video_search_term: string
}

interface Program {
  id: string
  program_name: string
  target_joints: string[]
  program_type: string
  exercises: Exercise[]
  estimated_duration_minutes: number
  frequency_per_week: number
  weeks_prescribed: number
  ai_rationale: string
}

type Phase = 'intro' | 'session' | 'pain_after' | 'complete'

const PAIN_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
const CATEGORY_COLOR: Record<string, string> = {
  mobility: '#00D4AA',
  stability: '#6C63FF',
  strength: '#FF6B35',
  activation: '#FECB02',
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function isDurationBased(repsOrDuration: string) {
  return /\d+\s*(s|sec|second|min|minute)/i.test(repsOrDuration)
}

function parseDurationSeconds(repsOrDuration: string): number {
  const minMatch = repsOrDuration.match(/(\d+)\s*min/i)
  const secMatch = repsOrDuration.match(/(\d+)\s*(s|sec)/i)
  if (minMatch) return parseInt(minMatch[1]) * 60
  if (secMatch) return parseInt(secMatch[1])
  return 30
}

export default function PrehabSessionPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('intro')
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [completedExercises, setCompletedExercises] = useState<Array<{ name: string; completed: boolean }>>([])
  const [painBefore, setPainBefore] = useState(3)
  const [painAfter, setPainAfter] = useState(2)
  const [startTime, setStartTime] = useState<number>(0)
  const [elapsed, setElapsed] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [timerCount, setTimerCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [expandedCues, setExpandedCues] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/joint-health/program/${id}`)
        if (res.ok) setProgram(await res.json())
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (phase !== 'session') return
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase, startTime])

  const currentExercise = program?.exercises[exerciseIndex]
  const isTimer = currentExercise ? isDurationBased(currentExercise.reps_or_duration) : false
  const timerTarget = currentExercise ? parseDurationSeconds(currentExercise.reps_or_duration) : 30

  const startTimer = useCallback(() => {
    setTimerCount(timerTarget)
    setTimerActive(true)
    timerRef.current = setInterval(() => {
      setTimerCount(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          setTimerActive(false)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }, [timerTarget])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerActive(false)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const completeSet = () => {
    if (!program || !currentExercise) return
    if (currentSet < currentExercise.sets) {
      setCurrentSet(s => s + 1)
      stopTimer()
      setTimerCount(0)
    } else {
      // Exercise complete
      setCompletedExercises(prev => [...prev, { name: currentExercise.name, completed: true }])
      stopTimer()
      if (exerciseIndex < program.exercises.length - 1) {
        setExerciseIndex(i => i + 1)
        setCurrentSet(1)
        setTimerCount(0)
        setExpandedCues(false)
      } else {
        setPhase('pain_after')
      }
    }
  }

  const skipExercise = () => {
    if (!program || !currentExercise) return
    setCompletedExercises(prev => [...prev, { name: currentExercise.name, completed: false }])
    stopTimer()
    if (exerciseIndex < program.exercises.length - 1) {
      setExerciseIndex(i => i + 1)
      setCurrentSet(1)
      setTimerCount(0)
      setExpandedCues(false)
    } else {
      setPhase('pain_after')
    }
  }

  const saveSession = async () => {
    if (!program) return
    setSaving(true)
    const durationMinutes = Math.max(1, Math.round(elapsed / 60))
    try {
      await fetch('/api/joint-health/prehab-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: program.id,
          duration_minutes: durationMinutes,
          exercises_completed: completedExercises,
          pain_level_before: painBefore,
          pain_level_after: painAfter,
        }),
      })
    } catch { /* silent */ }
    setSaving(false)
    setPhase('complete')
  }

  if (loading || !program) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  /* INTRO */
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
        <div className="px-4 pt-safe-top pt-4 flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-white/60">
            <ChevronLeft size={22} />
          </button>
        </div>
        <div className="flex-1 px-4 pb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#6C63FF]/20 flex items-center justify-center mb-4">
            <Dumbbell size={28} className="text-[#6C63FF]" />
          </div>
          <h1 className="text-white font-bold text-2xl mb-1">{program.program_name}</h1>
          <p className="text-white/40 text-sm mb-6">{program.estimated_duration_minutes} min · {program.exercises.length} exercises · {program.frequency_per_week}× per week</p>

          {program.ai_rationale && (
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 mb-6">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Why this program</p>
              <p className="text-white/70 text-sm leading-relaxed">{program.ai_rationale}</p>
            </div>
          )}

          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Exercises</p>
          <div className="space-y-2 mb-6">
            {program.exercises.map((ex, i) => (
              <div key={i} className="bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: `${CATEGORY_COLOR[ex.category] ?? '#6C63FF'}25`, color: CATEGORY_COLOR[ex.category] ?? '#6C63FF' }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{ex.name}</p>
                  <p className="text-white/40 text-xs">{ex.sets}×{ex.reps_or_duration}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                  style={{ background: `${CATEGORY_COLOR[ex.category] ?? '#6C63FF'}20`, color: CATEGORY_COLOR[ex.category] ?? '#6C63FF' }}>
                  {ex.category}
                </span>
              </div>
            ))}
          </div>

          {/* Pain before slider */}
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Pain level right now (before)</p>
            <div className="flex items-center gap-4">
              <input type="range" min={0} max={10} value={painBefore}
                onChange={e => setPainBefore(Number(e.target.value))}
                className="flex-1 accent-[#6C63FF]" />
              <span className="text-white font-bold text-lg w-6 text-center">{painBefore}</span>
            </div>
          </div>

          <button
            onClick={() => { setPhase('session'); setStartTime(Date.now()) }}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            Start Session
          </button>
        </div>
      </div>
    )
  }

  /* SESSION */
  if (phase === 'session' && currentExercise) {
    const progress = exerciseIndex / program.exercises.length
    const timerProgress = isTimer && timerTarget > 0 ? (timerTarget - timerCount) / timerTarget : 0
    const circumference = 2 * Math.PI * 45

    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col pb-8">
        {/* Header */}
        <div className="px-4 pt-safe-top pt-3 pb-3 flex items-center justify-between border-b border-white/5">
          <button onClick={() => { if (confirm('End session?')) setPhase('pain_after') }}
            className="text-white/40 text-sm">Exit</button>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-white/30" />
            <span className="text-white/40 text-sm font-mono">{formatTime(elapsed)}</span>
          </div>
          <button onClick={skipExercise} className="text-white/40 text-sm flex items-center gap-1">
            Skip <SkipForward size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#1E1E2E]">
          <div className="h-full bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] transition-all duration-500"
            style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="flex-1 px-4 pt-6">
          {/* Exercise counter */}
          <p className="text-white/30 text-xs text-center mb-2">Exercise {exerciseIndex + 1} of {program.exercises.length}</p>

          {/* Category badge */}
          <div className="flex justify-center mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium capitalize"
              style={{ background: `${CATEGORY_COLOR[currentExercise.category] ?? '#6C63FF'}20`, color: CATEGORY_COLOR[currentExercise.category] ?? '#6C63FF' }}>
              {currentExercise.category}
            </span>
          </div>

          {/* Exercise name */}
          <h2 className="text-white font-bold text-2xl text-center mb-1">{currentExercise.name}</h2>
          <p className="text-white/40 text-sm text-center mb-6">Set {currentSet} of {currentExercise.sets}</p>

          {/* Timer or reps display */}
          {isTimer ? (
            <div className="flex justify-center mb-6">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90">
                  <circle cx="56" cy="56" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle cx="56" cy="56" r="45" fill="none" stroke="#6C63FF" strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - timerProgress)}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white font-black text-3xl font-mono">{timerActive ? formatTime(timerCount) : formatTime(timerTarget)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <div className="w-28 h-28 rounded-full border-4 border-[#6C63FF]/30 flex items-center justify-center">
                <span className="text-white font-black text-xl text-center px-2 leading-tight">{currentExercise.reps_or_duration}</span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 mb-4">
            <ul className="space-y-2">
              {currentExercise.instructions.map((inst, i) => (
                <li key={i} className="flex items-start gap-2 text-white/70 text-sm">
                  <span className="text-[#6C63FF] font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                  {inst}
                </li>
              ))}
            </ul>
          </div>

          {/* Coaching cues (expandable) */}
          {currentExercise.coaching_cues?.length > 0 && (
            <button
              onClick={() => setExpandedCues(c => !c)}
              className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 mb-4 text-left"
            >
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm font-medium">Coaching Cues</p>
                <ChevronRight size={16} className="text-white/30 transition-transform"
                  style={{ transform: expandedCues ? 'rotate(90deg)' : '' }} />
              </div>
              {expandedCues && (
                <ul className="mt-3 space-y-1">
                  {currentExercise.coaching_cues.map((cue, i) => (
                    <li key={i} className="text-[#00D4AA] text-sm flex items-start gap-2">
                      <span className="mt-0.5">→</span>{cue}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          )}

          {/* Video search */}
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(currentExercise.video_search_term)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-white/30 text-xs mb-6"
          >
            <ExternalLink size={12} />
            Watch demo on YouTube
          </a>
        </div>

        {/* Bottom actions */}
        <div className="px-4 space-y-2">
          {isTimer && (
            <button
              onClick={() => timerActive ? stopTimer() : startTimer()}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold text-sm bg-[#1E1E2E] border border-[#2E2E3E]"
            >
              {timerActive ? <><Pause size={16} />Pause Timer</> : <><Play size={16} />Start Timer</>}
            </button>
          )}
          <button
            onClick={completeSet}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            <CheckCircle size={18} />
            {currentSet < currentExercise.sets ? `Complete Set ${currentSet}` : 'Done — Next Exercise'}
          </button>
        </div>
      </div>
    )
  }

  /* PAIN AFTER */
  if (phase === 'pain_after') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col px-4 pt-safe-top pt-8 pb-8">
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#00D4AA]/20 flex items-center justify-center mb-6">
            <CheckCircle size={28} className="text-[#00D4AA]" />
          </div>
          <h2 className="text-white font-bold text-2xl mb-2">Great work!</h2>
          <p className="text-white/50 text-sm mb-8">
            You completed {completedExercises.filter(e => e.completed).length} of {program.exercises.length} exercises in {formatTime(elapsed)}.
          </p>

          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-5 mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Pain level now (after)</p>
            <div className="flex items-center gap-4 mb-3">
              <input type="range" min={0} max={10} value={painAfter}
                onChange={e => setPainAfter(Number(e.target.value))}
                className="flex-1 accent-[#6C63FF]" />
              <span className="text-white font-bold text-2xl w-8 text-center">{painAfter}</span>
            </div>
            <div className="flex justify-between text-xs text-white/30">
              {PAIN_LABELS.map(l => <span key={l}>{l}</span>)}
            </div>

            {painAfter < painBefore && (
              <div className="mt-4 px-3 py-2 rounded-xl bg-[#00D4AA]/10 border border-[#00D4AA]/20">
                <p className="text-[#00D4AA] text-xs">Pain decreased from {painBefore} → {painAfter}. The program is working!</p>
              </div>
            )}
            {painAfter > painBefore + 1 && (
              <div className="mt-4 px-3 py-2 rounded-xl bg-[#EE8100]/10 border border-[#EE8100]/20">
                <p className="text-[#EE8100] text-xs">Pain increased. Consider reducing intensity next session or consulting a professional.</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={saveSession}
          disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-bold text-base"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
        >
          {saving ? 'Saving…' : 'Save & Finish'}
        </button>
      </div>
    )
  }

  /* COMPLETE */
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#00D4AA]/20 flex items-center justify-center mb-6">
        <CheckCircle size={40} className="text-[#00D4AA]" />
      </div>
      <h2 className="text-white font-bold text-2xl mb-2">Session Complete!</h2>
      <p className="text-white/50 text-sm mb-2">
        {completedExercises.filter(e => e.completed).length} exercises · {formatTime(elapsed)}
      </p>
      {painAfter < painBefore && (
        <p className="text-[#00D4AA] text-sm mb-6">Pain: {painBefore}/10 → {painAfter}/10</p>
      )}
      <p className="text-white/30 text-xs mb-10 max-w-xs">
        Keep showing up {program.frequency_per_week}× per week. Consistency over intensity.
      </p>
      <button
        onClick={() => router.push('/joint-health')}
        className="w-full max-w-xs py-4 rounded-2xl text-white font-bold"
        style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
      >
        Back to Joint Health
      </button>
    </div>
  )
}
