'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react'
import type { SportProgram, SportProgramDay } from '@/types/activities'
import { CATEGORY_EMOJIS } from '@/lib/activities'

interface SportProgramCardProps {
  program: SportProgram
  onDelete?: (id: string) => void
}

const SPORT_EMOJIS: Record<string, string> = {
  golf: '⛳',
  basketball: '🏀',
  soccer: '⚽',
  tennis: '🎾',
  pickleball: '🏓',
  running: '🏃',
  cycling: '🚴',
  swimming: '🏊',
  hiking: '🥾',
  boxing: '🥊',
  bjj: '🥋',
  bjj_mma: '🥋',
  mma: '🥋',
  wrestling: '🤼',
  volleyball: '🏐',
  skiing: '⛷️',
  baseball: '⚾',
  softball: '🥎',
  hockey: '🏒',
  lacrosse: '🥍',
}

const INTENSITY_COLORS = {
  low: '#00D4AA',
  moderate: '#FFB347',
  high: '#FF6B35',
}

export default function SportProgramCard({ program, onDelete }: SportProgramCardProps) {
  const [expanded, setExpanded] = useState(false)
  const sportEmoji = SPORT_EMOJIS[program.sport] ?? CATEGORY_EMOJIS.team_sports
  const trainingDays = program.weekly_structure.filter((d) => d.activities.length > 0).length

  return (
    <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,170,0.15))' }}
          >
            {sportEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[#F0F0FF] text-sm font-semibold leading-tight">{program.program_name}</p>
              {expanded ? (
                <ChevronUp size={16} className="text-[#6B7280] flex-shrink-0 mt-0.5" />
              ) : (
                <ChevronDown size={16} className="text-[#6B7280] flex-shrink-0 mt-0.5" />
              )}
            </div>
            <p className="text-[#6B7280] text-xs capitalize mt-0.5">{program.sport.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="text-[#6B7280]" />
            <span className="text-[#6B7280] text-xs">{trainingDays}×/week</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-[#6B7280]" />
            <span className="text-[#6B7280] text-xs">{program.duration_weeks} weeks</span>
          </div>
          {program.is_active && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#00D4AA]/15 text-[#00D4AA]">
              ACTIVE
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1E1E2E]">
          {/* Coaching notes */}
          {program.coaching_notes && (
            <p className="text-[#6B7280] text-xs leading-relaxed mt-3 mb-3">{program.coaching_notes}</p>
          )}

          {/* Weekly structure */}
          <div className="space-y-2">
            {(program.weekly_structure as SportProgramDay[]).map((day, i) => (
              <div key={i} className="rounded-xl bg-[#0A0A0F] border border-[#1E1E2E] p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[#F0F0FF] text-xs font-semibold">{day.day}</p>
                  <p className="text-[#6B7280] text-[10px]">{day.focus}</p>
                </div>
                {day.activities.length === 0 ? (
                  <p className="text-[#6B7280] text-[10px]">Rest / Active Recovery</p>
                ) : (
                  <div className="space-y-1">
                    {day.activities.map((act, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: INTENSITY_COLORS[act.intensity as keyof typeof INTENSITY_COLORS] ?? '#6B7280' }}
                        />
                        <span className="text-[#F0F0FF]/80 text-[10px] flex-1">{act.name}</span>
                        <span className="text-[#6B7280] text-[10px] flex-shrink-0">{act.duration_minutes} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {onDelete && (
            <button
              onClick={() => onDelete(program.id)}
              className="mt-3 text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              Delete program
            </button>
          )}
        </div>
      )}
    </div>
  )
}
