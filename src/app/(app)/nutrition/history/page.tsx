'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, TrendingUp, Droplets } from 'lucide-react'
import { getLocalDate } from '@/types/nutrition'

interface DaySummary {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
  log_count: number
}

interface WeeklyAverages {
  avg_calories: number
  avg_protein_g: number
  adherence_percent: number
}

function CalorieDot({ calories, target }: { calories: number; target: number }) {
  if (calories === 0) return <div className="w-2 h-2 rounded-full bg-[#1E1E2E]" />
  const ratio = target > 0 ? calories / target : 0
  const color =
    ratio >= 0.85 && ratio <= 1.15 ? '#00D4AA'
    : ratio < 0.85 ? '#FECB02'
    : '#E63312'
  return <div className="w-2 h-2 rounded-full" style={{ background: color }} />
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

export default function NutritionHistoryPage() {
  const router = useRouter()
  const today = getLocalDate()
  const [viewDate] = useState(new Date())
  const [year, setYear] = useState(viewDate.getFullYear())
  const [month, setMonth] = useState(viewDate.getMonth())

  const [daySummaries, setDaySummaries] = useState<Record<string, DaySummary>>({})
  const [weeklyAverages, setWeeklyAverages] = useState<WeeklyAverages | null>(null)
  const [calorieTarget, setCalorieTarget] = useState(2000)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DaySummary | null>(null)

  const loadMonthData = useCallback(async (y: number, m: number) => {
    setLoading(true)
    try {
      // Load daily summary (targets + weekly averages)
      const summaryRes = await fetch(`/api/nutrition/daily-summary?date=${today}`)
      if (summaryRes.ok) {
        const data = await summaryRes.json() as {
          todays_nutrition: { calories_target: number }
          weekly_averages: WeeklyAverages
        }
        setCalorieTarget(data.todays_nutrition.calories_target)
        setWeeklyAverages(data.weekly_averages)
      }

      // Load food logs for the month by querying per-day summaries
      // We'll load a batch by fetching weekly summaries
      const summaries: Record<string, DaySummary> = {}

      // Sample up to 35 days
      const daysCount = getDaysInMonth(y, m)
      const dateList: string[] = []
      for (let d = 1; d <= daysCount; d++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        dateList.push(dateStr)
      }

      // Batch: fetch all dates in parallel (limit concurrency for edge)
      const batchSize = 7
      for (let i = 0; i < dateList.length; i += batchSize) {
        const batch = dateList.slice(i, i + batchSize)
        const results = await Promise.all(
          batch.map(async (dateStr) => {
            try {
              const [logRes, waterRes] = await Promise.all([
                fetch(`/api/nutrition/log?date=${dateStr}`),
                fetch(`/api/nutrition/water?date=${dateStr}`),
              ])
              const logData = logRes.ok
                ? await logRes.json() as { daily_totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number }; logs_by_meal: Record<string, unknown[]> }
                : null
              const waterData = waterRes.ok
                ? await waterRes.json() as { total_ml: number }
                : null

              if (!logData) return null
              const totalLogs = Object.values(logData.logs_by_meal).reduce((s, arr) => s + arr.length, 0)
              return {
                date: dateStr,
                calories: logData.daily_totals.calories,
                protein_g: logData.daily_totals.protein_g,
                carbs_g: logData.daily_totals.carbs_g,
                fat_g: logData.daily_totals.fat_g,
                water_ml: waterData?.total_ml ?? 0,
                log_count: totalLogs,
              } satisfies DaySummary
            } catch { return null }
          })
        )
        results.forEach(r => { if (r) summaries[r.date] = r })
      }

      setDaySummaries(summaries)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [today])

  useEffect(() => { loadMonthData(year, month) }, [year, month, loadMonthData])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    const now = new Date()
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth())) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfWeek = getFirstDayOfWeek(year, month)
  const isCurrentMonthFuture = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return dateStr > today
  }

  // Compute monthly stats
  const loggedDays = Object.values(daySummaries).filter(d => d.log_count > 0)
  const totalCalories = loggedDays.reduce((s, d) => s + d.calories, 0)
  const avgCalories = loggedDays.length > 0 ? Math.round(totalCalories / loggedDays.length) : 0
  const avgProtein = loggedDays.length > 0 ? Math.round(loggedDays.reduce((s, d) => s + d.protein_g, 0) / loggedDays.length) : 0
  const onTargetDays = loggedDays.filter(d => Math.abs(d.calories - calorieTarget) / calorieTarget < 0.15).length

  // 7-day bar chart data
  const last7Days: { date: string; calories: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    last7Days.push({ date: dateStr, calories: daySummaries[dateStr]?.calories ?? 0 })
  }
  const maxCals = Math.max(...last7Days.map(d => d.calories), calorieTarget, 1)

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg bg-[#13131A] border border-[#1E1E2E] text-[#6B7280]">
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-xl font-bold font-space-grotesk text-[#F0F0FF]">Nutrition History</h1>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* 7-day bar chart */}
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#F0F0FF]">Last 7 Days</p>
            <TrendingUp size={15} className="text-[#6B7280]" />
          </div>
          <div className="relative" style={{ height: 80 }}>
            <svg width="100%" height={80} className="overflow-visible">
              {/* Goal line */}
              <line
                x1="0" y1={80 - (calorieTarget / maxCals) * 70}
                x2="100%" y2={80 - (calorieTarget / maxCals) * 70}
                stroke="#6C63FF" strokeWidth={1} strokeDasharray="4,3" opacity={0.4}
              />
              {last7Days.map((day, i) => {
                const barH = day.calories > 0 ? Math.max(4, (day.calories / maxCals) * 70) : 2
                const x = `${(i / 7) * 100 + 100 / 14}%`
                const isToday = day.date === today
                const onTarget = Math.abs(day.calories - calorieTarget) / calorieTarget < 0.15
                const color = day.calories === 0 ? '#1E1E2E' : isToday ? '#6C63FF' : onTarget ? '#00D4AA' : '#FF6B35'
                return (
                  <g key={day.date}>
                    <rect
                      x={`calc(${x} - 8px)`} y={80 - barH} width={16} height={barH}
                      rx={4} fill={color}
                      style={{ transition: 'all 0.5s ease-out' }}
                    />
                    <text x={x} y={80 + 12} textAnchor="middle" fill="#6B7280" fontSize={8}>
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Weekly summary */}
        {weeklyAverages && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Avg Calories', value: weeklyAverages.avg_calories.toLocaleString(), unit: 'kcal', color: '#FF6B35' },
              { label: 'Avg Protein', value: `${weeklyAverages.avg_protein_g}g`, unit: 'protein', color: '#6C63FF' },
              { label: 'On Target', value: `${weeklyAverages.adherence_percent}%`, unit: '±15%', color: '#00D4AA' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-3 text-center">
                <p className="text-lg font-bold font-space-grotesk" style={{ color }}>{value}</p>
                <p className="text-[9px] text-[#6B7280] mt-0.5">{label}</p>
                <p className="text-[8px] text-[#3A3A4E]">{unit}</p>
              </div>
            ))}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg bg-[#1E1E2E] text-[#6B7280] active:opacity-70">
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-[#F0F0FF]">{getMonthLabel(year, month)}</p>
            <button
              onClick={nextMonth}
              disabled={year === new Date().getFullYear() && month >= new Date().getMonth()}
              className="p-1.5 rounded-lg bg-[#1E1E2E] text-[#6B7280] active:opacity-70 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mb-3">
            {[
              { color: '#00D4AA', label: 'On target' },
              { color: '#FECB02', label: 'Under' },
              { color: '#E63312', label: 'Over' },
              { color: '#1E1E2E', label: 'Not logged' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[9px] text-[#6B7280]">{label}</span>
              </div>
            ))}
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center">
                <span className="text-[10px] text-[#6B7280] font-medium">{d}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for alignment */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const summary = daySummaries[dateStr]
              const isFuture = isCurrentMonthFuture(day)
              const isToday = dateStr === today
              const isSelected = selectedDay?.date === dateStr

              return (
                <button
                  key={day}
                  onClick={() => {
                    if (!isFuture) setSelectedDay(summary ? (isSelected ? null : summary) : null)
                  }}
                  disabled={isFuture}
                  className={`relative flex flex-col items-center justify-center rounded-lg p-1.5 transition-colors ${
                    isToday ? 'border border-[#6C63FF]/50' : 'border border-transparent'
                  } ${isSelected ? 'bg-[#6C63FF]/10' : 'active:bg-[#1E1E2E]'} ${isFuture ? 'opacity-20' : ''}`}
                >
                  <span className={`text-[11px] font-medium mb-1 ${isToday ? 'text-[#6C63FF]' : 'text-[#6B7280]'}`}>
                    {day}
                  </span>
                  {!loading && (
                    <CalorieDot calories={summary?.calories ?? 0} target={calorieTarget} />
                  )}
                  {loading && <div className="w-2 h-2 rounded-full bg-[#1E1E2E] animate-pulse" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#F0F0FF]">{formatDate(selectedDay.date)}</p>
              <button onClick={() => setSelectedDay(null)} className="text-[#6B7280]">
                <ChevronLeft size={14} className="rotate-180" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', value: selectedDay.calories.toLocaleString(), unit: 'kcal', color: '#FF6B35' },
                { label: 'Protein', value: `${Math.round(selectedDay.protein_g)}g`, unit: 'protein', color: '#6C63FF' },
                { label: 'Carbs', value: `${Math.round(selectedDay.carbs_g)}g`, unit: 'carbs', color: '#00D4AA' },
                { label: 'Fat', value: `${Math.round(selectedDay.fat_g)}g`, unit: 'fat', color: '#FF6B35' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-sm font-bold" style={{ color }}>{value}</p>
                  <p className="text-[9px] text-[#6B7280]">{label}</p>
                </div>
              ))}
            </div>
            {selectedDay.water_ml > 0 && (
              <div className="mt-3 pt-3 border-t border-[#1E1E2E] flex items-center gap-2">
                <Droplets size={12} className="text-[#38BDF8]" />
                <span className="text-xs text-[#6B7280]">
                  {(selectedDay.water_ml / 1000).toFixed(1)}L water
                </span>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-[#1E1E2E] flex items-center justify-between">
              <CalorieDot calories={selectedDay.calories} target={calorieTarget} />
              <span className="text-[10px] text-[#6B7280]">
                {selectedDay.calories > 0 ? (
                  Math.abs(selectedDay.calories - calorieTarget) / calorieTarget < 0.15
                    ? '✓ On target'
                    : selectedDay.calories < calorieTarget
                    ? `${calorieTarget - selectedDay.calories} kcal under`
                    : `${selectedDay.calories - calorieTarget} kcal over`
                ) : 'Nothing logged'}
              </span>
            </div>
          </div>
        )}

        {/* Monthly summary */}
        {loggedDays.length > 0 && (
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-card p-4">
            <p className="text-sm font-semibold text-[#F0F0FF] mb-3">
              {getMonthLabel(year, month)} Summary
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Days logged', value: String(loggedDays.length), color: '#00D4AA' },
                { label: 'Avg calories', value: avgCalories.toLocaleString(), color: '#FF6B35' },
                { label: 'Avg protein', value: `${avgProtein}g`, color: '#6C63FF' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-base font-bold font-space-grotesk" style={{ color }}>{value}</p>
                  <p className="text-[9px] text-[#6B7280]">{label}</p>
                </div>
              ))}
            </div>
            {loggedDays.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#1E1E2E]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#6B7280]">On-target days</span>
                  <span className="text-xs text-[#00D4AA] font-medium">{onTargetDays}/{loggedDays.length}</span>
                </div>
                <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00D4AA] rounded-full"
                    style={{ width: `${(onTargetDays / loggedDays.length) * 100}%`, transition: 'width 0.7s ease-out' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
