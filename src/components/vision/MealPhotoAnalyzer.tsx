'use client'

import { useState } from 'react'
import { X, Check, Edit3, Plus, Minus, ChevronRight, Loader2, UtensilsCrossed } from 'lucide-react'
import CameraCapture from './CameraCapture'
import type { ProcessedImage } from '@/lib/vision/imageUtils'
import type { MealAnalysisResult, MealAnalysisItem } from '@/app/api/vision/meal/route'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'

interface Props {
  defaultMeal?: MealType
  onLogged: (count: number) => void
  onClose: () => void
}

type Phase = 'CAPTURING' | 'ANALYZING' | 'RESULTS' | 'LOGGING' | 'DONE'

interface EditableItem extends MealAnalysisItem {
  selected: boolean
  editingName: boolean
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
}

export default function MealPhotoAnalyzer({ defaultMeal = 'lunch', onLogged, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('CAPTURING')
  const [capturedURL, setCapturedURL] = useState<string | null>(null)
  const [result, setResult] = useState<MealAnalysisResult | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [meal, setMeal] = useState<MealType>(defaultMeal)
  const [error, setError] = useState<string | null>(null)

  const handleCapture = async (image: ProcessedImage, dataURL: string) => {
    setCapturedURL(dataURL)
    setPhase('ANALYZING')
    setError(null)
    try {
      const fd = new FormData()
      fd.append('base64', image.base64)
      fd.append('mimeType', image.mimeType)
      const res = await fetch('/api/vision/meal', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Analysis failed')
      const data: MealAnalysisResult = await res.json()
      setResult(data)
      setItems(data.items.map(item => ({ ...item, selected: true, editingName: false })))
      setPhase('RESULTS')
    } catch {
      setError('Could not analyse the photo. Please try again.')
      setPhase('CAPTURING')
    }
  }

  const toggleItem = (i: number) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, selected: !it.selected } : it))
  }

  const adjustQuantity = (i: number, delta: number) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it
      const q = Math.max(0.25, Math.round((it.quantity + delta) * 4) / 4)
      const ratio = q / it.quantity
      return {
        ...it,
        quantity: q,
        calories: Math.round(it.calories * ratio),
        protein_g: Math.round(it.protein_g * ratio * 10) / 10,
        carbs_g: Math.round(it.carbs_g * ratio * 10) / 10,
        fat_g: Math.round(it.fat_g * ratio * 10) / 10,
        fiber_g: Math.round(it.fiber_g * ratio * 10) / 10,
      }
    }))
  }

  const updateName = (i: number, name: string) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, name, editingName: false } : it))
  }

  const selectedItems = items.filter(it => it.selected)
  const totalCals = selectedItems.reduce((s, it) => s + it.calories, 0)
  const totalProtein = selectedItems.reduce((s, it) => s + it.protein_g, 0)
  const totalCarbs = selectedItems.reduce((s, it) => s + it.carbs_g, 0)
  const totalFat = selectedItems.reduce((s, it) => s + it.fat_g, 0)

  const logItems = async () => {
    if (selectedItems.length === 0) return
    setPhase('LOGGING')
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toTimeString().slice(0, 5)
    try {
      await Promise.all(
        selectedItems.map(item =>
          fetch('/api/nutrition/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              food_id: `vision_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              food_name: item.name,
              brand: 'AI Photo Analysis',
              meal_type: meal,
              servings: item.quantity,
              serving_size_label: item.unit,
              calories: item.calories,
              protein_g: item.protein_g,
              carbs_g: item.carbs_g,
              fat_g: item.fat_g,
              fiber_g: item.fiber_g,
              sugar_g: 0,
              sodium_mg: 0,
              saturated_fat_g: 0,
              logged_at: today,
              logged_time: now,
              image_url: capturedURL,
            }),
          })
        )
      )
      setPhase('DONE')
      onLogged(selectedItems.length)
    } catch {
      setError('Failed to log items. Please try again.')
      setPhase('RESULTS')
    }
  }

  if (phase === 'CAPTURING') {
    return <CameraCapture mode="meal" onCapture={handleCapture} onClose={onClose} />
  }

  if (phase === 'DONE') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
          <Check size={36} className="text-[#00D4AA]" />
        </div>
        <p className="text-white text-xl font-bold">Logged!</p>
        <p className="text-white/50 text-sm">{selectedItems.length} items · {totalCals} kcal</p>
        <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-[#6C63FF] rounded-xl text-white font-medium">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pb-3 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2">
          <X size={22} className="text-white/60" />
        </button>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">Meal Analysis</p>
          {result && (
            <p className="text-white/40 text-xs">{result.meal_name} · {Math.round(result.confidence * 100)}% confident</p>
          )}
        </div>
      </div>

      {phase === 'ANALYZING' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {capturedURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedURL} alt="Analysing" className="w-40 h-40 object-cover rounded-2xl opacity-60" />
          )}
          <Loader2 size={28} className="text-[#6C63FF] animate-spin" />
          <p className="text-white/60 text-sm">Analysing your meal…</p>
        </div>
      )}

      {(phase === 'RESULTS' || phase === 'LOGGING') && result && (
        <>
          {/* Captured photo + totals */}
          <div className="px-4 py-3 flex gap-3 items-start">
            {capturedURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capturedURL} alt="Meal" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'kcal', value: totalCals },
                  { label: 'P', value: `${totalProtein.toFixed(0)}g` },
                  { label: 'C', value: `${totalCarbs.toFixed(0)}g` },
                  { label: 'F', value: `${totalFat.toFixed(0)}g` },
                ].map(m => (
                  <div key={m.label} className="bg-[#1E1E2E] rounded-xl p-2 text-center">
                    <p className="text-white font-bold text-base">{m.value}</p>
                    <p className="text-white/40 text-xs">{m.label}</p>
                  </div>
                ))}
              </div>
              {result.notes && (
                <p className="text-white/40 text-xs mt-2">{result.notes}</p>
              )}
            </div>
          </div>

          {/* Meal selector */}
          <div className="px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(Object.keys(MEAL_LABELS) as MealType[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                    meal === m
                      ? 'bg-[#6C63FF] text-white'
                      : 'bg-[#1E1E2E] text-white/50'
                  }`}
                >
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Item list */}
          <div className="flex-1 overflow-y-auto px-4 pb-32">
            {error && (
              <p className="text-red-400 text-sm text-center py-3">{error}</p>
            )}
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Items detected</p>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`rounded-2xl p-3 transition-all ${
                    item.selected ? 'bg-[#1E1E2E]' : 'bg-[#1E1E2E]/40 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleItem(i)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        item.selected ? 'bg-[#00D4AA] border-[#00D4AA]' : 'border-white/30'
                      }`}
                    >
                      {item.selected && <Check size={11} className="text-black" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      {item.editingName ? (
                        <input
                          autoFocus
                          defaultValue={item.name}
                          className="w-full bg-transparent text-white text-sm font-medium border-b border-[#6C63FF] outline-none pb-0.5"
                          onBlur={e => updateName(i, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && updateName(i, (e.target as HTMLInputElement).value)}
                        />
                      ) : (
                        <button
                          onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, editingName: true } : it))}
                          className="flex items-center gap-1.5 text-left"
                        >
                          <span className="text-white text-sm font-medium leading-tight">{item.name}</span>
                          <Edit3 size={11} className="text-white/30 flex-shrink-0" />
                        </button>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => adjustQuantity(i, -0.25)} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                            <Minus size={10} className="text-white" />
                          </button>
                          <span className="text-white/60 text-xs">{item.quantity} {item.unit}</span>
                          <button onClick={() => adjustQuantity(i, 0.25)} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                            <Plus size={10} className="text-white" />
                          </button>
                        </div>
                        <span className="text-white/40 text-xs">{item.calories} kcal</span>
                        <span className="text-white/30 text-xs">P:{item.protein_g.toFixed(0)}g</span>
                      </div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      item.confidence > 0.8 ? 'bg-[#00D4AA]/20 text-[#00D4AA]'
                        : item.confidence > 0.5 ? 'bg-[#FECB02]/20 text-[#FECB02]'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Log button */}
          <div className="absolute bottom-0 left-0 right-0 pb-safe-bottom px-4 pt-4 bg-gradient-to-t from-[#0A0A0F] to-transparent">
            <button
              onClick={logItems}
              disabled={selectedItems.length === 0 || phase === 'LOGGING'}
              className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              {phase === 'LOGGING' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <UtensilsCrossed size={18} />
                  Log {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} · {totalCals} kcal
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
