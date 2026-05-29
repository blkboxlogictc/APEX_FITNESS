'use client'

import { useState } from 'react'
import { X, ChevronRight, AlertTriangle, CheckCircle, Loader2, Dumbbell, RotateCcw } from 'lucide-react'
import CameraCapture from './CameraCapture'
import type { ProcessedImage } from '@/lib/vision/imageUtils'

type Phase = 'IDLE' | 'TIPS' | 'CAPTURING' | 'ANALYZING' | 'RESULTS'

interface Correction {
  issue: string
  body_part: string
  severity: 'critical' | 'moderate' | 'minor'
  cue: string
  why: string
}

interface Drill {
  name: string
  purpose: string
  sets_reps: string
}

interface FormCheckResult {
  exercise: string
  phase: string
  overall_score: number
  overall_assessment: string
  positives: string[]
  corrections: Correction[]
  drills: Drill[]
  safety_alert: string | null
  next_focus: string
}

interface Props {
  exerciseName?: string
  onClose: () => void
}

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  moderate: { bg: 'bg-[#EE8100]/15', border: 'border-[#EE8100]/30', text: 'text-[#EE8100]', badge: 'bg-[#EE8100]/20 text-[#EE8100]' },
  minor: { bg: 'bg-[#6C63FF]/15', border: 'border-[#6C63FF]/30', text: 'text-[#6C63FF]', badge: 'bg-[#6C63FF]/20 text-[#6C63FF]' },
}

const SETUP_TIPS = [
  'Use a mirror, tripod, or ask a training partner to film',
  'Film from the side (sagittal plane) for most exercises',
  'Capture your whole body — head to feet in frame',
  'Good lighting helps — avoid backlit positions',
  'Capture the most challenging part of the lift (e.g. bottom of squat)',
]

export default function FormCheckAnalyzer({ exerciseName, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('IDLE')
  const [result, setResult] = useState<FormCheckResult | null>(null)
  const [capturedURL, setCapturedURL] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCapture = async (image: ProcessedImage, dataURL: string) => {
    setCapturedURL(dataURL)
    setPhase('ANALYZING')
    setError(null)
    try {
      const fd = new FormData()
      fd.append('base64', image.base64)
      fd.append('mimeType', image.mimeType)
      const res = await fetch('/api/vision/form-check', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Analysis failed')
      const data: FormCheckResult = await res.json()
      setResult(data)
      setPhase('RESULTS')
    } catch {
      setError('Could not analyse the form. Please try again.')
      setPhase('IDLE')
    }
  }

  const scoreColor = result
    ? result.overall_score >= 80 ? '#00D4AA'
    : result.overall_score >= 60 ? '#FECB02'
    : '#E63312'
    : '#6C63FF'

  const scoreCircumference = 2 * Math.PI * 44
  const scoreDash = result ? (result.overall_score / 100) * scoreCircumference : 0

  if (phase === 'CAPTURING') {
    return <CameraCapture mode="form-check" onCapture={handleCapture} onClose={() => setPhase('IDLE')} />
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-safe-top pb-3 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2"><X size={22} className="text-white/60" /></button>
        <p className="text-white font-semibold text-sm flex-1">
          {exerciseName ? `Form Check — ${exerciseName}` : 'Form Check'}
        </p>
        {phase === 'RESULTS' && (
          <button onClick={() => { setPhase('IDLE'); setResult(null); setCapturedURL(null) }}
            className="p-2 text-white/40">
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      {phase === 'IDLE' && (
        <div className="flex-1 flex flex-col px-4 py-6 gap-6">
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[#6C63FF]/15 flex items-center justify-center">
              <Dumbbell size={40} className="text-[#6C63FF]" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white text-xl font-bold mb-2">AI Form Analysis</p>
            <p className="text-white/50 text-sm leading-relaxed">
              Take a photo of your exercise form and get instant coaching feedback from an elite AI trainer.
            </p>
          </div>
          <div className="bg-[#1E1E2E] rounded-2xl p-4">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Setup Tips</p>
            <div className="space-y-2.5">
              {SETUP_TIPS.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#6C63FF]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#6C63FF] text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-white/70 text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto space-y-3">
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={() => setPhase('CAPTURING')}
              className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
              Take Form Photo <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {phase === 'ANALYZING' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {capturedURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedURL} alt="Form" className="w-40 h-40 object-cover rounded-2xl opacity-60" />
          )}
          <Loader2 size={28} className="text-[#6C63FF] animate-spin" />
          <p className="text-white/60 text-sm">Analysing your form…</p>
          <p className="text-white/30 text-xs">Checking 20+ biomechanical markers</p>
        </div>
      )}

      {phase === 'RESULTS' && result && (
        <div className="flex-1 overflow-y-auto pb-8">
          {/* Score hero */}
          <div className="px-4 py-6 flex items-center gap-6 border-b border-white/5">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                <circle cx="48" cy="48" r="44" fill="none" stroke="#1E1E2E" strokeWidth="8" />
                <circle cx="48" cy="48" r="44" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeDasharray={scoreCircumference} strokeDashoffset={scoreCircumference - scoreDash}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-black text-2xl" style={{ color: scoreColor }}>{result.overall_score}</span>
                <span className="text-white/40 text-xs">/ 100</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-base">{result.exercise}</p>
              <p className="text-white/50 text-xs mb-2">{result.phase}</p>
              <p className="text-white/70 text-sm leading-relaxed">{result.overall_assessment}</p>
            </div>
          </div>

          {/* Safety alert */}
          {result.safety_alert && (
            <div className="mx-4 mt-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{result.safety_alert}</p>
            </div>
          )}

          {/* Positives */}
          {result.positives.length > 0 && (
            <div className="px-4 mt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">What you're doing well</p>
              <div className="space-y-2">
                {result.positives.map((pos, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-[#00D4AA]/10 rounded-xl p-3">
                    <CheckCircle size={16} className="text-[#00D4AA] flex-shrink-0 mt-0.5" />
                    <p className="text-white/80 text-sm">{pos}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corrections */}
          {result.corrections.length > 0 && (
            <div className="px-4 mt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Form corrections</p>
              <div className="space-y-3">
                {result.corrections.map((c, i) => {
                  const s = SEVERITY_COLORS[c.severity]
                  return (
                    <div key={i} className={`rounded-2xl p-4 border ${s.bg} ${s.border}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>{c.severity}</span>
                        <span className="text-white/40 text-xs">{c.body_part}</span>
                      </div>
                      <p className="text-white font-semibold text-sm mb-1">{c.issue}</p>
                      <p className={`text-sm font-medium mb-1.5 ${s.text}`}>"{c.cue}"</p>
                      <p className="text-white/50 text-xs">{c.why}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Corrective drills */}
          {result.drills.length > 0 && (
            <div className="px-4 mt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Corrective drills</p>
              <div className="space-y-2">
                {result.drills.map((d, i) => (
                  <div key={i} className="bg-[#1E1E2E] rounded-2xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#6C63FF]/20 flex items-center justify-center flex-shrink-0">
                      <Dumbbell size={14} className="text-[#6C63FF]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{d.name}</p>
                      <p className="text-white/50 text-xs">{d.purpose}</p>
                    </div>
                    <span className="text-[#6C63FF] text-xs font-medium">{d.sets_reps}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next focus */}
          <div className="mx-4 mt-4 mb-4 p-4 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20">
            <p className="text-[#6C63FF] text-xs font-semibold uppercase tracking-wider mb-1">Next session focus</p>
            <p className="text-white text-sm">{result.next_focus}</p>
          </div>
        </div>
      )}
    </div>
  )
}
