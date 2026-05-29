'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Search } from 'lucide-react'
import type { Exercise } from '@/lib/exercises'
import { getImageUrl, getMuscleColor } from '@/lib/exercises'

interface ExercisePickerProps {
  targetMuscle: string
  userEquipment: string[]
  onSelect: (exercise: Exercise) => void
  onClose: () => void
}

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%231E1E2E'/%3E%3Ccircle cx='24' cy='18' r='6' fill='%236B7280'/%3E%3Cellipse cx='24' cy='36' rx='10' ry='6' fill='%236B7280'/%3E%3C/svg%3E`

export default function ExercisePicker({
  targetMuscle,
  userEquipment,
  onSelect,
  onClose,
}: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filtered, setFiltered] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (targetMuscle) params.set('muscle', targetMuscle)
    if (userEquipment.length > 0) params.set('equipment', userEquipment.join(','))

    fetch(`/api/exercises?${params.toString()}`)
      .then(r => r.json())
      .then((data: Exercise[]) => {
        setExercises(data)
        setFiltered(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [targetMuscle, userEquipment])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!search.trim()) {
        setFiltered(exercises)
      } else {
        const q = search.toLowerCase()
        setFiltered(exercises.filter(e => e.name.toLowerCase().includes(q)))
      }
    }, 250)
  }, [search, exercises])

  const muscleColor = getMuscleColor(targetMuscle)

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative w-full max-h-[85vh] flex flex-col rounded-t-3xl overflow-hidden"
        style={{ background: '#13131A' }}
      >
        {/* Handle + header */}
        <div className="flex-shrink-0 px-5 pt-3 pb-4 border-b border-[#1E1E2E]">
          <div className="w-10 h-1 rounded-full bg-[#1E1E2E] mx-auto mb-4" />
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold font-space-grotesk text-[#F0F0FF]">
                Swap Exercise
              </h3>
              {targetMuscle && (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: muscleColor }}
                >
                  {targetMuscle}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1E1E2E] flex items-center justify-center active:opacity-70"
            >
              <X size={15} className="text-[#6B7280]" />
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2.5 bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-3 h-10">
            <Search size={14} className="text-[#6B7280] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#F0F0FF] placeholder-[#6B7280] outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-[#1E1E2E] animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[#6B7280] text-sm">No exercises found</p>
            </div>
          ) : (
            filtered.slice(0, 50).map(ex => (
              <button
                key={ex.id}
                onClick={() => { onSelect(ex); onClose() }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#0A0A0F] border border-[#1E1E2E] active:border-[#6C63FF] transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#1E1E2E]">
                  <img
                    src={ex.images.length > 0 ? getImageUrl(ex, 0) : PLACEHOLDER_SVG}
                    alt={ex.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG }}
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F0F0FF] text-sm font-medium truncate leading-tight">{ex.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {ex.primaryMuscles.slice(0, 2).map(m => (
                      <span
                        key={m}
                        className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                        style={{ background: `${getMuscleColor(m)}20`, color: getMuscleColor(m) }}
                      >
                        {m}
                      </span>
                    ))}
                    <span className="text-[9px] text-[#6B7280] capitalize">{ex.equipment ?? 'bodyweight'}</span>
                  </div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    ex.level === 'beginner' ? 'bg-[#00D4AA]'
                    : ex.level === 'intermediate' ? 'bg-[#FFB347]'
                    : 'bg-[#FF6B35]'
                  }`}
                />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
