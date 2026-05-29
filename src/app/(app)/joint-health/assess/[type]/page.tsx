'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2, Brain, CheckCircle, AlertTriangle } from 'lucide-react'
import { ASSESSMENT_TYPES, AI_DISCLAIMER } from '@/lib/jointHealth/knowledgeBase'
import type { AssessmentType } from '@/lib/jointHealth/knowledgeBase'

interface AssessmentResult {
  assessment_id: string | null
  overall_score: number
  movement_quality: 'excellent' | 'good' | 'moderate' | 'poor'
  results: Array<{
    movement: string
    passed: boolean
    observations: string
    implications: string
    corrections: string[]
  }>
  priority_corrections: string[]
  recommended_exercises: Array<{ name: string; purpose: string; sets_reps: string }>
  ai_summary: string
  joints_to_mobilize: string[]
  muscles_to_strengthen: string[]
}

const QUALITY_COLOR: Record<string, string> = {
  excellent: '#00D4AA',
  good: '#6C63FF',
  moderate: '#FECB02',
  poor: '#E63312',
}

const QUALITY_LABEL: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  moderate: 'Needs Work',
  poor: 'Significant Restrictions',
}

export default function AssessmentPage() {
  const router = useRouter()
  const { type } = useParams<{ type: string }>()
  const assessType = type as AssessmentType

  const config = ASSESSMENT_TYPES[assessType]
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'intro' | 'questions' | 'loading' | 'results'>('intro')
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loadingDot, setLoadingDot] = useState(0)

  useEffect(() => {
    if (phase !== 'loading') return
    const t = setInterval(() => setLoadingDot(d => (d + 1) % 3), 500)
    return () => clearInterval(t)
  }, [phase])

  if (!config) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <p className="text-white/40">Unknown assessment type</p>
      </div>
    )
  }

  const questions = config.questions as unknown as Array<{ id: string; prompt: string; options: Array<{ value: string; label: string }> }>
  const currentQ = questions[questionIndex]

  const handleAnswer = (value: string) => {
    const updated = { ...answers, [currentQ.id]: value }
    setAnswers(updated)
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(i => i + 1)
    } else {
      submitAssessment(updated)
    }
  }

  const submitAssessment = async (finalAnswers: Record<string, string>) => {
    setPhase('loading')
    try {
      const res = await fetch('/api/joint-health/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_type: assessType, answers: finalAnswers }),
      })
      if (res.ok) {
        setResult(await res.json())
        setPhase('results')
      } else {
        setPhase('questions')
      }
    } catch {
      setPhase('questions')
    }
  }

  /* INTRO */
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col px-4 pb-8">
        <div className="pt-safe-top pt-4 flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-white/60">
            <ChevronLeft size={22} />
          </button>
        </div>
        <div className="text-4xl mb-4">{config.icon}</div>
        <h1 className="text-white font-bold text-2xl mb-2">{config.name}</h1>
        <p className="text-white/50 text-sm mb-2">{config.description}</p>
        <p className="text-white/30 text-xs mb-8">Takes about {config.duration} · {questions.length} questions</p>

        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">How it works</p>
          <ul className="space-y-2">
            <li className="text-white/60 text-sm flex items-start gap-2"><span className="text-[#6C63FF]">1.</span> Follow each prompt and perform the movement as described</li>
            <li className="text-white/60 text-sm flex items-start gap-2"><span className="text-[#6C63FF]">2.</span> Answer honestly — the AI analysis is only as good as your input</li>
            <li className="text-white/60 text-sm flex items-start gap-2"><span className="text-[#6C63FF]">3.</span> You'll receive a movement quality score and personalized corrections</li>
          </ul>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => setPhase('questions')}
            className="w-full py-4 rounded-2xl text-white font-bold text-base"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            Begin Assessment
          </button>
        </div>
      </div>
    )
  }

  /* LOADING */
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#6C63FF]/20 flex items-center justify-center">
          <Brain size={32} className="text-[#6C63FF] animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg mb-2">Analyzing your movement{'.'.repeat(loadingDot + 1)}</p>
          <p className="text-white/40 text-sm">Applying FMS and Horschig principles</p>
        </div>
      </div>
    )
  }

  /* RESULTS */
  if (phase === 'results' && result) {
    const qualityColor = QUALITY_COLOR[result.movement_quality] ?? '#6C63FF'
    const circumference = 2 * Math.PI * 45

    return (
      <div className="min-h-screen bg-[#0A0A0F] pb-28">
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-sm px-4 pt-safe-top pb-3 border-b border-white/5 flex items-center gap-3">
          <button onClick={() => router.push('/joint-health')} className="w-8 h-8 flex items-center justify-center text-white/60">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Movement Results</h1>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Score ring */}
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-6 flex flex-col items-center">
            <div className="relative w-28 h-28 mb-4">
              <svg className="w-28 h-28 -rotate-90">
                <circle cx="56" cy="56" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle cx="56" cy="56" r="45" fill="none" strokeWidth="8"
                  stroke={qualityColor}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - result.overall_score / 100)}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black text-3xl" style={{ color: qualityColor }}>{result.overall_score}</span>
                <span className="text-white/30 text-xs">/100</span>
              </div>
            </div>
            <p className="text-white font-bold text-lg" style={{ color: qualityColor }}>{QUALITY_LABEL[result.movement_quality]}</p>
            <p className="text-white/50 text-sm text-center mt-2">{result.ai_summary}</p>
          </div>

          {/* Priority corrections */}
          {result.priority_corrections?.length > 0 && (
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Top Priorities</p>
              <ul className="space-y-2">
                {result.priority_corrections.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ background: i === 0 ? '#E63312' : i === 1 ? '#EE8100' : '#6C63FF' }}>
                      {i + 1}
                    </span>
                    <p className="text-white/70 text-sm">{c}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Per-movement results */}
          <p className="text-white/40 text-xs uppercase tracking-wider">Movement Analysis</p>
          {result.results?.map((r, i) => (
            <div key={i} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 mt-0.5">
                  {r.passed
                    ? <CheckCircle size={18} className="text-[#00D4AA]" />
                    : <AlertTriangle size={18} className="text-[#EE8100]" />}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{r.movement}</p>
                  <p className="text-white/50 text-xs mt-0.5">{r.observations}</p>
                </div>
              </div>
              {!r.passed && (
                <>
                  <div className="bg-[#0A0A0F] rounded-xl p-3 mb-2">
                    <p className="text-white/40 text-xs mb-1">Implication</p>
                    <p className="text-white/60 text-sm">{r.implications}</p>
                  </div>
                  {r.corrections?.length > 0 && (
                    <div>
                      <p className="text-[#6C63FF] text-xs font-medium mb-1.5">Corrections</p>
                      <ul className="space-y-1">
                        {r.corrections.map((c, j) => (
                          <li key={j} className="text-white/50 text-xs flex items-start gap-1.5">
                            <span className="text-[#6C63FF] mt-0.5">→</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Recommended exercises */}
          {result.recommended_exercises?.length > 0 && (
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Recommended Exercises</p>
              <div className="space-y-3">
                {result.recommended_exercises.map((ex, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="w-8 h-8 rounded-xl bg-[#6C63FF]/15 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#6C63FF]">{i + 1}</div>
                    <div>
                      <p className="text-white font-medium text-sm">{ex.name}</p>
                      <p className="text-white/40 text-xs">{ex.sets_reps} · {ex.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobility / Strength targets */}
          {(result.joints_to_mobilize?.length > 0 || result.muscles_to_strengthen?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {result.joints_to_mobilize?.length > 0 && (
                <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3">
                  <p className="text-white/40 text-xs mb-2">Mobilize</p>
                  <div className="flex flex-wrap gap-1">
                    {result.joints_to_mobilize.map(j => (
                      <span key={j} className="px-2 py-0.5 rounded-full text-xs bg-[#00D4AA]/15 text-[#00D4AA]">{j}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.muscles_to_strengthen?.length > 0 && (
                <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3">
                  <p className="text-white/40 text-xs mb-2">Strengthen</p>
                  <div className="flex flex-wrap gap-1">
                    {result.muscles_to_strengthen.map(m => (
                      <span key={m} className="px-2 py-0.5 rounded-full text-xs bg-[#6C63FF]/15 text-[#6C63FF]">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => router.push('/joint-health')}
            className="w-full py-4 rounded-2xl text-white font-bold text-base"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            Back to Joint Health
          </button>

          <p className="text-white/25 text-xs leading-relaxed text-center">{AI_DISCLAIMER}</p>
        </div>
      </div>
    )
  }

  /* QUESTIONS */
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-sm px-4 pt-safe-top pb-3 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => questionIndex > 0 ? setQuestionIndex(i => i - 1) : setPhase('intro')}
            className="w-8 h-8 flex items-center justify-center text-white/60"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">{config.name}</h1>
          <span className="text-white/30 text-sm">{questionIndex + 1}/{questions.length}</span>
        </div>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: i <= questionIndex ? '#6C63FF' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-8 pb-8 flex flex-col">
        <p className="text-white font-bold text-xl leading-snug mb-8">{currentQ.prompt}</p>

        <div className="space-y-3">
          {currentQ.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleAnswer(opt.value)}
              className="w-full p-4 rounded-2xl border border-[#1E1E2E] bg-[#13131A] text-left transition-all active:scale-95 active:bg-[#6C63FF]/10 active:border-[#6C63FF]"
            >
              <div className="flex items-center justify-between">
                <p className="text-white font-medium text-sm">{opt.label}</p>
                <ChevronRight size={16} className="text-white/20" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <p className="text-white/20 text-xs text-center">Tap an option to proceed</p>
        </div>
      </div>
    </div>
  )
}
