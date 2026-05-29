'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle, Activity, Calendar, Flame } from 'lucide-react'
import { JOINT_LABELS } from '@/lib/jointHealth/knowledgeBase'
import type { JointRegion } from '@/lib/jointHealth/knowledgeBase'

interface ResolvedIssue {
  id: string
  joint: JointRegion
  side: string
  pain_level: number
  created_at: string
  resolved_at: string
}

interface PrehabLog {
  id: string
  program_id: string
  completed_at: string
  duration_minutes: number
  pain_level_before: number
  pain_level_after: number
}

interface HistoryData {
  resolved_issues: ResolvedIssue[]
  recent_logs: PrehabLog[]
  prehab_streak: number
  sessions_this_week: number
  total_sessions: number
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

export default function HistoryPage() {
  const router = useRouter()
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch('/api/joint-health/status'),
          fetch('/api/joint-health/prehab-log?limit=60'),
        ])
        const status = statusRes.ok ? await statusRes.json() : null
        const logs: PrehabLog[] = logsRes.ok ? await logsRes.json() : []
        if (status) {
          setData({
            resolved_issues: status.resolved_issues ?? [],
            recent_logs: logs,
            prehab_streak: status.prehab_streak ?? 0,
            sessions_this_week: status.sessions_this_week ?? 0,
            total_sessions: logs.length,
          })
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [])

  // Build weekly adherence grid: last 8 weeks × 7 days
  const buildAdherenceGrid = (logs: PrehabLog[]) => {
    const today = new Date()
    const grid: boolean[][] = []
    for (let w = 7; w >= 0; w--) {
      const week: boolean[] = []
      for (let d = 6; d >= 0; d--) {
        const date = new Date(today)
        date.setDate(today.getDate() - w * 7 - d)
        const dateStr = date.toISOString().split('T')[0]
        week.push(logs.some(l => l.completed_at.startsWith(dateStr)))
      }
      grid.push(week)
    }
    return grid
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const adherenceGrid = data ? buildAdherenceGrid(data.recent_logs) : []
  const totalDone = adherenceGrid.flat().filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-sm px-4 pt-safe-top pb-3 border-b border-white/5 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-white/60">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Pain & Recovery History</h1>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3 text-center">
            <Flame size={18} className="text-[#FF6B35] mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{data?.prehab_streak ?? 0}</p>
            <p className="text-white/40 text-xs">Day streak</p>
          </div>
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3 text-center">
            <Activity size={18} className="text-[#6C63FF] mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{data?.sessions_this_week ?? 0}</p>
            <p className="text-white/40 text-xs">This week</p>
          </div>
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3 text-center">
            <Calendar size={18} className="text-[#00D4AA] mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{data?.total_sessions ?? 0}</p>
            <p className="text-white/40 text-xs">All time</p>
          </div>
        </div>

        {/* Adherence heatmap */}
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/40 text-xs uppercase tracking-wider">Prehab Adherence (8 weeks)</p>
            <p className="text-white/30 text-xs">{totalDone} sessions</p>
          </div>
          <div className="flex gap-1 justify-center">
            {adherenceGrid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((done, di) => (
                  <div key={di} className="w-7 h-7 rounded-md transition-all"
                    style={{ background: done ? '#6C63FF' : 'rgba(255,255,255,0.05)' }} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/20">
            <span>8 weeks ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Recent prehab sessions */}
        {(data?.recent_logs?.length ?? 0) > 0 && (
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Recent Sessions</p>
            <div className="space-y-2">
              {data!.recent_logs.slice(0, 10).map(log => {
                const painImproved = log.pain_level_after < log.pain_level_before
                return (
                  <div key={log.id} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: painImproved ? 'rgba(0,212,170,0.15)' : 'rgba(108,99,255,0.15)' }}>
                      {painImproved
                        ? <CheckCircle size={16} className="text-[#00D4AA]" />
                        : <Activity size={16} className="text-[#6C63FF]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{formatDate(log.completed_at)}</p>
                      <p className="text-white/40 text-xs">{log.duration_minutes} min session</p>
                    </div>
                    {log.pain_level_before !== undefined && log.pain_level_after !== undefined && (
                      <div className="text-right">
                        <p className="text-white/50 text-xs">Pain</p>
                        <p className="text-sm font-medium" style={{ color: painImproved ? '#00D4AA' : '#FECB02' }}>
                          {log.pain_level_before} → {log.pain_level_after}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Resolved issues */}
        {(data?.resolved_issues?.length ?? 0) > 0 && (
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Resolved Issues</p>
            <div className="space-y-2">
              {data!.resolved_issues.map(issue => {
                const side = issue.side !== 'center' && issue.side !== 'both'
                  ? `${issue.side.charAt(0).toUpperCase() + issue.side.slice(1)} `
                  : ''
                const recoveryDays = daysBetween(issue.created_at, issue.resolved_at)
                return (
                  <div key={issue.id} className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00D4AA]/15 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={16} className="text-[#00D4AA]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{side}{JOINT_LABELS[issue.joint]}</p>
                      <p className="text-white/40 text-xs">Resolved in {recoveryDays} days · was {issue.pain_level}/10</p>
                    </div>
                    <p className="text-white/30 text-xs">{formatDate(issue.resolved_at)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!data?.resolved_issues?.length && !data?.recent_logs?.length && (
          <div className="text-center py-16">
            <Calendar size={40} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No history yet</p>
            <p className="text-white/20 text-xs mt-1">Complete prehab sessions to build your timeline</p>
          </div>
        )}
      </div>
    </div>
  )
}
