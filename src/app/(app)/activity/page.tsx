'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X, ChevronRight, Minus, Plus } from 'lucide-react'
import ActivityRings from '@/components/activity/ActivityRings'
import CaloriePreview from '@/components/activity/CaloriePreview'
import ActivityCard from '@/components/activity/ActivityCard'
import WeeklyActivityBar from '@/components/activity/WeeklyActivityBar'
import {
  ACTIVITIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_EMOJIS,
  type Activity,
  type ActivityCategory,
} from '@/lib/activities'
import type { ActivityLog, ActivityStats } from '@/types/activities'
import Link from 'next/link'

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ActivityCategory[]

type Tab = 'log' | 'history'

export default function ActivityPage() {
  const [supabase] = useState(() => createClient())
  const [tab, setTab] = useState<Tab>('log')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | null>(null)

  // Stats
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // History
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreLogs, setHasMoreLogs] = useState(false)

  // Log sheet
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [logging, setLogging] = useState(false)
  const [logSuccess, setLogSuccess] = useState(false)

  // User weight for calorie preview
  const [weightKg, setWeightKg] = useState(75)

  const sheetRef = useRef<HTMLDivElement>(null)

  // Filter activities
  const filtered = ACTIVITIES.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || a.category === categoryFilter
    return matchSearch && matchCat
  })

  // Group filtered activities by category
  const grouped = new Map<ActivityCategory, Activity[]>()
  for (const a of filtered) {
    if (!grouped.has(a.category)) grouped.set(a.category, [])
    grouped.get(a.category)!.push(a)
  }

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/activities/stats')
      const data = (await res.json()) as ActivityStats
      setStats(data)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async (page: number, replace = false) => {
    setLogsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const limit = 20
      const offset = (page - 1) * limit
      const { data, count } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .range(offset, offset + limit - 1)
      const rows = (data ?? []) as ActivityLog[]
      setLogs((prev) => (replace ? rows : [...prev, ...rows]))
      setHasMoreLogs((count ?? 0) > offset + limit)
    } finally {
      setLogsLoading(false)
    }
  }, [supabase])

  const fetchUserWeight = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('user_profiles').select('weight_kg').eq('id', user.id).single()
    if (data?.weight_kg) setWeightKg(data.weight_kg as number)
  }, [supabase])

  useEffect(() => {
    fetchStats()
    fetchUserWeight()
  }, [fetchStats, fetchUserWeight])

  useEffect(() => {
    if (tab === 'history') fetchLogs(1, true)
  }, [tab, fetchLogs])

  const handleDeleteLog = async (id: string) => {
    await fetch(`/api/activities/${id}`, { method: 'DELETE' })
    setLogs((prev) => prev.filter((l) => l.id !== id))
    fetchStats()
  }

  const handleLog = async () => {
    if (!selectedActivity) return
    setLogging(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: selectedActivity.id,
          duration_minutes: duration,
          notes: notes.trim() || undefined,
        }),
      })
      if (res.ok) {
        setLogSuccess(true)
        fetchStats()
        setTimeout(() => {
          setSelectedActivity(null)
          setDuration(30)
          setNotes('')
          setLogSuccess(false)
        }, 1200)
      }
    } finally {
      setLogging(false)
    }
  }

  const weeklyGoal = stats?.weekly_goal.active_minutes ?? 150
  const sessionsGoal = stats?.weekly_goal.sessions ?? 5
  const caloriesGoal = weeklyGoal * 5 // ~5 cal/min estimate for weekly goal display

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-14 pb-3 border-b border-[#1E1E2E]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-space-grotesk text-[#F0F0FF]">Activity</h1>
          <Link
            href="/activity/sport-programs"
            className="text-xs text-[#6C63FF] font-medium flex items-center gap-0.5"
          >
            Sport Programs <ChevronRight size={12} />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#13131A] rounded-xl p-1 gap-1">
          {(['log', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                tab === t
                  ? 'text-[#F0F0FF]'
                  : 'text-[#6B7280]'
              }`}
              style={tab === t ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : {}}
            >
              {t === 'log' ? 'Log Activity' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Log Activity */}
      {tab === 'log' && (
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Weekly Rings */}
          <div className="px-5 py-4">
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#F0F0FF]">This Week</h2>
                <span className="text-[#6B7280] text-[10px]">goal: {weeklyGoal} min</span>
              </div>
              {statsLoading ? (
                <div className="h-20 animate-pulse bg-[#1E1E2E] rounded-xl" />
              ) : (
                <ActivityRings
                  activeMinutes={stats?.this_week.active_minutes ?? 0}
                  activeMinutesGoal={weeklyGoal}
                  caloriesBurned={stats?.this_week.calories_burned ?? 0}
                  caloriesGoal={caloriesGoal}
                  sessions={stats?.this_week.sessions ?? 0}
                  sessionsGoal={sessionsGoal}
                  size={120}
                />
              )}
            </div>
          </div>

          {/* Search */}
          <div className="px-5 mb-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activities…"
                className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#F0F0FF] placeholder-[#6B7280] focus:outline-none focus:border-[#6C63FF]/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                >
                  <X size={14} className="text-[#6B7280]" />
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          <div className="px-5 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  !categoryFilter
                    ? 'text-white'
                    : 'bg-[#13131A] border border-[#1E1E2E] text-[#6B7280]'
                }`}
                style={!categoryFilter ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : {}}
              >
                All
              </button>
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    categoryFilter === cat
                      ? 'text-white border'
                      : 'bg-[#13131A] border border-[#1E1E2E] text-[#6B7280]'
                  }`}
                  style={
                    categoryFilter === cat
                      ? { background: `${CATEGORY_COLORS[cat]}25`, borderColor: CATEGORY_COLORS[cat] + '60', color: CATEGORY_COLORS[cat] }
                      : {}
                  }
                >
                  <span>{CATEGORY_EMOJIS[cat]}</span>
                  <span>{CATEGORY_LABELS[cat]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity grid */}
          <div className="px-5 space-y-4">
            {Array.from(grouped.entries()).map(([cat, activities]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{CATEGORY_EMOJIS[cat]}</span>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: CATEGORY_COLORS[cat] }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {activities.map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => {
                        setSelectedActivity(activity)
                        setDuration(30)
                        setNotes('')
                      }}
                      className="bg-[#13131A] border border-[#1E1E2E] rounded-xl p-3 text-left active:opacity-70 transition-opacity"
                    >
                      <p className="text-[#F0F0FF] text-xs font-semibold leading-tight mb-1.5">
                        {activity.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: `${CATEGORY_COLORS[cat]}18`, color: CATEGORY_COLORS[cat] }}
                        >
                          MET {activity.met}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#6B7280] text-sm">No activities found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: History */}
      {tab === 'history' && (
        <div className="flex-1 overflow-y-auto pb-28 px-5 py-4">
          {/* Weekly bar */}
          {stats && (
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 mb-4">
              <h2 className="text-sm font-semibold text-[#F0F0FF] mb-3">Daily Active Minutes</h2>
              <WeeklyActivityBar
                dailyMinutes={stats.daily_minutes}
                goalMinutes={Math.round(weeklyGoal / 7)}
              />
            </div>
          )}

          {logsLoading && logs.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-[#13131A] animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🏃</div>
              <p className="text-[#F0F0FF] font-semibold mb-1">No activities yet</p>
              <p className="text-[#6B7280] text-sm">Log your first activity to start tracking</p>
              <button
                onClick={() => setTab('log')}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
              >
                Log Activity
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => (
                <ActivityCard key={log.id} log={log} onDelete={handleDeleteLog} />
              ))}
              {hasMoreLogs && (
                <button
                  onClick={() => {
                    const next = historyPage + 1
                    setHistoryPage(next)
                    fetchLogs(next)
                  }}
                  disabled={logsLoading}
                  className="w-full py-3 rounded-2xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium disabled:opacity-50"
                >
                  {logsLoading ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log Activity Bottom Sheet */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedActivity(null)}
          />

          {/* Sheet */}
          <div
            ref={sheetRef}
            className="relative bg-[#13131A] rounded-t-3xl border-t border-[#1E1E2E] px-5 pt-5 pb-safe"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-[#2E2E3E] rounded-full mx-auto mb-4" />

            {/* Activity name */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#F0F0FF] font-space-grotesk">
                  {selectedActivity.name}
                </h3>
                <p
                  className="text-xs font-medium mt-0.5"
                  style={{ color: CATEGORY_COLORS[selectedActivity.category] }}
                >
                  {CATEGORY_EMOJIS[selectedActivity.category]} {CATEGORY_LABELS[selectedActivity.category]}
                </p>
              </div>
              <button onClick={() => setSelectedActivity(null)}>
                <X size={18} className="text-[#6B7280]" />
              </button>
            </div>

            {/* Duration */}
            <div className="mb-4">
              <p className="text-xs text-[#6B7280] mb-2 font-medium">Duration</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDuration((d) => Math.max(5, d - 5))}
                  className="w-10 h-10 rounded-xl bg-[#1E1E2E] flex items-center justify-center active:opacity-70"
                >
                  <Minus size={16} className="text-[#F0F0FF]" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold font-space-grotesk text-[#F0F0FF]">{duration}</span>
                  <span className="text-sm text-[#6B7280] ml-1.5">min</span>
                </div>
                <button
                  onClick={() => setDuration((d) => Math.min(180, d + 5))}
                  className="w-10 h-10 rounded-xl bg-[#1E1E2E] flex items-center justify-center active:opacity-70"
                >
                  <Plus size={16} className="text-[#F0F0FF]" />
                </button>
              </div>
              {/* Quick duration chips */}
              <div className="flex gap-2 mt-3">
                {[15, 30, 45, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      duration === d ? 'text-white' : 'bg-[#1E1E2E] text-[#6B7280]'
                    }`}
                    style={duration === d ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : {}}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* Calorie Preview */}
            <div className="mb-4">
              <CaloriePreview
                met={selectedActivity.met}
                durationMinutes={duration}
                weightKg={weightKg}
                activityName={selectedActivity.name}
              />
            </div>

            {/* Notes */}
            <div className="mb-5">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-3.5 py-2.5 text-sm text-[#F0F0FF] placeholder-[#6B7280] focus:outline-none focus:border-[#6C63FF]/50"
              />
            </div>

            {/* Log button */}
            <button
              onClick={handleLog}
              disabled={logging || logSuccess}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
              style={
                logSuccess
                  ? { background: 'linear-gradient(135deg, #00D4AA, #00D4AA)' }
                  : { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }
              }
            >
              {logSuccess ? '✓ Logged!' : logging ? 'Saving…' : 'Log Activity'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
