'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, ChevronRight, Loader2, Plus, Activity,
  Dumbbell, CheckCircle, Clock, Calendar,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { JOINT_LABELS, PREHAB_LIBRARY } from '@/lib/jointHealth/knowledgeBase'
import type { JointRegion } from '@/lib/jointHealth/knowledgeBase'
import type { AssessmentType } from '@/lib/jointHealth/knowledgeBase'

const BodyMap = dynamic(() => import('@/components/jointHealth/BodyMap'), { ssr: false })

interface ActiveIssue {
  id: string
  joint: JointRegion
  side: string
  pain_level: number
  ai_assessment: string
  red_flags_detected: boolean
  referral_recommended: boolean
  recommended_program_id: string | null
  created_at: string
}

interface ActiveProgram {
  id: string
  program_name: string
  target_joints: JointRegion[]
  exercises: Array<{ name: string; sets: number; reps_or_duration: string }>
  estimated_duration_minutes: number
  frequency_per_week: number
  weeks_prescribed: number
  created_at: string
}

interface JointStatus {
  active_issues: ActiveIssue[]
  resolved_issues: ActiveIssue[]
  active_programs: ActiveProgram[]
  prehab_streak: number
  sessions_this_week: number
  next_prehab_program: ActiveProgram | null
  prehab_done_today: boolean
}

const ASSESSMENT_CARDS: Array<{ type: AssessmentType; icon: string; name: string; description: string }> = [
  { type: 'overhead_squat', icon: '🏋️', name: 'Overhead Squat', description: 'Reveals ankle, hip, and thoracic restrictions' },
  { type: 'single_leg', icon: '🦵', name: 'Single-Leg Squat', description: 'Tests hip stability and knee alignment' },
  { type: 'hip_hinge', icon: '🔄', name: 'Hip Hinge Pattern', description: 'Assesses lower back safety for deadlifts' },
  { type: 'shoulder_mobility', icon: '🤸', name: 'Shoulder Mobility', description: 'Checks thoracic mobility and shoulder function' },
]

function weeksAgo(dateStr: string) {
  const days = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
}

function getPainColor(level: number) {
  if (level >= 7) return '#E63312'
  if (level >= 4) return '#EE8100'
  return '#FF6B35'
}

export default function JointHealthPage() {
  const router = useRouter()
  const [status, setStatus] = useState<JointStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/joint-health/status')
      if (res.ok) setStatus(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleJointTap = (joint: JointRegion) => {
    router.push(`/joint-health/screen?joint=${joint}`)
  }

  const bodyMapStatuses = status?.active_issues.map(issue => ({
    joint: issue.joint,
    active: true,
    resolved: false,
    painLevel: issue.pain_level,
  })) ?? []

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-sm px-4 pt-safe-top pb-3 border-b border-white/5">
        <h1 className="text-white font-bold text-xl">Body & Joint Health</h1>
        <p className="text-white/40 text-xs">Powered by sports physical therapy principles</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-[#6C63FF] animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-6">
          {/* Prehab streak banner */}
          {(status?.prehab_streak ?? 0) > 1 && (
            <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,170,0.15))' }}>
              <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/20 flex items-center justify-center">
                <Activity size={20} className="text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{status?.prehab_streak} day prehab streak!</p>
                <p className="text-white/50 text-xs">{status?.sessions_this_week} sessions this week</p>
              </div>
            </div>
          )}

          {/* Body Map */}
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Body Map</p>
            <BodyMap statuses={bodyMapStatuses} onJointTap={handleJointTap} />
          </div>

          {/* Active Issues */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">Active Issues</p>
              <Link href="/joint-health/screen" className="flex items-center gap-1 text-[#6C63FF] text-xs font-medium">
                <Plus size={14} />Report pain
              </Link>
            </div>

            {!status?.active_issues.length ? (
              <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00D4AA]/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={20} className="text-[#00D4AA]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">No active issues</p>
                  <p className="text-white/40 text-xs">Your body is ready to train</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {status.active_issues.map(issue => {
                  let assessment: Record<string, unknown> = {}
                  try { assessment = JSON.parse(issue.ai_assessment ?? '{}') } catch { /* ok */ }
                  return (
                    <div
                      key={issue.id}
                      className={`rounded-2xl p-4 border ${issue.referral_recommended ? 'border-[#EE8100]/40 bg-[#EE8100]/5' : 'border-[#1E1E2E] bg-[#13131A]'}`}
                    >
                      {issue.referral_recommended && (
                        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-xl bg-[#EE8100]/15 border border-[#EE8100]/20">
                          <AlertTriangle size={14} className="text-[#EE8100] flex-shrink-0" />
                          <p className="text-[#EE8100] text-xs font-medium">Professional evaluation recommended</p>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-white font-semibold text-base">
                            {issue.side !== 'center' && issue.side !== 'both' ? `${issue.side.charAt(0).toUpperCase() + issue.side.slice(1)} ` : ''}
                            {JOINT_LABELS[issue.joint]}
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">
                            Reported {weeksAgo(issue.created_at)}
                          </p>
                          {!!assessment.likely_diagnosis && (
                            <p className="text-white/60 text-sm mt-1">{assessment.likely_diagnosis as string}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center border-2"
                            style={{ borderColor: getPainColor(issue.pain_level) }}>
                            <span className="font-black text-lg" style={{ color: getPainColor(issue.pain_level) }}>{issue.pain_level}</span>
                          </div>
                          <span className="text-white/30 text-xs">/10</span>
                        </div>
                      </div>

                      {issue.recommended_program_id && (
                        <div className="bg-[#0A0A0F] rounded-xl p-3 mb-3">
                          <p className="text-white/40 text-xs mb-1">Active prehab program</p>
                          <p className="text-white text-sm font-medium">
                            {status.active_programs.find(p => p.id === issue.recommended_program_id)?.program_name ?? 'Recovery Protocol'}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {issue.recommended_program_id && (
                          <Link href={`/joint-health/prehab/${issue.recommended_program_id}`}
                            className="flex-1 py-2.5 rounded-xl text-center text-sm font-medium text-white"
                            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
                            Start Prehab
                          </Link>
                        )}
                        <Link href={`/joint-health/screen?joint=${issue.joint}&follow_up=${issue.id}`}
                          className="flex-1 py-2.5 rounded-xl text-center text-sm font-medium bg-[#1E1E2E] text-white/70">
                          Update Pain
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Daily Prehab */}
          {status?.next_prehab_program && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Today's Prehab</p>
              <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/15 flex items-center justify-center">
                    <Dumbbell size={18} className="text-[#6C63FF]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{status.next_prehab_program.program_name}</p>
                    <p className="text-white/40 text-xs">{status.next_prehab_program.estimated_duration_minutes} min · {status.next_prehab_program.exercises.length} exercises</p>
                  </div>
                  {status.prehab_done_today && (
                    <div className="ml-auto"><CheckCircle size={20} className="text-[#00D4AA]" /></div>
                  )}
                </div>
                <div className="space-y-1 mb-4">
                  {status.next_prehab_program.exercises.slice(0, 4).map((ex, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <p className="text-white/70 text-sm">• {ex.name}</p>
                      <p className="text-white/40 text-xs">{ex.sets}×{ex.reps_or_duration}</p>
                    </div>
                  ))}
                  {status.next_prehab_program.exercises.length > 4 && (
                    <p className="text-white/30 text-xs">+{status.next_prehab_program.exercises.length - 4} more exercises</p>
                  )}
                </div>
                <Link
                  href={`/joint-health/prehab/${status.next_prehab_program.id}`}
                  className="block w-full py-3.5 rounded-xl text-center text-white font-semibold text-sm"
                  style={{ background: status.prehab_done_today ? '#1E1E2E' : 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                >
                  {status.prehab_done_today ? 'Done today ✓ — Start again?' : 'Start Prehab Session'}
                </Link>
              </div>
            </div>
          )}

          {/* Movement Assessments */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Movement Assessments</p>
            <div className="grid grid-cols-2 gap-2">
              {ASSESSMENT_CARDS.map(card => (
                <Link key={card.type} href={`/joint-health/assess/${card.type}`}>
                  <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3 h-full active:opacity-70 transition-opacity">
                    <span className="text-2xl">{card.icon}</span>
                    <p className="text-white font-medium text-sm mt-2 leading-tight">{card.name}</p>
                    <p className="text-white/40 text-xs mt-1 leading-tight">{card.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-[#6C63FF]">
                      <span className="text-xs font-medium">Start</span>
                      <ChevronRight size={12} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Prehab Library */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Prehab Library</p>
            <div className="space-y-2">
              {PREHAB_LIBRARY.map(program => (
                <div key={program.id} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${program.color}20` }}>
                    <Clock size={18} style={{ color: program.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{program.name}</p>
                    <p className="text-white/40 text-xs">{program.description} · {program.duration} min</p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/joint-health/program/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          target_joints: program.target_joints,
                          program_type: 'prehab',
                          available_equipment: [],
                          time_available_minutes: program.duration,
                          program_name: program.name,
                        }),
                      })
                      if (res.ok) {
                        const p = await res.json() as { id: string }
                        router.push(`/joint-health/prehab/${p.id}`)
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#6C63FF]/20 text-[#6C63FF] flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* History link */}
          <Link href="/joint-health/history">
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 flex items-center gap-3 active:opacity-70 transition-opacity">
              <Calendar size={20} className="text-[#6C63FF]" />
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Pain & Recovery History</p>
                <p className="text-white/40 text-xs">Track your progress over time</p>
              </div>
              <ChevronRight size={18} className="text-white/30" />
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
