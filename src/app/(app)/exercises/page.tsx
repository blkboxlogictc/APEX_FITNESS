'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import type { Exercise } from '@/lib/exercises'
import { getImageUrl, getMuscleColor } from '@/lib/exercises'

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%231E1E2E'/%3E%3Ccircle cx='40' cy='30' r='10' fill='%236B7280'/%3E%3Cellipse cx='40' cy='60' rx='16' ry='10' fill='%236B7280'/%3E%3C/svg%3E`
const PAGE_SIZE = 20

const MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Glutes']
const MUSCLE_MAP: Record<string, string> = {
  Chest: 'chest', Back: 'lats', Shoulders: 'shoulders',
  Arms: 'biceps', Core: 'abdominals', Legs: 'quadriceps', Glutes: 'glutes',
}

const EQUIPMENT_FILTERS = ['All', 'Bodyweight', 'Dumbbell', 'Barbell', 'Cable', 'Machine']
const EQUIPMENT_MAP: Record<string, string> = {
  Bodyweight: 'body only', Dumbbell: 'dumbbell',
  Barbell: 'barbell', Cable: 'cable', Machine: 'machine',
}

const LEVEL_FILTERS = ['All', 'Beginner', 'Intermediate', 'Expert']

export default function ExercisesPage() {
  const router = useRouter()
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [filtered, setFiltered] = useState<Exercise[]>([])
  const [visible, setVisible] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('All')
  const [equipment, setEquipment] = useState('All')
  const [level, setLevel] = useState('All')

  const [selected, setSelected] = useState<Exercise | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [imgErr, setImgErr] = useState(false)
  const touchStartX = useRef(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch all exercises once
  useEffect(() => {
    fetch('/api/exercises')
      .then(r => r.json())
      .then((data: Exercise[]) => {
        setAllExercises(data)
        setFiltered(data)
        setVisible(data.slice(0, PAGE_SIZE))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const applyFilters = useCallback((
    q: string,
    m: string,
    eq: string,
    lv: string,
    source: Exercise[]
  ) => {
    let result = source

    if (q.trim()) {
      const lower = q.toLowerCase()
      result = result.filter(e => e.name.toLowerCase().includes(lower))
    }
    if (m !== 'All') {
      const target = MUSCLE_MAP[m] ?? m.toLowerCase()
      result = result.filter(e => e.primaryMuscles.some(pm => pm.toLowerCase().includes(target)))
    }
    if (eq !== 'All') {
      const target = EQUIPMENT_MAP[eq] ?? eq.toLowerCase()
      result = result.filter(e => (e.equipment ?? 'body only') === target)
    }
    if (lv !== 'All') {
      result = result.filter(e => e.level === lv.toLowerCase())
    }

    setFiltered(result)
    setVisible(result.slice(0, PAGE_SIZE))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      applyFilters(search, muscle, equipment, level, allExercises)
    }, 300)
  }, [search, muscle, equipment, level, allExercises, applyFilters])

  const loadMore = () => {
    setVisible(prev => filtered.slice(0, prev.length + PAGE_SIZE))
  }

  const openSheet = (ex: Exercise) => {
    setSelected(ex)
    setImgIdx(0)
    setImgErr(false)
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    setTimeout(() => setSelected(null), 300)
  }

  const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
        active
          ? 'text-white'
          : 'bg-[#13131A] border border-[#1E1E2E] text-[#6B7280]'
      }`}
      style={active ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : undefined}
    >
      {label}
    </button>
  )

  const levelDot = (lv: string) =>
    lv === 'beginner' ? 'bg-[#00D4AA]' : lv === 'intermediate' ? 'bg-[#FFB347]' : 'bg-[#FF6B35]'

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0F] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-14 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-2xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={16} className="text-[#F0F0FF]" />
          </button>
          <h1 className="text-xl font-bold font-space-grotesk text-[#F0F0FF]">Exercise Library</h1>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 bg-[#13131A] border border-[#1E1E2E] rounded-2xl px-4 h-11 mb-4">
          <Search size={15} className="text-[#6B7280] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#F0F0FF] placeholder-[#6B7280] outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#6B7280] active:text-[#F0F0FF]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter rows */}
        <div className="space-y-2 mb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {MUSCLE_FILTERS.map(f => (
              <FilterChip key={f} label={f} active={muscle === f} onClick={() => setMuscle(f)} />
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {EQUIPMENT_FILTERS.map(f => (
              <FilterChip key={f} label={f} active={equipment === f} onClick={() => setEquipment(f)} />
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {LEVEL_FILTERS.map(f => (
              <FilterChip key={f} label={f} active={level === f} onClick={() => setLevel(f)} />
            ))}
          </div>
        </div>

        {!loading && (
          <p className="text-[#6B7280] text-xs">
            {filtered.length} exercises
          </p>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {loading ? (
          <div className="space-y-3 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-[#13131A] animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[#F0F0FF] text-sm font-medium mb-1">No exercises found</p>
            <p className="text-[#6B7280] text-xs">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 pt-2">
              {visible.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => openSheet(ex)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#13131A] border border-[#1E1E2E] active:border-[#6C63FF] transition-colors text-left"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[#1E1E2E]">
                    <img
                      src={ex.images.length > 0 ? getImageUrl(ex, 0) : PLACEHOLDER_SVG}
                      alt={ex.name}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG }}
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F0F0FF] text-sm font-semibold leading-tight truncate mb-1">{ex.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${levelDot(ex.level)}`} />
                </button>
              ))}
            </div>

            {visible.length < filtered.length && (
              <button
                onClick={loadMore}
                className="w-full mt-4 py-3 rounded-2xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium active:border-[#6C63FF] active:text-[#6C63FF] transition-colors"
              >
                Load more ({filtered.length - visible.length} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {/* Exercise detail sheet */}
      {selected && (
        <div
          className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${sheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSheet} />
          <div
            className={`relative w-full max-h-[90vh] flex flex-col rounded-t-3xl overflow-hidden transition-transform duration-300 ${sheetOpen ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ background: '#13131A' }}
          >
            {/* Handle */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[#1E1E2E] mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <div />
              <button
                onClick={closeSheet}
                className="w-8 h-8 rounded-full bg-[#1E1E2E] flex items-center justify-center active:opacity-70 mt-2"
              >
                <X size={15} className="text-[#6B7280]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {/* Image carousel */}
              {selected.images.length > 0 && (
                <div
                  className="w-full h-56 rounded-2xl overflow-hidden bg-[#1E1E2E] mb-4 relative"
                  onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
                  onTouchEnd={e => {
                    const dx = e.changedTouches[0].clientX - touchStartX.current
                    if (Math.abs(dx) > 40) {
                      if (dx < 0 && imgIdx < selected.images.length - 1) setImgIdx(i => i + 1)
                      if (dx > 0 && imgIdx > 0) setImgIdx(i => i - 1)
                    }
                  }}
                >
                  <img
                    src={imgErr ? PLACEHOLDER_SVG : getImageUrl(selected, imgIdx)}
                    alt={selected.name}
                    className="w-full h-full object-cover"
                    onError={() => setImgErr(true)}
                  />
                  {selected.images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {selected.images.map((_, i) => (
                        <button key={i} onClick={() => setImgIdx(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? 'bg-white scale-125' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title + badges */}
              <h2 className="text-xl font-bold font-space-grotesk text-[#F0F0FF] mb-2">{selected.name}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${levelDot(selected.level).replace('bg-', 'bg-').replace('bg-[', 'bg-[').replace(']', '/20]')} text-[${selected.level === 'beginner' ? '#00D4AA' : selected.level === 'intermediate' ? '#FFB347' : '#FF6B35'}]`}
                  style={{
                    background: selected.level === 'beginner' ? '#00D4AA20' : selected.level === 'intermediate' ? '#FFB34720' : '#FF6B3520',
                    color: selected.level === 'beginner' ? '#00D4AA' : selected.level === 'intermediate' ? '#FFB347' : '#FF6B35',
                  }}
                >
                  {selected.level}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1E1E2E] text-[#6B7280] capitalize">
                  {selected.category}
                </span>
                {selected.equipment && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1E1E2E] text-[#6B7280] capitalize">
                    {selected.equipment}
                  </span>
                )}
              </div>

              {/* Muscles */}
              <div className="mb-4">
                <p className="text-[#6B7280] text-[10px] uppercase tracking-wider font-semibold mb-2">Muscles</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.primaryMuscles.map(m => (
                    <span key={m} className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize"
                      style={{ background: `${getMuscleColor(m)}20`, color: getMuscleColor(m) }}
                    >
                      {m}
                    </span>
                  ))}
                  {selected.secondaryMuscles.map(m => (
                    <span key={m} className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize bg-[#1E1E2E] text-[#6B7280]">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {selected.instructions.length > 0 && (
                <div className="mb-5">
                  <p className="text-[#6B7280] text-[10px] uppercase tracking-wider font-semibold mb-2">Instructions</p>
                  <ol className="space-y-2">
                    {selected.instructions.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-[#F0F0FF]/80 leading-relaxed">
                        <span
                          className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold mt-0.5"
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

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const msg = encodeURIComponent(`Tell me more about ${selected.name} — form cues, common mistakes, and how it fits into my plan`)
                    router.push(`/coach?prefill=${msg}`)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium active:border-[#6C63FF] active:text-[#6C63FF] transition-colors"
                >
                  <MessageSquare size={15} />
                  Ask Coach
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
