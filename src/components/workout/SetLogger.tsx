'use client'

import { Check, Trash2 } from 'lucide-react'
import type { LoggedSet } from '@/types/workouts'

interface SetLoggerProps {
  sets: LoggedSet[]
  targetReps: string
  weightUnit: 'lbs' | 'kg'
  onUpdate: (localId: string, field: 'weight' | 'actual_reps' | 'rpe', value: string | number) => void
  onComplete: (localId: string) => void
  onDelete: (localId: string) => void
  onAddSet: () => void
}

const RPE_OPTIONS = [6, 7, 8, 9, 10]

export default function SetLogger({
  sets,
  targetReps,
  weightUnit,
  onUpdate,
  onComplete,
  onDelete,
  onAddSet,
}: SetLoggerProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_1fr_80px_36px] gap-1.5 mb-2 px-1">
        <span className="text-[10px] text-[#6B7280] font-medium text-center">SET</span>
        <span className="text-[10px] text-[#6B7280] font-medium text-center">
          {weightUnit === 'lbs' ? 'LBS' : 'KG'}
        </span>
        <span className="text-[10px] text-[#6B7280] font-medium text-center">REPS</span>
        <span className="text-[10px] text-[#6B7280] font-medium text-center">RPE</span>
        <span />
      </div>

      {/* Set rows */}
      <div className="space-y-2">
        {sets.map((set) => (
          <div
            key={set.localId}
            className={`grid grid-cols-[32px_1fr_1fr_80px_36px] gap-1.5 items-center transition-opacity duration-200 ${
              set.completed ? 'opacity-60' : ''
            }`}
          >
            {/* Set number */}
            <button
              onClick={() => !set.completed && onComplete(set.localId)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                set.completed
                  ? 'bg-[#00D4AA] text-white'
                  : 'bg-[#1E1E2E] text-[#6B7280] active:scale-95'
              }`}
            >
              {set.completed ? <Check size={13} strokeWidth={2.5} /> : set.set_number}
            </button>

            {/* Weight input */}
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={set.weight}
              disabled={set.completed}
              onChange={e => onUpdate(set.localId, 'weight', e.target.value)}
              className="h-8 rounded-lg bg-[#1E1E2E] text-[#F0F0FF] text-sm text-center font-medium border border-transparent focus:border-[#6C63FF] focus:outline-none disabled:opacity-50 transition-colors w-full"
            />

            {/* Reps input */}
            <input
              type="number"
              inputMode="numeric"
              placeholder={targetReps.split('-')[0] ?? '—'}
              value={set.actual_reps}
              disabled={set.completed}
              onChange={e => onUpdate(set.localId, 'actual_reps', e.target.value)}
              className="h-8 rounded-lg bg-[#1E1E2E] text-[#F0F0FF] text-sm text-center font-medium border border-transparent focus:border-[#6C63FF] focus:outline-none disabled:opacity-50 transition-colors w-full"
            />

            {/* RPE selector */}
            <div className="flex gap-0.5">
              {RPE_OPTIONS.map(r => (
                <button
                  key={r}
                  disabled={set.completed}
                  onClick={() => onUpdate(set.localId, 'rpe', r)}
                  className={`flex-1 h-8 rounded text-[10px] font-bold transition-all duration-150 disabled:opacity-50 ${
                    set.rpe === r
                      ? 'bg-[#6C63FF] text-white'
                      : 'bg-[#1E1E2E] text-[#6B7280] active:bg-[#2E2E3E]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Delete */}
            <button
              onClick={() => onDelete(set.localId)}
              className="w-9 h-8 flex items-center justify-center rounded-lg text-[#6B7280] active:text-red-400 active:bg-red-400/10 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Add set button */}
      <button
        onClick={onAddSet}
        className="mt-3 w-full h-9 rounded-xl border border-dashed border-[#1E1E2E] text-[#6B7280] text-xs font-medium active:border-[#6C63FF] active:text-[#6C63FF] transition-colors"
      >
        + Add Set
      </button>
    </div>
  )
}
