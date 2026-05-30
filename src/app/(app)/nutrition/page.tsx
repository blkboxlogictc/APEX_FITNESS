'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Plus, X, Search, Clock, Star,
  Pill, BookOpen, Minus, ChevronDown, ChevronUp, Loader2,
  BarChart2, Droplets, Hash, Check, Zap, Camera, ScanLine, Barcode,
} from 'lucide-react'
import type { DailyNutrition, FoodResult, MealType, WaterLog } from '@/types/nutrition'
import { MEAL_LABELS, MEAL_EMOJIS, getLocalDate, multiplyNutrition } from '@/types/nutrition'
import dynamic from 'next/dynamic'

const MealPhotoAnalyzer = dynamic(() => import('@/components/vision/MealPhotoAnalyzer'), { ssr: false })
const LabelScanner = dynamic(() => import('@/components/vision/LabelScanner'), { ssr: false })
const BarcodeScanner = dynamic(() => import('@/components/vision/BarcodeScanner'), { ssr: false })

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout']

const NUTRISCORE_COLORS: Record<string, { bg: string; text: string }> = {
  a: { bg: '#038141', text: '#fff' },
  b: { bg: '#85BB2F', text: '#fff' },
  c: { bg: '#FECB02', text: '#000' },
  d: { bg: '#EE8100', text: '#fff' },
  e: { bg: '#E63312', text: '#fff' },
}

const NOVA_COLORS: Record<number, string> = {
  1: '#038141', 2: '#85BB2F', 3: '#EE8100', 4: '#E63312',
}

const WATER_GLASS_ML = 250
const WATER_GOAL_ML = 2500
const WATER_GLASSES = WATER_GOAL_ML / WATER_GLASS_ML

function getMealByTime(): MealType {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 13) return 'lunch'
  if (h < 16) return 'snack'
  if (h < 20) return 'dinner'
  return 'snack'
}

// ─── SVG ring components ──────────────────────────────────────────────────────

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const size = 148
  const sw = 11
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const offset = circ * (1 - pct)
  const over = consumed > goal

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E1E2E" strokeWidth={sw} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={over ? '#E63312' : '#FF6B35'}
            strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold font-space-grotesk text-[#F0F0FF] leading-none">
            {consumed.toLocaleString()}
          </span>
          <span className="text-[9px] text-[#6B7280] mt-0.5">/ {goal.toLocaleString()}</span>
          <span className="text-[8px] text-[#6B7280]">kcal</span>
        </div>
      </div>
      <p className="text-[10px] mt-1 font-medium" style={{ color: over ? '#E63312' : '#00D4AA' }}>
        {over
          ? `${(consumed - goal).toLocaleString()} over`
          : `${Math.max(0, goal - consumed).toLocaleString()} left`}
      </p>
    </div>
  )
}

function MacroRing({ value, max, label, unit, color, size = 68 }: {
  value: number; max: number; label: string; unit: string; color: string; size?: number
}) {
  const r = (size - 7) / 2
  const circ = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circ * (1 - pct)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E1E2E" strokeWidth={5} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold font-space-grotesk text-[#F0F0FF] leading-none" style={{ fontSize: value >= 100 ? '11px' : '12px' }}>
            {Math.round(value)}
          </span>
          <span className="text-[7px] text-[#6B7280]">{unit}</span>
        </div>
      </div>
      <span className="text-[9px] text-[#6B7280]">{label}</span>
    </div>
  )
}

// ─── Food card ────────────────────────────────────────────────────────────────

function FoodListItem({ food, onSelect }: { food: FoodResult; onSelect: (f: FoodResult) => void }) {
  const ns = food.nutriscoreGrade ? NUTRISCORE_COLORS[food.nutriscoreGrade.toLowerCase()] : null
  return (
    <button
      onClick={() => onSelect(food)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#1E1E2E] last:border-0 active:bg-[#1E1E2E]/50 text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-[#1E1E2E] flex items-center justify-center flex-shrink-0">
        <span className="text-sm">{food.isSupplementProduct ? '💊' : '🥗'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#F0F0FF] truncate">{food.name}</p>
        <p className="text-[10px] text-[#6B7280] truncate">
          {food.brand ? `${food.brand} · ` : ''}
          {food.servingSize}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {ns && (
          <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold" style={{ background: ns.bg, color: ns.text }}>
            {food.nutriscoreGrade!.toUpperCase()}
          </span>
        )}
        <div className="text-right">
          <p className="text-xs font-bold text-[#FF6B35]">{food.nutrition.calories}</p>
          <p className="text-[9px] text-[#6B7280]">kcal</p>
        </div>
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const [date, setDate] = useState(getLocalDate())
  const [dailyData, setDailyData] = useState<DailyNutrition | null>(null)
  const [loading, setLoading] = useState(true)
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([])
  const [waterTotal, setWaterTotal] = useState(0)
  const [toast, setToast] = useState('')

  // Sheets
  const [searchSheetOpen, setSearchSheetOpen] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [customSheetOpen, setCustomSheetOpen] = useState(false)
  const [fabMenuOpen, setFabMenuOpen] = useState(false)
  const [visionMode, setVisionMode] = useState<'meal' | 'label' | 'barcode' | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Search
  const [searchTab, setSearchTab] = useState<'search' | 'recent' | 'frequent' | 'supplements' | 'custom'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeMode, setBarcodeMode] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<FoodResult[]>([])
  const [recentFoods, setRecentFoods] = useState<FoodResult[]>([])
  const [frequentFoods, setFrequentFoods] = useState<FoodResult[]>([])
  const [supplementFoods, setSupplementFoods] = useState<FoodResult[]>([])
  const [customFoods, setCustomFoods] = useState<FoodResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detail sheet
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<MealType>(getMealByTime())
  const [servings, setServings] = useState(1)
  const [loggingFood, setLoggingFood] = useState(false)

  // Expanded meals
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set([getMealByTime()]))

  // Plan vs Reality
  const [planVsRealityExpanded, setPlanVsRealityExpanded] = useState(false)

  // Quick add
  const [quickCalories, setQuickCalories] = useState('')
  const [quickProtein, setQuickProtein] = useState('')
  const [quickMeal, setQuickMeal] = useState<MealType>(getMealByTime())
  const [savingQuick, setSavingQuick] = useState(false)

  // Custom food form
  const [customForm, setCustomForm] = useState({
    name: '', brand: '', calories: '', protein: '', carbs: '', fat: '',
    serving_size: '1 serving', serving_quantity: '1',
  })
  const [savingCustom, setSavingCustom] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadDailyData = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const [logRes, waterRes] = await Promise.all([
        fetch(`/api/nutrition/log?date=${d}`),
        fetch(`/api/nutrition/water?date=${d}`),
      ])
      if (logRes.ok) setDailyData(await logRes.json() as DailyNutrition)
      if (waterRes.ok) {
        const wData = await waterRes.json() as { logs: WaterLog[]; total_ml: number }
        setWaterLogs(wData.logs)
        setWaterTotal(wData.total_ml)
      }
    } catch {
      showToast('Failed to load nutrition data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDailyData(date) }, [date, loadDailyData])

  const loadSearchInitial = useCallback(async () => {
    try {
      const [searchRes, customRes, suppRes] = await Promise.all([
        fetch('/api/nutrition/search?q='),
        fetch('/api/nutrition/custom-food'),
        fetch('/api/nutrition/supplements'),
      ])
      if (searchRes.ok) {
        const data = await searchRes.json() as { recent: FoodResult[]; frequent: FoodResult[] }
        setRecentFoods(data.recent ?? [])
        setFrequentFoods(data.frequent ?? [])
      }
      if (customRes.ok) {
        const data = await customRes.json() as {
          foods: {
            id: string; name: string; brand: string | null; serving_size: string
            serving_quantity: number | null; calories: number; protein_g: number
            carbs_g: number; fat_g: number; fiber_g: number | null; sugar_g: number | null; sodium_mg: number | null
          }[]
        }
        setCustomFoods((data.foods ?? []).map(f => ({
          id: `custom_${f.id}`, source: 'custom' as const,
          name: f.name, brand: f.brand ?? undefined,
          servingSize: f.serving_size, servingQuantity: f.serving_quantity ?? 1, servingUnit: 'serving',
          nutrition: {
            calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fat_g: f.fat_g,
            fiber_g: f.fiber_g ?? 0, sugar_g: f.sugar_g ?? 0, sodium_mg: f.sodium_mg ?? 0,
            saturated_fat_g: 0, cholesterol_mg: 0,
          },
        })))
      }
      if (suppRes.ok) {
        const data = await suppRes.json() as {
          supplements: { id: string; name: string; brand: string | null; serving_size: string; calories_per_serving: number; protein_g_per_serving: number }[]
        }
        setSupplementFoods((data.supplements ?? []).map(s => ({
          id: `supp_${s.id}`, source: 'custom' as const,
          name: s.name, brand: s.brand ?? undefined,
          servingSize: s.serving_size, servingQuantity: 1, servingUnit: 'serving',
          isSupplementProduct: true,
          nutrition: {
            calories: s.calories_per_serving, protein_g: s.protein_g_per_serving,
            carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0,
            saturated_fat_g: 0, cholesterol_mg: 0,
          },
        })))
      }
    } catch { /* silent */ }
  }, [])

  const openSearchSheet = (meal: MealType) => {
    setSelectedMeal(meal)
    setSearchTab('search')
    setSearchQuery('')
    setSearchResults([])
    setBarcodeMode(false)
    loadSearchInitial()
    setSearchSheetOpen(true)
  }

  // Debounced food search
  useEffect(() => {
    if (!searchSheetOpen || searchTab !== 'search') return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!searchQuery.trim()) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json() as { results: FoodResult[] }
          setSearchResults(data.results ?? [])
        }
      } catch { setSearchResults([]) }
      finally { setSearchLoading(false) }
    }, 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery, searchTab, searchSheetOpen])

  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) return
    setBarcodeLoading(true)
    try {
      const res = await fetch(`/api/nutrition/barcode/${barcodeInput.trim()}`)
      if (res.ok) {
        const data = await res.json() as { food: FoodResult }
        handleSelectFood(data.food)
      } else {
        showToast('Product not found')
      }
    } catch {
      showToast('Barcode lookup failed')
    } finally {
      setBarcodeLoading(false)
      setBarcodeInput('')
    }
  }

  const handleSelectFood = (food: FoodResult) => {
    setSelectedFood(food)
    setServings(1)
    setDetailSheetOpen(true)
    setSearchSheetOpen(false)
  }

  const handleLogFood = async () => {
    if (!selectedFood) return
    setLoggingFood(true)
    const scaled = multiplyNutrition(selectedFood.nutrition, servings)
    try {
      const res = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_id: selectedFood.id,
          food_name: selectedFood.name,
          brand: selectedFood.brand ?? null,
          meal_type: selectedMeal,
          servings,
          serving_size_label: `${servings !== 1 ? `${servings} × ` : ''}${selectedFood.servingSize}`,
          calories: scaled.calories,
          protein_g: scaled.protein_g,
          carbs_g: scaled.carbs_g,
          fat_g: scaled.fat_g,
          fiber_g: scaled.fiber_g,
          sugar_g: scaled.sugar_g,
          sodium_mg: scaled.sodium_mg,
          saturated_fat_g: scaled.saturated_fat_g,
          is_supplement: selectedFood.isSupplementProduct ?? false,
          logged_at: date,
        }),
      })
      if (res.ok) {
        setDetailSheetOpen(false)
        setSelectedFood(null)
        showToast(`${selectedFood.name} logged!`)
        setExpandedMeals(prev => new Set([...prev, selectedMeal]))
        await loadDailyData(date)
      } else {
        showToast('Failed to log food')
      }
    } catch { showToast('Failed to log food') }
    finally { setLoggingFood(false) }
  }

  const handleDeleteLog = async (id: string, name: string) => {
    // Optimistic removal
    setDailyData(prev => {
      if (!prev) return prev
      const lbm = { ...prev.logs_by_meal }
      let removedCals = 0, removedP = 0, removedC = 0, removedF = 0
      for (const meal of MEAL_ORDER) {
        const logs = lbm[meal]
        if (logs) {
          const entry = logs.find(l => l.id === id)
          if (entry) {
            removedCals = entry.calories; removedP = entry.protein_g
            removedC = entry.carbs_g; removedF = entry.fat_g
            lbm[meal] = logs.filter(l => l.id !== id)
            break
          }
        }
      }
      const dt = prev.daily_totals
      const newTotals = {
        ...dt,
        calories: Math.max(0, dt.calories - removedCals),
        protein_g: Math.max(0, dt.protein_g - removedP),
        carbs_g: Math.max(0, dt.carbs_g - removedC),
        fat_g: Math.max(0, dt.fat_g - removedF),
      }
      const tgt = prev.targets
      return {
        ...prev, logs_by_meal: lbm, daily_totals: newTotals,
        remaining: {
          ...prev.remaining,
          calories: Math.max(0, tgt.calories - newTotals.calories),
          protein_g: Math.max(0, tgt.protein_g - newTotals.protein_g),
          carbs_g: Math.max(0, tgt.carbs_g - newTotals.carbs_g),
          fat_g: Math.max(0, tgt.fat_g - newTotals.fat_g),
        },
      }
    })
    try {
      await fetch(`/api/nutrition/log/${id}`, { method: 'DELETE' })
      showToast(`${name} removed`)
    } catch {
      showToast('Failed to remove')
      await loadDailyData(date)
    }
  }

  const handleAddWater = async () => {
    setWaterTotal(prev => prev + WATER_GLASS_ML)
    try {
      const res = await fetch('/api/nutrition/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_ml: WATER_GLASS_ML }),
      })
      if (res.ok) {
        const data = await res.json() as { log: WaterLog }
        setWaterLogs(prev => [...prev, data.log])
      }
    } catch { setWaterTotal(prev => prev - WATER_GLASS_ML) }
  }

  const handleRemoveWater = async () => {
    if (waterLogs.length === 0) return
    const last = waterLogs[waterLogs.length - 1]
    setWaterLogs(prev => prev.slice(0, -1))
    setWaterTotal(prev => Math.max(0, prev - last.amount_ml))
    try {
      await fetch('/api/nutrition/water', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: last.id }),
      })
    } catch {
      setWaterLogs(prev => [...prev, last])
      setWaterTotal(prev => prev + last.amount_ml)
    }
  }

  const handleQuickAdd = async () => {
    const cals = parseInt(quickCalories)
    if (!cals || cals < 1) return
    setSavingQuick(true)
    try {
      const res = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_id: `quick_${Date.now()}`,
          food_name: 'Quick Add',
          meal_type: quickMeal,
          servings: 1,
          serving_size_label: '1 entry',
          calories: cals,
          protein_g: parseFloat(quickProtein) || 0,
          carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0, saturated_fat_g: 0,
          is_supplement: false,
          logged_at: date,
        }),
      })
      if (res.ok) {
        setQuickAddOpen(false)
        setQuickCalories('')
        setQuickProtein('')
        showToast('Calories logged!')
        await loadDailyData(date)
      }
    } catch { showToast('Failed to log') }
    finally { setSavingQuick(false) }
  }

  const handleSaveCustomFood = async () => {
    if (!customForm.name || !customForm.calories) return
    setSavingCustom(true)
    try {
      const res = await fetch('/api/nutrition/custom-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customForm.name,
          brand: customForm.brand || null,
          serving_size: customForm.serving_size,
          serving_quantity: parseFloat(customForm.serving_quantity) || 1,
          serving_unit: 'serving',
          calories: parseFloat(customForm.calories) || 0,
          protein_g: parseFloat(customForm.protein) || 0,
          carbs_g: parseFloat(customForm.carbs) || 0,
          fat_g: parseFloat(customForm.fat) || 0,
        }),
      })
      if (res.ok) {
        setCustomSheetOpen(false)
        setCustomForm({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '', serving_size: '1 serving', serving_quantity: '1' })
        showToast('Custom food saved!')
        await loadSearchInitial()
      }
    } catch { showToast('Failed to save') }
    finally { setSavingCustom(false) }
  }

  const changeDate = (dir: 1 | -1) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + dir)
    setDate(d.toISOString().split('T')[0])
  }

  const isToday = date === getLocalDate()
  const dateLabel = (() => {
    if (isToday) return 'Today'
    const d = new Date(date + 'T12:00:00')
    const yest = new Date(); yest.setDate(yest.getDate() - 1)
    if (d.toDateString() === yest.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  })()

  const totals = dailyData?.daily_totals
  const targets = dailyData?.targets ?? { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 }
  const waterGlassesFilled = Math.min(Math.floor(waterTotal / WATER_GLASS_ML), WATER_GLASSES)
  const scaledNutrition = selectedFood ? multiplyNutrition(selectedFood.nutrition, servings) : null

  if (loading) {
    return (
      <div className="px-5 pt-14 pb-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[#13131A] rounded-card animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="pb-28">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #00D4AA, #6C63FF)', maxWidth: '90vw' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-14 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold font-space-grotesk text-[#F0F0FF]">Nutrition</h1>
          <div className="flex items-center gap-2">
            <Link href="/nutrition/history" className="p-1.5 rounded-lg bg-[#13131A] border border-[#1E1E2E] text-[#6B7280] active:opacity-70">
              <BarChart2 size={15} />
            </Link>
            <Link href="/nutrition/supplements" className="p-1.5 rounded-lg bg-[#13131A] border border-[#1E1E2E] text-[#6B7280] active:opacity-70">
              <Pill size={15} />
            </Link>
          </div>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg bg-[#13131A] border border-[#1E1E2E] text-[#6B7280] active:opacity-70">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 min-w-[140px] justify-center">
            <span className="text-sm font-semibold text-[#F0F0FF]">{dateLabel}</span>
            {!isToday && (
              <button onClick={() => setDate(getLocalDate())} className="text-[10px] text-[#6C63FF] px-1.5 py-0.5 rounded-full border border-[#6C63FF]/40">
                Today
              </button>
            )}
          </div>
          <button onClick={() => changeDate(1)} disabled={isToday} className="p-1.5 rounded-lg bg-[#13131A] border border-[#1E1E2E] text-[#6B7280] disabled:opacity-30 active:opacity-70">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Summary card */}
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4">
          <div className="flex items-center gap-4">
            <CalorieRing consumed={totals?.calories ?? 0} goal={targets.calories} />
            <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1 place-items-center">
              <MacroRing value={totals?.protein_g ?? 0} max={targets.protein_g} label="Protein" unit="g" color="#6C63FF" size={56} />
              <MacroRing value={totals?.carbs_g ?? 0} max={targets.carbs_g} label="Carbs" unit="g" color="#00D4AA" size={56} />
              <MacroRing value={totals?.fat_g ?? 0} max={targets.fat_g} label="Fat" unit="g" color="#FF6B35" size={56} />
              <MacroRing value={waterTotal} max={WATER_GOAL_ML} label="Water" unit="ml" color="#38BDF8" size={56} />
            </div>
          </div>

          {/* Quick stats row */}
          {totals && (
            <div className="mt-3 pt-3 border-t border-[#1E1E2E] grid grid-cols-4 gap-2">
              {[
                { label: 'Fiber', value: `${Math.round(totals.fiber_g)}g`, color: '#00D4AA' },
                { label: 'Sugar', value: `${Math.round(totals.sugar_g)}g`, color: '#FECB02' },
                { label: 'Sodium', value: `${Math.round(totals.sodium_mg)}mg`, color: '#EE8100' },
                { label: 'Sat Fat', value: `${Math.round(totals.saturated_fat_g)}g`, color: '#6B7280' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-xs font-bold" style={{ color }}>{value}</p>
                  <p className="text-[9px] text-[#6B7280]">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Water tracker */}
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Droplets size={14} className="text-[#38BDF8]" />
              <span className="text-sm font-semibold text-[#F0F0FF]">Water</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">
                {(waterTotal / 1000).toFixed(1)}L / {WATER_GOAL_ML / 1000}L
              </span>
              {waterLogs.length > 0 && (
                <button onClick={handleRemoveWater} className="text-[#6B7280] p-0.5">
                  <Minus size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: WATER_GLASSES }).map((_, i) => {
              const filled = i < waterGlassesFilled
              const isNext = i === waterGlassesFilled
              return (
                <button
                  key={i}
                  onClick={isNext || (!filled && i <= waterGlassesFilled) ? handleAddWater : undefined}
                  className={`w-[calc((100%-9*6px)/10)] aspect-square rounded-lg flex items-center justify-center transition-all duration-200 ${
                    filled ? 'bg-[#38BDF8]/20 border border-[#38BDF8]/50' : 'bg-[#1E1E2E] border border-[#2A2A3E]'
                  } ${isNext ? 'border-[#38BDF8]/30 active:scale-95' : ''}`}
                >
                  <Droplets size={12} className={filled ? 'text-[#38BDF8]' : 'text-[#2A2A3E]'} />
                </button>
              )
            })}
          </div>
          <button
            onClick={handleAddWater}
            className="w-full mt-2 py-2 rounded-lg border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-medium active:opacity-70"
          >
            + 250ml glass
          </button>
        </div>

        {/* Meal sections */}
        {MEAL_ORDER.map(meal => {
          const logs = dailyData?.logs_by_meal[meal] ?? []
          const mealCals = logs.reduce((s, l) => s + l.calories, 0)
          const isExpanded = expandedMeals.has(meal)

          return (
            <div key={meal} className="bg-[#13131A] border border-[#1E1E2E] rounded-card overflow-hidden">
              <button
                onClick={() => setExpandedMeals(prev => {
                  const next = new Set(prev)
                  if (next.has(meal)) next.delete(meal); else next.add(meal)
                  return next
                })}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{MEAL_EMOJIS[meal]}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#F0F0FF]">{MEAL_LABELS[meal]}</p>
                    {logs.length > 0 && (
                      <p className="text-[10px] text-[#6B7280]">{logs.length} item{logs.length !== 1 ? 's' : ''} · {mealCals} kcal</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mealCals > 0 && (
                    <span className="text-xs font-bold text-[#FF6B35]">{mealCals}</span>
                  )}
                  {isExpanded ? <ChevronUp size={15} className="text-[#6B7280]" /> : <ChevronDown size={15} className="text-[#6B7280]" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#1E1E2E]">
                  {logs.length === 0 ? (
                    <p className="text-[#6B7280] text-xs text-center py-3">Nothing logged yet</p>
                  ) : (
                    <div>
                      {logs.map(log => (
                        <div key={log.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E1E2E] last:border-0">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-sm text-[#F0F0FF] truncate">{log.food_name}</p>
                            <p className="text-[10px] text-[#6B7280]">
                              {log.serving_size_label} · {log.protein_g}g P · {log.carbs_g}g C · {log.fat_g}g F
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-bold text-[#FF6B35]">{log.calories}</span>
                            <button
                              onClick={() => handleDeleteLog(log.id, log.food_name)}
                              className="p-1 rounded-lg bg-[#1E1E2E] text-[#6B7280] active:opacity-70"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 p-3 border-t border-[#1E1E2E]">
                    <button
                      onClick={() => openSearchSheet(meal)}
                      className="flex-1 py-2 rounded-lg bg-[#1E1E2E] text-[#F0F0FF] text-xs font-medium flex items-center justify-center gap-1.5 active:opacity-70"
                    >
                      <Search size={12} />
                      Search food
                    </button>
                    <button
                      onClick={() => { setQuickMeal(meal); setQuickAddOpen(true) }}
                      className="py-2 px-3 rounded-lg bg-[#1E1E2E] text-[#6B7280] text-xs font-medium flex items-center gap-1 active:opacity-70"
                    >
                      <Zap size={12} />
                      Quick
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Plan vs Reality */}
        {dailyData?.targets && (
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card overflow-hidden">
            <button
              onClick={() => setPlanVsRealityExpanded(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm font-semibold text-[#F0F0FF]">Plan vs Reality</span>
              {planVsRealityExpanded ? <ChevronUp size={15} className="text-[#6B7280]" /> : <ChevronDown size={15} className="text-[#6B7280]" />}
            </button>
            {planVsRealityExpanded && (
              <div className="px-4 pb-4 border-t border-[#1E1E2E] pt-3 space-y-2">
                {[
                  { label: 'Calories', consumed: totals?.calories ?? 0, target: targets.calories, unit: 'kcal', color: '#FF6B35' },
                  { label: 'Protein', consumed: Math.round(totals?.protein_g ?? 0), target: targets.protein_g, unit: 'g', color: '#6C63FF' },
                  { label: 'Carbs', consumed: Math.round(totals?.carbs_g ?? 0), target: targets.carbs_g, unit: 'g', color: '#00D4AA' },
                  { label: 'Fat', consumed: Math.round(totals?.fat_g ?? 0), target: targets.fat_g, unit: 'g', color: '#FF6B35' },
                ].map(({ label, consumed, target, unit, color }) => {
                  const pct = target > 0 ? Math.min(consumed / target, 1.2) : 0
                  const over = consumed > target
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#6B7280]">{label}</span>
                        <span className="text-xs" style={{ color: over ? '#E63312' : color }}>
                          {consumed} / {target}{unit}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(pct * 100, 100)}%`, background: over ? '#E63312' : color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* FAB + action sheet */}
      {fabMenuOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setFabMenuOpen(false)}>
          <div className="fixed bottom-24 right-4 flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            {[
              { icon: Camera, label: 'Photograph Meal', action: () => { setVisionMode('meal'); setFabMenuOpen(false) } },
              { icon: ScanLine, label: 'Scan Label', action: () => { setVisionMode('label'); setFabMenuOpen(false) } },
              { icon: Barcode, label: 'Scan Barcode', action: () => { setVisionMode('barcode'); setFabMenuOpen(false) } },
              { icon: Search, label: 'Search Food', action: () => { openSearchSheet(getMealByTime()); setFabMenuOpen(false) } },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={action}
                className="flex items-center gap-3 bg-[#1E1E2E] rounded-2xl px-4 py-3 shadow-xl border border-white/10 active:scale-95 transition-transform">
                <Icon size={18} className="text-[#6C63FF]" />
                <span className="text-white text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setFabMenuOpen(m => !m)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-30 active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
      >
        <Plus size={24} className={`text-white transition-transform duration-200 ${fabMenuOpen ? 'rotate-45' : ''}`} />
      </button>

      {/* Vision overlays */}
      {visionMode === 'meal' && (
        <MealPhotoAnalyzer
          defaultMeal={getMealByTime()}
          onLogged={() => { setVisionMode(null); loadDailyData(date) }}
          onClose={() => setVisionMode(null)}
        />
      )}
      {visionMode === 'label' && (
        <LabelScanner
          defaultMeal={getMealByTime()}
          onLogged={() => { setVisionMode(null); loadDailyData(date) }}
          onClose={() => setVisionMode(null)}
        />
      )}
      {visionMode === 'barcode' && (
        <BarcodeScanner
          defaultMeal={getMealByTime()}
          onLogged={() => { setVisionMode(null); loadDailyData(date) }}
          onClose={() => setVisionMode(null)}
        />
      )}

      {/* ─── Food Search Sheet ─────────────────────────────────────────────── */}
      {searchSheetOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end justify-center" onClick={() => setSearchSheetOpen(false)}>
          <div className="w-full max-w-[430px] bg-[#13131A] border-t border-[#1E1E2E] rounded-t-2xl flex flex-col" style={{ maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>
            {/* Sheet header */}
            <div className="px-4 pt-4 pb-2 border-b border-[#1E1E2E] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold font-space-grotesk text-[#F0F0FF]">
                  Add to {MEAL_LABELS[selectedMeal]}
                </h3>
                <button onClick={() => setSearchSheetOpen(false)} className="text-[#6B7280]">
                  <X size={20} />
                </button>
              </div>

              {/* Search bar */}
              {searchTab === 'search' && (
                <div className="flex gap-2">
                  {barcodeMode ? (
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-3 py-2.5">
                        <Hash size={14} className="text-[#6B7280] flex-shrink-0" />
                        <input
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={barcodeInput}
                          onChange={e => setBarcodeInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()}
                          placeholder="Enter barcode number..."
                          className="flex-1 bg-transparent text-sm text-[#F0F0FF] placeholder-[#6B7280] outline-none"
                        />
                      </div>
                      <button onClick={handleBarcodeSearch} disabled={barcodeLoading} className="px-3 py-2 rounded-xl bg-[#6C63FF] text-white text-xs font-semibold disabled:opacity-50">
                        {barcodeLoading ? <Loader2 size={14} className="animate-spin" /> : 'Go'}
                      </button>
                      <button onClick={() => setBarcodeMode(false)} className="px-3 py-2 rounded-xl bg-[#1E1E2E] text-[#6B7280] text-xs">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-2 bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-3 py-2.5">
                        <Search size={14} className="text-[#6B7280] flex-shrink-0" />
                        <input
                          autoFocus
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search foods..."
                          className="flex-1 bg-transparent text-sm text-[#F0F0FF] placeholder-[#6B7280] outline-none"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')}><X size={12} className="text-[#6B7280]" /></button>
                        )}
                      </div>
                      <button onClick={() => setBarcodeMode(true)} className="p-2.5 rounded-xl bg-[#1E1E2E] border border-[#1E1E2E] text-[#6B7280]">
                        <Hash size={16} />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Tab bar */}
              <div className="flex gap-1 mt-3 overflow-x-auto pb-1 scrollbar-none">
                {([
                  { key: 'search', label: 'Search', icon: Search },
                  { key: 'recent', label: 'Recent', icon: Clock },
                  { key: 'frequent', label: 'Top', icon: Star },
                  { key: 'supplements', label: 'Supps', icon: Pill },
                  { key: 'custom', label: 'Custom', icon: BookOpen },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSearchTab(key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
                      searchTab === key ? 'bg-[#6C63FF] text-white' : 'bg-[#1E1E2E] text-[#6B7280]'
                    }`}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="overflow-y-auto flex-1">
              {searchTab === 'search' && (
                <>
                  {searchLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-[#6C63FF]" />
                    </div>
                  )}
                  {!searchLoading && searchQuery && searchResults.length === 0 && (
                    <p className="text-[#6B7280] text-sm text-center py-8">No results for &ldquo;{searchQuery}&rdquo;</p>
                  )}
                  {!searchLoading && !searchQuery && (
                    <p className="text-[#6B7280] text-sm text-center py-8">Type to search USDA & Open Food Facts</p>
                  )}
                  {searchResults.map(food => (
                    <FoodListItem key={food.id} food={food} onSelect={handleSelectFood} />
                  ))}
                </>
              )}
              {searchTab === 'recent' && (
                <>
                  {recentFoods.length === 0 ? (
                    <p className="text-[#6B7280] text-sm text-center py-8">No recent foods yet</p>
                  ) : recentFoods.map(food => (
                    <FoodListItem key={food.id} food={food} onSelect={handleSelectFood} />
                  ))}
                </>
              )}
              {searchTab === 'frequent' && (
                <>
                  {frequentFoods.length === 0 ? (
                    <p className="text-[#6B7280] text-sm text-center py-8">Log more foods to see your top picks</p>
                  ) : frequentFoods.map(food => (
                    <FoodListItem key={food.id} food={food} onSelect={handleSelectFood} />
                  ))}
                </>
              )}
              {searchTab === 'supplements' && (
                <>
                  {supplementFoods.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[#6B7280] text-sm mb-3">No active supplements</p>
                      <Link href="/nutrition/supplements" className="text-[#6C63FF] text-xs underline">
                        Manage supplement stack
                      </Link>
                    </div>
                  ) : supplementFoods.map(food => (
                    <FoodListItem key={food.id} food={food} onSelect={handleSelectFood} />
                  ))}
                </>
              )}
              {searchTab === 'custom' && (
                <>
                  <button
                    onClick={() => { setSearchSheetOpen(false); setCustomSheetOpen(true) }}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#1E1E2E] text-[#6C63FF]"
                  >
                    <div className="w-8 h-8 rounded-lg border border-[#6C63FF]/30 flex items-center justify-center">
                      <Plus size={14} />
                    </div>
                    <span className="text-sm font-medium">Create custom food</span>
                  </button>
                  {customFoods.length === 0 ? (
                    <p className="text-[#6B7280] text-sm text-center py-6">No custom foods yet</p>
                  ) : customFoods.map(food => (
                    <FoodListItem key={food.id} food={food} onSelect={handleSelectFood} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Food Detail Sheet ────────────────────────────────────────────────── */}
      {detailSheetOpen && selectedFood && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setDetailSheetOpen(false)}>
          <div className="w-full max-w-[430px] bg-[#13131A] border-t border-[#1E1E2E] rounded-t-2xl overflow-y-auto" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-3">
                  <h3 className="text-base font-bold font-space-grotesk text-[#F0F0FF] leading-snug">{selectedFood.name}</h3>
                  {selectedFood.brand && <p className="text-xs text-[#6B7280] mt-0.5">{selectedFood.brand}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    {selectedFood.nutriscoreGrade && (() => {
                      const ns = NUTRISCORE_COLORS[selectedFood.nutriscoreGrade!.toLowerCase()]
                      return ns ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: ns.bg, color: ns.text }}>
                          Nutri-Score {selectedFood.nutriscoreGrade!.toUpperCase()}
                        </span>
                      ) : null
                    })()}
                    {selectedFood.novaGroup && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border" style={{ borderColor: NOVA_COLORS[selectedFood.novaGroup], color: NOVA_COLORS[selectedFood.novaGroup] }}>
                        NOVA {selectedFood.novaGroup}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setDetailSheetOpen(false)} className="text-[#6B7280] flex-shrink-0">
                  <X size={20} />
                </button>
              </div>

              {/* Servings control */}
              <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-4 mb-4">
                <p className="text-xs text-[#6B7280] mb-2">Serving: {selectedFood.servingSize}</p>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setServings(s => Math.max(0.25, parseFloat((s - 0.25).toFixed(2))))}
                    className="w-9 h-9 rounded-xl bg-[#1E1E2E] flex items-center justify-center text-[#F0F0FF] active:opacity-70"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="text-center">
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={servings}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0) setServings(v)
                      }}
                      className="w-16 text-center text-xl font-bold font-space-grotesk text-[#F0F0FF] bg-transparent outline-none"
                    />
                    <p className="text-[10px] text-[#6B7280]">servings</p>
                  </div>
                  <button
                    onClick={() => setServings(s => parseFloat((s + 0.25).toFixed(2)))}
                    className="w-9 h-9 rounded-xl bg-[#1E1E2E] flex items-center justify-center text-[#F0F0FF] active:opacity-70"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Nutrition preview */}
              {scaledNutrition && (
                <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold font-space-grotesk text-[#FF6B35]">
                      {scaledNutrition.calories} kcal
                    </span>
                    <span className="text-[10px] text-[#6B7280]">per {servings} serving{servings !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Protein', value: scaledNutrition.protein_g, unit: 'g', color: '#6C63FF' },
                      { label: 'Carbs', value: scaledNutrition.carbs_g, unit: 'g', color: '#00D4AA' },
                      { label: 'Fat', value: scaledNutrition.fat_g, unit: 'g', color: '#FF6B35' },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} className="text-center p-2 rounded-lg bg-[#1E1E2E]">
                        <p className="text-sm font-bold" style={{ color }}>{Math.round(value * 10) / 10}{unit}</p>
                        <p className="text-[9px] text-[#6B7280]">{label}</p>
                      </div>
                    ))}
                  </div>
                  {(scaledNutrition.fiber_g > 0 || scaledNutrition.sodium_mg > 0) && (
                    <div className="mt-2 flex gap-3">
                      {scaledNutrition.fiber_g > 0 && (
                        <p className="text-[10px] text-[#6B7280]">Fiber: {Math.round(scaledNutrition.fiber_g * 10) / 10}g</p>
                      )}
                      {scaledNutrition.sodium_mg > 0 && (
                        <p className="text-[10px] text-[#6B7280]">Sodium: {Math.round(scaledNutrition.sodium_mg)}mg</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Meal selector */}
              <div className="mb-4">
                <p className="text-xs text-[#6B7280] mb-2">Add to meal</p>
                <div className="flex flex-wrap gap-2">
                  {MEAL_ORDER.map(meal => (
                    <button
                      key={meal}
                      onClick={() => setSelectedMeal(meal)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedMeal === meal ? 'bg-[#6C63FF] text-white' : 'bg-[#1E1E2E] text-[#6B7280]'
                      }`}
                    >
                      <span>{MEAL_EMOJIS[meal]}</span>
                      {MEAL_LABELS[meal]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLogFood}
                disabled={loggingFood}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
              >
                {loggingFood ? (
                  <><Loader2 size={16} className="animate-spin" /> Logging...</>
                ) : (
                  <><Check size={16} /> Log {servings} serving{servings !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Quick Add Sheet ───────────────────────────────────────────────── */}
      {quickAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setQuickAddOpen(false)}>
          <div className="w-full max-w-[430px] bg-[#13131A] border-t border-[#1E1E2E] rounded-t-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-space-grotesk text-[#F0F0FF]">Quick Add</h3>
              <button onClick={() => setQuickAddOpen(false)} className="text-[#6B7280]"><X size={20} /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">Calories *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={quickCalories}
                  onChange={e => setQuickCalories(e.target.value)}
                  placeholder="e.g. 350"
                  className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50"
                />
              </div>
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">Protein (optional)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={quickProtein}
                  onChange={e => setQuickProtein(e.target.value)}
                  placeholder="e.g. 25g"
                  className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50"
                />
              </div>
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">Meal</label>
                <div className="flex flex-wrap gap-1.5">
                  {MEAL_ORDER.map(meal => (
                    <button
                      key={meal}
                      onClick={() => setQuickMeal(meal)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${quickMeal === meal ? 'bg-[#6C63FF] text-white' : 'bg-[#1E1E2E] text-[#6B7280]'}`}
                    >
                      {MEAL_EMOJIS[meal]} {MEAL_LABELS[meal]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleQuickAdd}
              disabled={!quickCalories || savingQuick}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              {savingQuick ? 'Saving...' : 'Log Calories'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Custom Food Creator Sheet ─────────────────────────────────────── */}
      {customSheetOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setCustomSheetOpen(false)}>
          <div className="w-full max-w-[430px] bg-[#13131A] border-t border-[#1E1E2E] rounded-t-2xl overflow-y-auto" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold font-space-grotesk text-[#F0F0FF]">Create Custom Food</h3>
                <button onClick={() => setCustomSheetOpen(false)} className="text-[#6B7280]"><X size={20} /></button>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  { key: 'name', label: 'Food Name *', placeholder: 'e.g. Homemade Granola' },
                  { key: 'brand', label: 'Brand (optional)', placeholder: 'e.g. My Kitchen' },
                  { key: 'serving_size', label: 'Serving Size', placeholder: 'e.g. 1 cup, 100g' },
                  { key: 'serving_quantity', label: 'Serving Quantity', placeholder: '1' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-[#6B7280] mb-1 block">{label}</label>
                    <input
                      type={key === 'serving_quantity' ? 'number' : 'text'}
                      value={customForm[key as keyof typeof customForm]}
                      onChange={e => setCustomForm(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50"
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'calories', label: 'Calories *', placeholder: '0' },
                    { key: 'protein', label: 'Protein (g)', placeholder: '0' },
                    { key: 'carbs', label: 'Carbs (g)', placeholder: '0' },
                    { key: 'fat', label: 'Fat (g)', placeholder: '0' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-[#6B7280] mb-1 block">{label}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={customForm[key as keyof typeof customForm]}
                        onChange={e => setCustomForm(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm outline-none focus:border-[#6C63FF]/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSaveCustomFood}
                disabled={!customForm.name || !customForm.calories || savingCustom}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
              >
                {savingCustom ? 'Saving...' : 'Save Custom Food'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
