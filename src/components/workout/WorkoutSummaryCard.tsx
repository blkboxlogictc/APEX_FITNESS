'use client'

import { Clock, Dumbbell, Zap, Trophy } from 'lucide-react'
import type { CompletionSummary } from '@/types/workouts'

interface WorkoutSummaryCardProps {
  summary: CompletionSummary
  weightUnit?: 'lbs' | 'kg'
}

export default function WorkoutSummaryCard({ summary, weightUnit = 'lbs' }: WorkoutSummaryCardProps) {
  const volume = weightUnit === 'lbs'
    ? `${summary.total_volume_lbs.toLocaleString()} lbs`
    : `${summary.total_volume_kg.toLocaleString()} kg`

  const stats = [
    { icon: Clock,    label: 'Duration',   value: `${summary.duration_minutes} min`,         color: '#6C63FF' },
    { icon: Dumbbell, label: 'Volume',      value: volume,                                    color: '#00D4AA' },
    { icon: Zap,      label: 'Exercises',   value: String(summary.exercises_count),            color: '#FF6B35' },
    { icon: Zap,      label: 'Sets Logged', value: String(summary.sets_count),                 color: '#FFB347' },
  ]

  return (
    <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-5">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[#0A0A0F] rounded-xl p-3.5 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}20` }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-[#F0F0FF] text-sm font-bold font-space-grotesk leading-none mb-0.5">
                {value}
              </p>
              <p className="text-[#6B7280] text-[10px] leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {summary.prs_broken.length > 0 && (
        <div
          className="rounded-xl p-3 border"
          style={{
            background: 'rgba(255,179,71,0.08)',
            borderColor: 'rgba(255,179,71,0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-[#FFB347]" />
            <span className="text-[#FFB347] text-xs font-semibold uppercase tracking-wider">
              Personal Records
            </span>
          </div>
          <div className="space-y-1">
            {summary.prs_broken.map((pr, i) => (
              <p key={i} className="text-[#F0F0FF] text-sm">
                <span className="font-medium">{pr.exercise_name}</span>
                <span className="text-[#6B7280]">
                  {' — '}
                  {pr.weight_kg > 0
                    ? `${(pr.weight_kg * 2.205).toFixed(1)} lbs × ${pr.reps} reps`
                    : `${pr.reps} reps`}
                </span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
