import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateEpley1RM, calculateStreak } from '@/lib/analytics/calculations'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [
      { data: workoutSessions },
      { data: exHistory },
      { data: foodLogs7 },
      { data: activityLogs7 },
      { data: activityGoal },
      { data: bodyMeasurements },
      { data: activeGoals },
      { data: latestRecap },
    ] = await Promise.all([
      supabase.from('workout_sessions').select('started_at, completed_at, total_volume_kg')
        .eq('user_id', user.id).not('completed_at', 'is', null)
        .order('started_at', { ascending: false }).limit(200),
      supabase.from('exercise_history').select('exercise_id, exercise_name, best_weight_kg, best_reps, personal_record_set_at, last_logged_at')
        .eq('user_id', user.id).gt('best_weight_kg', 0)
        .order('best_weight_kg', { ascending: false }).limit(20),
      supabase.from('food_logs').select('logged_at, calories, protein_g')
        .eq('user_id', user.id).gte('logged_at', sevenDaysAgo.split('T')[0]),
      supabase.from('activity_logs').select('duration_minutes, calories_burned, logged_at')
        .eq('user_id', user.id).gte('logged_at', sevenDaysAgo),
      supabase.from('activity_goals').select('weekly_active_minutes').eq('user_id', user.id).maybeSingle(),
      supabase.from('body_measurements').select('measured_at, weight_kg')
        .eq('user_id', user.id).not('weight_kg', 'is', null)
        .order('measured_at', { ascending: false }).limit(30),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase.from('weekly_recaps').select('*').eq('user_id', user.id)
        .order('week_start', { ascending: false }).limit(1).maybeSingle(),
    ])

    // Workout streak & counts
    const allDates = (workoutSessions ?? []).map((s) => s.started_at)
    const { current, longest } = calculateStreak(allDates)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    weekStart.setHours(0, 0, 0, 0)
    const thisWeekSessions = (workoutSessions ?? []).filter(
      (s) => new Date(s.started_at) >= weekStart,
    ).length
    const thisMonthSessions = (workoutSessions ?? []).filter(
      (s) => new Date(s.started_at) >= new Date(thisMonthStart),
    ).length

    // Body weight
    const latestWeight = bodyMeasurements?.[0]
    let weightChange4Weeks: number | null = null
    if (bodyMeasurements && bodyMeasurements.length >= 2) {
      const oldEnough = bodyMeasurements.find(
        (m) => new Date(m.measured_at) <= new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      )
      if (oldEnough && latestWeight) {
        weightChange4Weeks = parseFloat(
          ((latestWeight.weight_kg as number) - (oldEnough.weight_kg as number)).toFixed(2),
        )
      }
    }

    // PRs
    const prsThisMonth = (exHistory ?? []).filter(
      (h) =>
        h.personal_record_set_at &&
        new Date(h.personal_record_set_at) >= new Date(thirtyDaysAgo),
    ).length

    const topLifts = (exHistory ?? []).slice(0, 5).map((h) => ({
      exercise: h.exercise_name,
      weight_kg: h.best_weight_kg,
      weight_lbs: parseFloat((h.best_weight_kg * 2.205).toFixed(1)),
      estimated_1rm: calculateEpley1RM(h.best_weight_kg, h.best_reps),
      date: h.personal_record_set_at ?? h.last_logged_at,
    }))

    // Nutrition
    const byDate: Record<string, { cal: number; protein: number }> = {}
    for (const log of foodLogs7 ?? []) {
      const d = log.logged_at as string
      if (!byDate[d]) byDate[d] = { cal: 0, protein: 0 }
      byDate[d].cal += log.calories as number
      byDate[d].protein += log.protein_g as number
    }
    const daysLogged = Object.keys(byDate).length
    const avgCal = daysLogged > 0 ? Math.round(Object.values(byDate).reduce((s, d) => s + d.cal, 0) / daysLogged) : 0
    const avgProtein = daysLogged > 0 ? Math.round(Object.values(byDate).reduce((s, d) => s + d.protein, 0) / daysLogged) : 0

    // Fetch plan for compliance
    const { data: nutritionPlan } = await supabase
      .from('nutrition_plans').select('daily_calories')
      .eq('user_id', user.id).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const calTarget = (nutritionPlan?.daily_calories as number) ?? 2000
    const avgCompliance7 = daysLogged > 0
      ? Math.round(
          Object.values(byDate).reduce((s, d) => {
            const ratio = d.cal / calTarget
            const diff = Math.abs(1 - ratio)
            return s + (diff <= 0.1 ? 100 : diff >= 0.5 ? 0 : Math.round(100 * (1 - (diff - 0.1) / 0.4)))
          }, 0) / daysLogged,
        )
      : 0

    // Activity
    const totalActivityMinutes = (activityLogs7 ?? []).reduce((s, l) => s + (l.duration_minutes as number), 0)
    const totalActivityCal = (activityLogs7 ?? []).reduce((s, l) => s + (l.calories_burned as number), 0)
    const goalMinutes = (activityGoal?.weekly_active_minutes as number) ?? 150

    return NextResponse.json({
      body: {
        current_weight_kg: latestWeight?.weight_kg ?? null,
        current_weight_lbs: latestWeight ? parseFloat(((latestWeight.weight_kg as number) * 2.205).toFixed(1)) : null,
        weight_change_4_weeks: weightChange4Weeks,
        last_measurement_date: latestWeight?.measured_at ?? null,
      },
      strength: {
        total_prs_all_time: exHistory?.length ?? 0,
        prs_this_month: prsThisMonth,
        top_lifts: topLifts,
      },
      workouts: {
        this_week: thisWeekSessions,
        this_month: thisMonthSessions,
        streak: current,
        longest_streak: longest,
        total_all_time: workoutSessions?.length ?? 0,
      },
      nutrition: {
        avg_compliance_7_days: avgCompliance7,
        avg_calories_7_days: avgCal,
        avg_protein_7_days: avgProtein,
        days_logged_this_week: daysLogged,
      },
      activity: {
        minutes_this_week: totalActivityMinutes,
        calories_this_week: totalActivityCal,
        goal_minutes: goalMinutes,
        goal_met: totalActivityMinutes >= goalMinutes,
      },
      active_goals: activeGoals ?? [],
      latest_recap: latestRecap ?? null,
    })
  } catch (err) {
    console.error('progress/overview error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
