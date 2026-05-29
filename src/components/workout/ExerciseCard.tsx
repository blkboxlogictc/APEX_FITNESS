'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import type { Exercise } from '@/lib/exercises'
import { getImageUrl, getMuscleColor } from '@/lib/exercises'

interface ExerciseCardProps {
  name: string
  sets: number
  repRange: string
  restSeconds: number
  rpe?: number | string
  coachingNotes?: string
  modification?: string | null
  dbExercise?: Exercise | null
  onSwap?: () => void
  compact?: boolean
}

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%231E1E2E'/%3E%3Ccircle cx='40' cy='30' r='10' fill='%236B7280'/%3E%3Cellipse cx='40' cy='60' rx='16' ry='10' fill='%236B7280'/%3E%3C/svg%3E`

export default function ExerciseCard({
  name,
  sets,
  repRange,
  restSeconds,
  rpe,
  coachingNotes,
  modification,
  dbExercise,
  onSwap,
  compact = false,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)

  const primaryMuscle = dbExercise?.primaryMuscles[0] ?? ''
  const muscleColor = getMuscleColor(primaryMuscle)
  const imageUrl = dbExercise && !imgError ? getImageUrl(dbExercise, imgIndex) : PLACEHOLDER_SVG

  const rpeNum = typeof rpe === 'string' ? parseFloat(rpe) : rpe
  const rpeColor = !rpeNum ? '#6B7280'
    : rpeNum >= 9 ? '#FF6B35'
    : rpeNum >= 7 ? '#FFB347'
    : '#00D4AA'

  return (
    <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl overflow-hidden">
      {/* Main row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-4 flex items-center gap-3"
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#1E1E2E]">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-[#F0F0FF] text-sm font-semibold leading-tight truncate">{name}</p>
            {primaryMuscle && (
              <span
                className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: `${muscleColor}20`, color: muscleColor }}
              >
                {primaryMuscle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#6B7280] text-xs">{sets}×{repRange}</span>
            <span className="text-[#6B7280] text-xs">· {restSeconds}s rest</span>
            {rpe && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${rpeColor}20`, color: rpeColor }}
              >
                RPE {rpe}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp size={16} className="text-[#6B7280]" />
          ) : (
            <ChevronDown size={16} className="text-[#6B7280]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1E1E2E]">
          {/* Image carousel */}
          {dbExercise && dbExercise.images.length > 0 && (
            <div className="mt-3 mb-3">
              <div
                className="w-full h-48 rounded-xl overflow-hidden bg-[#1E1E2E] relative"
                onTouchStart={e => { (e.currentTarget as HTMLDivElement).dataset.startX = String(e.touches[0].clientX) }}
                onTouchEnd={e => {
                  const startX = parseFloat((e.currentTarget as HTMLDivElement).dataset.startX ?? '0')
                  const dx = e.changedTouches[0].clientX - startX
                  if (Math.abs(dx) > 40) {
                    if (dx < 0 && imgIndex < dbExercise.images.length - 1) setImgIndex(i => i + 1)
                    if (dx > 0 && imgIndex > 0) setImgIndex(i => i - 1)
                  }
                }}
              >
                <img
                  src={imageUrl}
                  alt={`${name} demonstration`}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                  loading="lazy"
                />
                {dbExercise.images.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {dbExercise.images.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coaching notes */}
          {coachingNotes && (
            <p className="text-[#6B7280] text-xs leading-relaxed mb-3">{coachingNotes}</p>
          )}

          {/* Modification warning */}
          {modification && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3">
              <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs leading-relaxed">{modification}</p>
            </div>
          )}

          {/* Instructions */}
          {dbExercise?.instructions && dbExercise.instructions.length > 0 && (
            <div className="mb-3">
              <p className="text-[#6B7280] text-[10px] uppercase tracking-wider font-semibold mb-2">Instructions</p>
              <ol className="space-y-1.5">
                {dbExercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-[#F0F0FF]/80 leading-relaxed">
                    <span
                      className="flex-shrink-0 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold mt-0.5"
                      style={{ background: '#6C63FF20', color: '#6C63FF' }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Muscles */}
          {dbExercise && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {dbExercise.primaryMuscles.map(m => (
                <span
                  key={m}
                  className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg"
                  style={{ background: `${getMuscleColor(m)}20`, color: getMuscleColor(m) }}
                >
                  {m}
                </span>
              ))}
              {dbExercise.secondaryMuscles.slice(0, 3).map(m => (
                <span key={m} className="text-[9px] font-medium uppercase tracking-wider px-2 py-1 rounded-lg bg-[#1E1E2E] text-[#6B7280]">
                  {m}
                </span>
              ))}
            </div>
          )}

          {/* Swap button */}
          {onSwap && (
            <button
              onClick={e => { e.stopPropagation(); onSwap() }}
              className="w-full py-2.5 rounded-xl border border-[#1E1E2E] text-[#6B7280] text-xs font-medium active:border-[#6C63FF] active:text-[#6C63FF] transition-colors"
            >
              Swap Exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}
