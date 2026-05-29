'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, AlertTriangle, Loader2, CheckCircle,
  Zap, Brain, Clock, Shield, ChevronDown,
} from 'lucide-react'
import {
  JOINT_LABELS, JOINT_REGIONS, MOVEMENT_TOWARDS_WORSE,
  RED_FLAG_QUESTIONS, AI_DISCLAIMER, JOINT_REGIONS as JR,
} from '@/lib/jointHealth/knowledgeBase'
import type { JointRegion, PainScreeningResult } from '@/lib/jointHealth/knowledgeBase'

const PAIN_TYPES = ['Sharp', 'Dull', 'Burning', 'Throbbing', 'Pinching', 'Stiffness', 'Aching']
const WHEN_PAINFUL = [
  'During exercise', 'After exercise', 'First thing in morning',
  'After sitting for a while', 'Going up stairs', 'Going down stairs',
  'At rest (right now)', 'Only with specific movements',
]
const DURATION_OPTIONS = [
  { label: 'Today (acute)', weeks: 0 },
  { label: '1–3 days', weeks: 0.5 },
  { label: '1–2 weeks', weeks: 1.5 },
  { label: '2–4 weeks', weeks: 3 },
  { label: '1–2 months', weeks: 6 },
  { label: '2–6 months', weeks: 16 },
  { label: '6+ months (chronic)', weeks: 30 },
]
const PAIN_EMOJI = ['😌', '🙂', '😐', '😕', '😣', '😣', '😨', '😨', '😱', '😱', '🆘']
const LOADING_MESSAGES = [
  'Analyzing your pain pattern…',
  'Applying sports PT principles…',
  'Identifying likely tissue type…',
  'Generating your care plan…',
  'Cross-referencing Horschig protocols…',
  'Finalizing assessment…',
]

type Step =
  | 'joint' | 'side' | 'pain_level' | 'pain_type'
  | 'when' | 'movements' | 'duration' | 'red_flags'
  | 'loading' | 'results'

interface AssessmentResult {
  likely_diagnosis: string
  confidence: string
  root_cause_analysis: string
  tissue_type: string
  healing_timeline: string
  pain_classification: string
  avoid_movements: string[]
  modify_movements: string[]
  can_continue_training: boolean
  training_guidance: string
  recovery_phases: Array<{ phase: string; focus: string; duration: string; exercises: string[] }>
  referral_recommended: boolean
  referral_urgency: string
  first_step: string
}

interface ScreeningResponse {
  screening_id: string
  program_id: string | null
  assessment: AssessmentResult
  red_flags_detected: boolean
}

const SIDE_OPTIONS: Array<{ value: PainScreeningResult['side']; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both sides' },
  { value: 'center', label: 'Center / Middle' },
]

const BILATERAL_JOINTS: JointRegion[] = ['lower_back', 'upper_back', 'neck']

export default function ScreenPage() {
  const router = useRouter()
  const params = useSearchParams()
  const preselectedJoint = params.get('joint') as JointRegion | null
  const followUpId = params.get('follow_up')

  const [step, setStep] = useState<Step>(preselectedJoint ? 'side' : 'joint')
  const [joint, setJoint] = useState<JointRegion>(preselectedJoint ?? 'knee')
  const [side, setSide] = useState<PainScreeningResult['side']>('right')
  const [painLevel, setPainLevel] = useState(3)
  const [painTypes, setPainTypes] = useState<string[]>([])
  const [whenPainful, setWhenPainful] = useState<string[]>([])
  const [movementsHurt, setMovementsHurt] = useState<string[]>([])
  const [durationWeeks, setDurationWeeks] = useState(1.5)
  const [redFlags, setRedFlags] = useState<boolean[]>(RED_FLAG_QUESTIONS.map(() => false))
  const [redFlagWarningShown, setRedFlagWarningShown] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [result, setResult] = useState<ScreeningResponse | null>(null)
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0)

  const hasRedFlags = redFlags.some(Boolean)

  // Rotate loading messages
  useEffect(() => {
    if (step !== 'loading') return
    const interval = setInterval(() => {
      setLoadingMsg(m => (m + 1) % LOADING_MESSAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [step])

  const submitScreening = useCallback(async () => {
    setStep('loading')
    const body: PainScreeningResult & { follow_up_id?: string } = {
      joint,
      side,
      pain_level: painLevel,
      pain_type: painTypes,
      when_painful: whenPainful,
      movements_that_hurt: movementsHurt,
      duration_weeks: durationWeeks,
      has_red_flags: hasRedFlags,
      red_flags_present: RED_FLAG_QUESTIONS.filter((_, i) => redFlags[i]),
      ...(followUpId ? { follow_up_id: followUpId } : {}),
    }
    try {
      const res = await fetch('/api/joint-health/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json() as ScreeningResponse
        setResult(data)
        setStep('results')
      } else {
        setStep('red_flags')
      }
    } catch {
      setStep('red_flags')
    }
  }, [joint, side, painLevel, painTypes, whenPainful, movementsHurt, durationWeeks, hasRedFlags, redFlags, followUpId])

  const handleRedFlagChange = (i: number, checked: boolean) => {
    const updated = [...redFlags]
    updated[i] = checked
    setRedFlags(updated)
    if (checked && !redFlagWarningShown) setRedFlagWarningShown(true)
  }

  const canProceedFromStep = (): boolean => {
    switch (step) {
      case 'pain_type': return painTypes.length > 0
      case 'when': return whenPainful.length > 0
      case 'movements': return movementsHurt.length > 0
      default: return true
    }
  }

  const nextStep = () => {
    const order: Step[] = ['joint', 'side', 'pain_level', 'pain_type', 'when', 'movements', 'duration', 'red_flags']
    // Skip side for bilateral joints
    const filtered = BILATERAL_JOINTS.includes(joint)
      ? order.filter(s => s !== 'side')
      : order
    const i = filtered.indexOf(step)
    if (i < filtered.length - 1) setStep(filtered[i + 1])
    else submitScreening()
  }

  const prevStep = () => {
    const order: Step[] = ['joint', 'side', 'pain_level', 'pain_type', 'when', 'movements', 'duration', 'red_flags']
    const filtered = BILATERAL_JOINTS.includes(joint)
      ? order.filter(s => s !== 'side')
      : order
    const i = filtered.indexOf(step)
    if (i > 0) setStep(filtered[i - 1])
    else router.back()
  }

  const stepIndex = (): number => {
    const order: Step[] = ['joint', 'side', 'pain_level', 'pain_type', 'when', 'movements', 'duration', 'red_flags']
    const filtered = BILATERAL_JOINTS.includes(joint) ? order.filter(s => s !== 'side') : order
    return filtered.indexOf(step)
  }
  const totalSteps = BILATERAL_JOINTS.includes(joint) ? 7 : 8

  const painColor = painLevel <= 3 ? '#00D4AA' : painLevel <= 5 ? '#FECB02' : painLevel <= 7 ? '#EE8100' : '#E63312'

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#6C63FF]/20 flex items-center justify-center">
          <Brain size={32} className="text-[#6C63FF] animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg mb-2">Analyzing your pain…</p>
          <p className="text-white/50 text-sm transition-all duration-500">{LOADING_MESSAGES[loadingMsg]}</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {LOADING_MESSAGES.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
              style={{ background: i === loadingMsg ? '#6C63FF' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <p className="text-white/30 text-xs text-center max-w-xs mt-4">{AI_DISCLAIMER}</p>
      </div>
    )
  }

  if (step === 'results' && result) {
    const a = result.assessment
    return (
      <div className="min-h-screen bg-[#0A0A0F] pb-28">
        <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-sm px-4 pt-safe-top pb-3 border-b border-white/5 flex items-center gap-3">
          <button onClick={() => router.push('/joint-health')} className="w-8 h-8 flex items-center justify-center text-white/60">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Assessment Results</h1>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Referral warning */}
          {a.referral_recommended && (
            <div className="rounded-2xl p-4 border border-[#EE8100]/40 bg-[#EE8100]/8">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-[#EE8100] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#EE8100] font-semibold text-sm">Professional Evaluation Recommended</p>
                  <p className="text-[#EE8100]/80 text-xs mt-1">{a.referral_urgency}</p>
                </div>
              </div>
            </div>
          )}

          {/* Diagnosis card */}
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Likely Diagnosis</p>
            <p className="text-white font-bold text-lg leading-tight">{a.likely_diagnosis}</p>
            <p className="text-white/50 text-xs mt-1">Confidence: {a.confidence}</p>
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-white/70 text-sm leading-relaxed">{a.root_cause_analysis}</p>
            </div>
          </div>

          {/* Tissue & Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3">
              <Zap size={16} className="text-[#6C63FF] mb-2" />
              <p className="text-white/40 text-xs mb-1">Tissue Type</p>
              <p className="text-white font-medium text-sm">{a.tissue_type}</p>
            </div>
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3">
              <Clock size={16} className="text-[#00D4AA] mb-2" />
              <p className="text-white/40 text-xs mb-1">Healing Timeline</p>
              <p className="text-white font-medium text-sm">{a.healing_timeline}</p>
            </div>
          </div>

          {/* Training guidance */}
          <div className={`rounded-2xl p-4 border ${a.can_continue_training ? 'border-[#00D4AA]/30 bg-[#00D4AA]/5' : 'border-[#EE8100]/30 bg-[#EE8100]/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className={a.can_continue_training ? 'text-[#00D4AA]' : 'text-[#EE8100]'} />
              <p className="font-semibold text-sm" style={{ color: a.can_continue_training ? '#00D4AA' : '#EE8100' }}>
                {a.can_continue_training ? 'Training: Continue (Modified)' : 'Training: Reduce / Pause'}
              </p>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{a.training_guidance}</p>
          </div>

          {/* Avoid / Modify pills */}
          {(a.avoid_movements?.length > 0 || a.modify_movements?.length > 0) && (
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Movement Guidance</p>
              {a.avoid_movements?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[#E63312] text-xs font-semibold mb-2">Avoid</p>
                  <div className="flex flex-wrap gap-2">
                    {a.avoid_movements.map(m => (
                      <span key={m} className="px-2.5 py-1 rounded-full text-xs bg-[#E63312]/15 text-[#E63312] border border-[#E63312]/20">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {a.modify_movements?.length > 0 && (
                <div>
                  <p className="text-[#FECB02] text-xs font-semibold mb-2">Modify</p>
                  <div className="flex flex-wrap gap-2">
                    {a.modify_movements.map(m => (
                      <span key={m} className="px-2.5 py-1 rounded-full text-xs bg-[#FECB02]/15 text-[#FECB02] border border-[#FECB02]/20">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recovery phases accordion */}
          {a.recovery_phases?.length > 0 && (
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl overflow-hidden">
              <p className="text-white/40 text-xs uppercase tracking-wider px-4 pt-4 pb-3">Recovery Phases</p>
              {a.recovery_phases.map((phase, i) => (
                <div key={i} className="border-t border-white/5">
                  <button
                    onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
                    className="w-full px-4 py-3 flex items-center justify-between"
                  >
                    <div className="text-left">
                      <p className="text-white font-medium text-sm">{phase.phase}</p>
                      <p className="text-white/40 text-xs">{phase.duration}</p>
                    </div>
                    <ChevronDown size={16} className="text-white/30 transition-transform"
                      style={{ transform: expandedPhase === i ? 'rotate(180deg)' : '' }} />
                  </button>
                  {expandedPhase === i && (
                    <div className="px-4 pb-4">
                      <p className="text-white/60 text-sm mb-2">{phase.focus}</p>
                      <ul className="space-y-1">
                        {phase.exercises.map((ex, j) => (
                          <li key={j} className="text-white/50 text-xs flex items-start gap-2">
                            <span className="text-[#6C63FF] mt-0.5">•</span>{ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* First step */}
          <div className="bg-[#6C63FF]/10 border border-[#6C63FF]/20 rounded-2xl p-4">
            <p className="text-[#6C63FF] text-xs font-semibold uppercase tracking-wider mb-2">Your First Step</p>
            <p className="text-white text-sm leading-relaxed">{a.first_step}</p>
          </div>

          {/* Prehab program CTA */}
          {result.program_id && (
            <button
              onClick={() => router.push(`/joint-health/prehab/${result.program_id}`)}
              className="w-full py-4 rounded-2xl text-white font-semibold text-base"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              Start Your Recovery Program
            </button>
          )}

          <button
            onClick={() => router.push('/joint-health')}
            className="w-full py-3 rounded-2xl text-white/60 font-medium text-sm bg-[#13131A] border border-[#1E1E2E]"
          >
            Back to Joint Health
          </button>

          {/* Disclaimer */}
          <p className="text-white/25 text-xs leading-relaxed text-center px-2">{AI_DISCLAIMER}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-sm px-4 pt-safe-top pb-3 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={prevStep} className="w-8 h-8 flex items-center justify-center text-white/60">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Pain Screening</h1>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ background: i <= stepIndex() ? '#6C63FF' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 py-6">
        {/* Step: Joint Selection */}
        {step === 'joint' && (
          <div className="flex-1">
            <p className="text-white font-bold text-2xl mb-2">Where does it hurt?</p>
            <p className="text-white/40 text-sm mb-6">Select the primary area of pain or discomfort</p>
            <div className="grid grid-cols-2 gap-2">
              {JR.map(j => (
                <button
                  key={j}
                  onClick={() => { setJoint(j); setStep(BILATERAL_JOINTS.includes(j) ? 'pain_level' : 'side') }}
                  className={`p-4 rounded-2xl border text-left transition-all ${joint === j ? 'border-[#6C63FF] bg-[#6C63FF]/10' : 'border-[#1E1E2E] bg-[#13131A]'}`}
                >
                  <p className="text-white font-medium text-sm">{JOINT_LABELS[j]}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Side */}
        {step === 'side' && (
          <div className="flex-1">
            <p className="text-white font-bold text-2xl mb-2">Which side?</p>
            <p className="text-white/40 text-sm mb-6">Select where the pain is located</p>
            <div className="space-y-3">
              {SIDE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSide(opt.value); nextStep() }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${side === opt.value ? 'border-[#6C63FF] bg-[#6C63FF]/10' : 'border-[#1E1E2E] bg-[#13131A]'}`}
                >
                  <p className="text-white font-semibold">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Pain Level */}
        {step === 'pain_level' && (
          <div className="flex-1">
            <p className="text-white font-bold text-2xl mb-2">Pain level right now?</p>
            <p className="text-white/40 text-sm mb-8">0 = no pain · 10 = worst imaginable</p>

            <div className="flex flex-col items-center gap-6">
              <div className="w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center"
                style={{ borderColor: painColor, background: `${painColor}15` }}>
                <span className="text-5xl">{PAIN_EMOJI[painLevel]}</span>
                <span className="font-black text-2xl mt-1" style={{ color: painColor }}>{painLevel}</span>
              </div>

              <input
                type="range" min={0} max={10} value={painLevel}
                onChange={e => setPainLevel(Number(e.target.value))}
                className="w-full accent-[#6C63FF]"
                style={{ accentColor: painColor }}
              />

              <div className="flex justify-between w-full text-xs text-white/30">
                <span>0 — None</span>
                <span>5 — Moderate</span>
                <span>10 — Severe</span>
              </div>

              {painLevel >= 6 && (
                <div className="w-full rounded-xl p-3 bg-[#E63312]/10 border border-[#E63312]/20">
                  <p className="text-[#E63312] text-xs font-medium">Pain at this level requires professional evaluation. We recommend seeing a sports medicine physician or physical therapist.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Pain Type */}
        {step === 'pain_type' && (
          <div className="flex-1">
            <p className="text-white font-bold text-2xl mb-2">How would you describe it?</p>
            <p className="text-white/40 text-sm mb-6">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {PAIN_TYPES.map(pt => (
                <button
                  key={pt}
                  onClick={() => {
                    setPainTypes(prev => prev.includes(pt) ? prev.filter(x => x !== pt) : [...prev, pt])
                  }}
                  className={`px-4 py-2.5 rounded-2xl border text-sm font-medium transition-all ${painTypes.includes(pt) ? 'border-[#6C63FF] bg-[#6C63FF]/15 text-white' : 'border-[#1E1E2E] bg-[#13131A] text-white/60'}`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: When Painful */}
        {step === 'when' && (
          <div className="flex-1">
            <p className="text-white font-bold text-2xl mb-2">When does it hurt?</p>
            <p className="text-white/40 text-sm mb-6">Select all situations that apply</p>
            <div className="space-y-2">
              {WHEN_PAINFUL.map(w => (
                <button
                  key={w}
                  onClick={() => {
                    setWhenPainful(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])
                  }}
                  className={`w-full px-4 py-3 rounded-2xl border text-left text-sm transition-all ${whenPainful.includes(w) ? 'border-[#6C63FF] bg-[#6C63FF]/10 text-white' : 'border-[#1E1E2E] bg-[#13131A] text-white/60'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${whenPainful.includes(w) ? 'border-[#6C63FF] bg-[#6C63FF]' : 'border-white/20'}`}>
                      {whenPainful.includes(w) && <CheckCircle size={12} className="text-white" />}
                    </div>
                    {w}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Movements that hurt */}
        {step === 'movements' && (
          <div className="flex-1">
            <p className="text-white font-bold text-2xl mb-2">What makes it worse?</p>
            <p className="text-white/40 text-sm mb-6">Select movements that aggravate your {JOINT_LABELS[joint].toLowerCase()}</p>
            <div className="space-y-2">
              {(MOVEMENT_TOWARDS_WORSE[joint] ?? []).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setMovementsHurt(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
                  }}
                  className={`w-full px-4 py-3 rounded-2xl border text-left text-sm transition-all ${movementsHurt.includes(m) ? 'border-[#6C63FF] bg-[#6C63FF]/10 text-white' : 'border-[#1E1E2E] bg-[#13131A] text-white/60'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${movementsHurt.includes(m) ? 'border-[#6C63FF] bg-[#6C63FF]' : 'border-white/20'}`}>
                      {movementsHurt.includes(m) && <CheckCircle size={12} className="text-white" />}
                    </div>
                    {m}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Duration */}
        {step === 'duration' && (
          <div className="flex-1">
            <p className="text-white font-bold text-2xl mb-2">How long has this been going on?</p>
            <p className="text-white/40 text-sm mb-6">Duration helps classify acute vs chronic</p>
            <div className="space-y-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { setDurationWeeks(opt.weeks); nextStep() }}
                  className={`w-full px-4 py-3.5 rounded-2xl border text-left transition-all ${durationWeeks === opt.weeks ? 'border-[#6C63FF] bg-[#6C63FF]/10' : 'border-[#1E1E2E] bg-[#13131A]'}`}
                >
                  <p className="text-white font-medium text-sm">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Red Flags */}
        {step === 'red_flags' && (
          <div className="flex-1">
            <p className="text-white font-bold text-2xl mb-2">Safety Check</p>
            <p className="text-white/40 text-sm mb-4">Check any that apply — be honest, this protects you</p>

            {/* Immediate warning */}
            {hasRedFlags && (
              <div className="mb-4 rounded-xl p-4 bg-[#EE8100]/10 border border-[#EE8100]/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-[#EE8100] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#EE8100] font-semibold text-sm">Red Flag Detected</p>
                    <p className="text-[#EE8100]/80 text-xs mt-1">One or more of your symptoms may require professional evaluation. We will flag this in your assessment. Consider seeing a sports medicine physician or physical therapist before returning to heavy training.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {RED_FLAG_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleRedFlagChange(i, !redFlags[i])}
                  className={`w-full px-4 py-3 rounded-2xl border text-left text-sm transition-all ${redFlags[i] ? 'border-[#EE8100]/50 bg-[#EE8100]/8 text-[#EE8100]' : 'border-[#1E1E2E] bg-[#13131A] text-white/60'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${redFlags[i] ? 'border-[#EE8100] bg-[#EE8100]' : 'border-white/20'}`}>
                      {redFlags[i] && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <span className="leading-tight">{q}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        {step !== 'joint' && step !== 'side' && step !== 'duration' && (
          <div className="pt-6">
            <button
              onClick={nextStep}
              disabled={!canProceedFromStep()}
              className="w-full py-4 rounded-2xl text-white font-semibold text-base transition-all disabled:opacity-40"
              style={{ background: canProceedFromStep() ? 'linear-gradient(135deg, #6C63FF, #00D4AA)' : '#1E1E2E' }}
            >
              {step === 'red_flags' ? 'Analyze My Pain' : 'Continue'}
              {step !== 'red_flags' && <ChevronRight size={18} className="inline ml-2" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
