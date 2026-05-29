import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'edge'

function getWeekStart(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getMonthStart(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekStart = getWeekStart().toISOString()
  const monthStart = getMonthStart().toISOString()

  const [weekRes, monthRes, allRes, goalRes] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('duration_minutes, calories_burned')
      .eq('user_id', user.id)
      .gte('logged_at', weekStart),
    supabase
      .from('activity_logs')
      .select('duration_minutes, calories_burned')
      .eq('user_id', user.id)
      .gte('logged_at', monthStart),
    supabase
      .from('activity_logs')
      .select('duration_minutes, calories_burned')
      .eq('user_id', user.id),
    supabase
      .from('activity_goals')
      .select('weekly_active_minutes, weekly_sessions')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const aggregate = (rows: { duration_minutes: number; calories_burned: number }[]) => ({
    active_minutes: rows.reduce((s, r) => s + r.duration_minutes, 0),
    calories_burned: rows.reduce((s, r) => s + r.calories_burned, 0),
    sessions: rows.length,
  })

  // Build daily minutes for last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const { data: recentLogs } = await supabase
    .from('activity_logs')
    .select('logged_at, duration_minutes')
    .eq('user_id', user.id)
    .gte('logged_at', sevenDaysAgo.toISOString())

  const dailyMap = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    dailyMap.set(d.toISOString().split('T')[0], 0)
  }

  for (const log of recentLogs ?? []) {
    const key = log.logged_at.split('T')[0]
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + log.duration_minutes)
    }
  }

  const daily_minutes = Array.from(dailyMap.entries()).map(([date, minutes]) => ({ date, minutes }))

  return Response.json({
    this_week: aggregate((weekRes.data ?? []) as { duration_minutes: number; calories_burned: number }[]),
    this_month: aggregate((monthRes.data ?? []) as { duration_minutes: number; calories_burned: number }[]),
    all_time: aggregate((allRes.data ?? []) as { duration_minutes: number; calories_burned: number }[]),
    daily_minutes,
    weekly_goal: {
      active_minutes: goalRes.data?.weekly_active_minutes ?? 150,
      sessions: goalRes.data?.weekly_sessions ?? 5,
    },
  })
}
