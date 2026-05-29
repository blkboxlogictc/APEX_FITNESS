'use client'

import { useState } from 'react'
import { X, Check, Loader2, ChevronRight, Pill, ShoppingCart } from 'lucide-react'
import CameraCapture from './CameraCapture'
import type { ProcessedImage } from '@/lib/vision/imageUtils'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'

interface NutritionData {
  calories: number
  total_fat_g: number
  saturated_fat_g: number
  trans_fat_g: number
  cholesterol_mg: number
  sodium_mg: number
  total_carbs_g: number
  dietary_fiber_g: number
  total_sugars_g: number
  added_sugars_g: number
  protein_g: number
  vitamin_d_mcg: number
  calcium_mg: number
  iron_mg: number
  potassium_mg: number
}

interface FoodLabelResult {
  food_name: string
  brand: string | null
  serving_size: string
  serving_size_g: number
  servings_per_container: number
  nutrition_per_serving: NutritionData
  ingredients: string
  allergens: string[]
  label_type: 'food' | 'supplement'
}

interface SupplementResult {
  product_name: string
  brand: string | null
  supplement_type: string
  serving_size: string
  servings_per_container: number
  key_ingredients: Array<{ name: string; amount: number; unit: string }>
  calories_per_serving: number
  protein_g: number
  directions: string
  warnings: string
  label_type: 'supplement'
}

type ScanResult = FoodLabelResult | SupplementResult

interface Props {
  defaultMeal?: MealType
  onLogged?: () => void
  onSupplementAdded?: () => void
  onClose: () => void
}

type Phase = 'CAPTURING' | 'SCANNING' | 'RESULT' | 'LOGGING' | 'DONE'

const MACRO_ROWS = [
  { key: 'calories', label: 'Calories', unit: '' },
  { key: 'total_fat_g', label: 'Total Fat', unit: 'g' },
  { key: 'saturated_fat_g', label: '  Saturated Fat', unit: 'g' },
  { key: 'trans_fat_g', label: '  Trans Fat', unit: 'g' },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
  { key: 'total_carbs_g', label: 'Total Carbohydrate', unit: 'g' },
  { key: 'dietary_fiber_g', label: '  Dietary Fiber', unit: 'g' },
  { key: 'total_sugars_g', label: '  Total Sugars', unit: 'g' },
  { key: 'added_sugars_g', label: '    Incl. Added Sugars', unit: 'g' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
]

function isFoodLabel(r: ScanResult): r is FoodLabelResult {
  return r.label_type === 'food'
}

export default function LabelScanner({ defaultMeal = 'snack', onLogged, onSupplementAdded, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('CAPTURING')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [servings, setServings] = useState(1)
  const [meal, setMeal] = useState<MealType>(defaultMeal)
  const [error, setError] = useState<string | null>(null)

  const handleCapture = async (image: ProcessedImage) => {
    setPhase('SCANNING')
    setError(null)
    try {
      const fd = new FormData()
      fd.append('base64', image.base64)
      fd.append('mimeType', image.mimeType)
      fd.append('labelType', 'auto')
      const res = await fetch('/api/vision/label', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Scan failed')
      const data: ScanResult = await res.json()
      setResult(data)
      setPhase('RESULT')
    } catch {
      setError('Could not read the label. Please try again.')
      setPhase('CAPTURING')
    }
  }

  const logFood = async () => {
    if (!result || !isFoodLabel(result)) return
    setPhase('LOGGING')
    const n = result.nutrition_per_serving
    const today = new Date().toISOString().split('T')[0]
    try {
      await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_id: `label_${Date.now()}`,
          food_name: result.food_name,
          brand: result.brand,
          meal_type: meal,
          servings,
          serving_size_label: result.serving_size,
          calories: Math.round(n.calories * servings),
          protein_g: n.protein_g * servings,
          carbs_g: n.total_carbs_g * servings,
          fat_g: n.total_fat_g * servings,
          fiber_g: n.dietary_fiber_g * servings,
          sugar_g: n.total_sugars_g * servings,
          sodium_mg: n.sodium_mg * servings,
          saturated_fat_g: n.saturated_fat_g * servings,
          logged_at: today,
        }),
      })
      setPhase('DONE')
      onLogged?.()
    } catch {
      setError('Failed to log. Please try again.')
      setPhase('RESULT')
    }
  }

  if (phase === 'CAPTURING') {
    return <CameraCapture mode="label" onCapture={handleCapture} onClose={onClose} />
  }

  if (phase === 'DONE') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
          <Check size={36} className="text-[#00D4AA]" />
        </div>
        <p className="text-white text-xl font-bold">Logged!</p>
        <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-[#6C63FF] rounded-xl text-white font-medium">Done</button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-safe-top pb-3 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2">
          <X size={22} className="text-white/60" />
        </button>
        <p className="text-white font-semibold text-sm flex-1">
          {result ? (isFoodLabel(result) ? result.food_name : (result as SupplementResult).product_name) : 'Label Scanner'}
        </p>
      </div>

      {phase === 'SCANNING' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 size={28} className="text-[#6C63FF] animate-spin" />
          <p className="text-white/60 text-sm">Reading label…</p>
        </div>
      )}

      {(phase === 'RESULT' || phase === 'LOGGING') && result && (
        <div className="flex-1 overflow-y-auto pb-36">
          {error && <p className="text-red-400 text-sm text-center py-3 px-4">{error}</p>}

          {isFoodLabel(result) ? (
            <>
              {/* FDA-style Nutrition Facts */}
              <div className="mx-4 mt-4 rounded-2xl border border-white/10 overflow-hidden bg-[#111118]">
                <div className="border-b-8 border-white p-4 pb-2">
                  <p className="text-white text-2xl font-black">Nutrition Facts</p>
                  <p className="text-white/60 text-xs">{result.servings_per_container} servings per container</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <p className="text-white text-sm">Serving size</p>
                    <p className="text-white font-bold text-sm">{result.serving_size}</p>
                  </div>
                </div>
                <div className="border-b-4 border-white p-2 px-4">
                  <p className="text-white/50 text-xs">Amount Per Serving</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-white font-black text-lg">Calories</p>
                    <p className="text-white font-black text-4xl">{Math.round(result.nutrition_per_serving.calories * servings)}</p>
                  </div>
                </div>
                <div className="divide-y divide-white/10">
                  {MACRO_ROWS.map(row => {
                    const val = result.nutrition_per_serving[row.key as keyof NutritionData]
                    if (val === 0 && row.key !== 'calories') return null
                    const isBold = !row.label.startsWith(' ')
                    return (
                      <div key={row.key} className={`flex justify-between px-4 py-1 ${isBold ? 'border-b-2 border-white/20' : ''}`}>
                        <p className={`text-sm ${isBold ? 'font-bold text-white' : 'text-white/70'}`}>{row.label}</p>
                        <p className="text-white text-sm font-medium">
                          {Math.round((Number(val) || 0) * servings * 10) / 10}{row.unit}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {result.allergens.length > 0 && (
                  <div className="px-4 py-2 border-t border-white/10">
                    <p className="text-white/50 text-xs">Contains: {result.allergens.join(', ')}</p>
                  </div>
                )}
              </div>

              {/* Servings + meal selector */}
              <div className="mx-4 mt-4 space-y-3">
                <div className="flex items-center justify-between bg-[#1E1E2E] rounded-2xl px-4 py-3">
                  <p className="text-white/60 text-sm">Servings</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setServings(s => Math.max(0.25, Math.round((s - 0.25) * 4) / 4))}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">−</button>
                    <span className="text-white font-bold w-8 text-center">{servings}</span>
                    <button onClick={() => setServings(s => Math.round((s + 0.25) * 4) / 4)}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">+</button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'] as MealType[]).map(m => (
                    <button key={m} onClick={() => setMeal(m)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${meal === m ? 'bg-[#6C63FF] text-white' : 'bg-[#1E1E2E] text-white/50'}`}>
                      {m.replace('_', '-')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 pb-safe-bottom px-4 pt-4 bg-gradient-to-t from-[#0A0A0F] to-transparent">
                <button onClick={logFood} disabled={phase === 'LOGGING'}
                  className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
                  {phase === 'LOGGING' ? <Loader2 size={18} className="animate-spin" /> : (
                    <><ShoppingCart size={18} /> Log Food <ChevronRight size={18} /></>
                  )}
                </button>
              </div>
            </>
          ) : (
            // Supplement label result
            <div className="px-4 mt-4 space-y-4">
              <div className="bg-[#1E1E2E] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Pill size={18} className="text-[#6C63FF]" />
                  <p className="text-white font-semibold">Supplement Facts</p>
                  <span className="ml-auto px-2 py-0.5 bg-[#6C63FF]/20 rounded-full text-[#6C63FF] text-xs">
                    {(result as SupplementResult).supplement_type}
                  </span>
                </div>
                <p className="text-white/50 text-xs">Serving: {result.serving_size} · {result.servings_per_container} servings</p>
                <div className="mt-3 space-y-2">
                  {(result as SupplementResult).key_ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <p className="text-white/80 text-sm">{ing.name}</p>
                      <p className="text-white text-sm font-medium">{ing.amount}{ing.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
              {(result as SupplementResult).directions && (
                <div className="bg-[#1E1E2E] rounded-2xl p-4">
                  <p className="text-white/40 text-xs mb-1">Directions</p>
                  <p className="text-white/80 text-sm">{(result as SupplementResult).directions}</p>
                </div>
              )}
              <button
                onClick={() => { onSupplementAdded?.(); onClose() }}
                className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
                <Pill size={18} /> Add to Supplement Stack <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
