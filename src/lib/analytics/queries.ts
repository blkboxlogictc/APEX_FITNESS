import { createClient } from '@/lib/supabase/client'
import {
  calculateEpley1RM,
  calculateStreak,
  calculateComplianceScore,
  calculateApexScore,
  calculateWeightTrend,
  movingAverage,
} from './calculations'

export interface StrengthPoint {
  date: string
  best_weight_kg: number
  best_reps: number
  estimated_1rm: number
  volume: number
}

export interface VolumePoint {
  date: string
  total_volume_kg: number
  sessions_count: number
  duration_minutes: number
}

export interface MuscleGroupStat {
  muscle_group: string
  sessions_count: number
  last_trained: string | null
  volume_kg: number
}

export interface PersonalRecord {
  exercise_id: string
  exercise_name: string
  weight_kg: number
  reps: number
  estimated_1rm: number
  achieved_at: string
}

export interface WorkoutStreakResult {
  current_streak: number
  longest_streak: number
  last_workout_date: string | null
  streak_history: { date: string; has_workout: boolean }[]
}

export interface ConsistencyPoint {
  week_start: string
  planned_days: number
  completed_days: number
  completion_rate: number
}

export interface BodyWeightPoint {
  date: string
  weight_kg: number
  weight_lbs: number
  ma?: number
}

export interface WeightTrendResult {
  trend: 'gaining' | 'losing' | 'maintaining'
  rate_kg_per_week: number
  projected_goal_date: string | null
}

export interface NutritionCompliancePoint {
  date: string
  calories_target: number
  calories_consumed: number
  protein_target: number
  protein_consumed: number
  compliance_score: number
}

export interface MacroAverages {
  avg_calories: number
  avg_protein_g: number
  avg_carbs_g: number
  avg_fat_g: number
  avg_fiber_g: number
  days_logged: number
}

export interface ActivitySummaryResult {
  total_minutes: number
  total_calories: number
  total_sessions: number
  by_category: { category: string; minutes: number; calories: number }[]
  favorite_activity: string | null
  most_calories_session: number
}

export interface WeeklyActiveMinutesPoint {
  week_start: string
  minutes: number
  goal_minutes: number
  met_goal: boolean
}

export interface ApexHealthScore {
  overall: number
  components: {
    consistency: number
    nutrition: number
    recovery: number
    activity: number
    progression: number
  }
  trend: 'improving' | 'stable' | 'declining'
  insights: string[]
}

// ─── STRENGTH ────────────────────────────────────────────────────────────────

export async function getStrengthProgress(
  userId: string,
  exerciseId: string,
  weeks = 52,
): Promise<StrengthPoint[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rawData } = await supabase
    .from('workout_sets')
    .select('weight_kg, actual_reps, logged_at, workout_sessions!inner(started_at, completed_at)')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .eq('completed', true)
    .gte('logged_at', since)
    .order('logged_at', { ascending: true })

  const data = rawData as { weight_kg: number | null; actual_reps: number | null; logged_at: string }[] | null

  if (!data || data.length === 0) return []

  // Group by date, get best weight per session
  const byDate: Record<string, { maxWeight: number; maxReps: number; volume: number }> = {}
  for (const set of data) {
    const date = set.logged_at.split('T')[0]
    const w = set.weight_kg ?? 0
    const r = set.actual_reps ?? 0
    if (!byDate[date]) byDate[date] = { maxWeight: 0, maxReps: 0, volume: 0 }
    if (w > byDate[date].maxWeight || (w === byDate[date].maxWeight && r > byDate[date].maxReps)) {
      byDate[date].maxWeight = w
      byDate[date].maxReps = r
    }
    byDate[date].volume += w * r
  }

  return Object.entries(byDate).map(([date, d]) => ({
    date,
    best_weight_kg: d.maxWeight,
    best_reps: d.maxReps,
    estimated_1rm: calculateEpley1RM(d.maxWeight, d.maxReps),
    volume: d.volume,
  }))
}

export async function getWorkoutVolume(
  userId: string,
  period: 'week' | 'month' | 'year' = 'month',
): Promise<VolumePoint[]> {
  const supabase = createClient()
  const weeks = period === 'week' ? 12 : period === 'month' ? 26 : 52
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('workout_sessions')
    .select('started_at, completed_at, total_volume_kg, duration_minutes')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('started_at', since)
    .order('started_at', { ascending: true })

  if (!data) return []

  // Group by week
  const byWeek: Record<string, { volume: number; sessions: number; duration: number }> = {}
  for (const s of data) {
    const d = new Date(s.started_at)
    const dayOfWeek = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
    const weekKey = monday.toISOString().split('T')[0]
    if (!byWeek[weekKey]) byWeek[weekKey] = { volume: 0, sessions: 0, duration: 0 }
    byWeek[weekKey].volume += s.total_volume_kg ?? 0
    byWeek[weekKey].sessions++
    byWeek[weekKey].duration += s.duration_minutes ?? 0
  }

  return Object.entries(byWeek).map(([date, d]) => ({
    date,
    total_volume_kg: parseFloat(d.volume.toFixed(1)),
    sessions_count: d.sessions,
    duration_minutes: d.duration,
  }))
}

export async function getPersonalRecords(
  userId: string,
): Promise<PersonalRecord[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('exercise_history')
    .select('exercise_id, exercise_name, best_weight_kg, best_reps, personal_record_set_at, last_logged_at')
    .eq('user_id', userId)
    .gt('best_weight_kg', 0)
    .order('best_weight_kg', { ascending: false })
    .limit(50)

  if (!data) return []

  return data.map((h) => ({
    exercise_id: h.exercise_id,
    exercise_name: h.exercise_name,
    weight_kg: h.best_weight_kg,
    reps: h.best_reps,
    estimated_1rm: calculateEpley1RM(h.best_weight_kg, h.best_reps),
    achieved_at: h.personal_record_set_at ?? h.last_logged_at,
  }))
}

export async function getWorkoutStreak(
  userId: string,
): Promise<WorkoutStreakResult> {
  const supabase = createClient()
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('workout_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('started_at', sixMonthsAgo)
    .order('started_at', { ascending: false })

  const dates = (data ?? []).map((s) => s.started_at)
  const { current, longest } = calculateStreak(dates)
  const last = dates.length > 0 ? dates[0].split('T')[0] : null

  // Build streak history for last 84 days (12 weeks)
  const dateSet = new Set(dates.map((d) => d.split('T')[0]))
  const history: { date: string; has_workout: boolean }[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    history.push({ date: dateStr, has_workout: dateSet.has(dateStr) })
  }

  return {
    current_streak: current,
    longest_streak: longest,
    last_workout_date: last,
    streak_history: history,
  }
}

export async function getMuscleGroupFrequency(
  userId: string,
  weeks = 4,
): Promise<MuscleGroupStat[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('workout_sets')
    .select('exercise_name, weight_kg, actual_reps, logged_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('logged_at', since)

  if (!data) return []

  // Simple heuristic: group by exercise name keyword
  const groupMap: Record<string, { count: number; last: string; volume: number }> = {}
  for (const set of data) {
    const name = set.exercise_name.toLowerCase()
    let group = 'Other'
    if (/squat|leg press|lunge/.test(name)) group = 'Quads'
    else if (/deadlift|rdl|hamstring|leg curl/.test(name)) group = 'Hamstrings'
    else if (/bench|chest|push.?up|fly|pec/.test(name)) group = 'Chest'
    else if (/row|pulldown|pull.?up|lat|back/.test(name)) group = 'Back'
    else if (/shoulder|press|lateral|front raise|military/.test(name)) group = 'Shoulders'
    else if (/bicep|curl/.test(name)) group = 'Biceps'
    else if (/tricep|extension|pushdown|dip/.test(name)) group = 'Triceps'
    else if (/glute|hip thrust|abduct/.test(name)) group = 'Glutes'
    else if (/calf|raise/.test(name)) group = 'Calves'
    else if (/abs|crunch|plank|core/.test(name)) group = 'Core'

    if (!groupMap[group]) groupMap[group] = { count: 0, last: '', volume: 0 }
    groupMap[group].count++
    if (set.logged_at > groupMap[group].last) groupMap[group].last = set.logged_at
    groupMap[group].volume += (set.weight_kg ?? 0) * (set.actual_reps ?? 0)
  }

  return Object.entries(groupMap)
    .map(([group, d]) => ({
      muscle_group: group,
      sessions_count: d.count,
      last_trained: d.last || null,
      volume_kg: parseFloat(d.volume.toFixed(1)),
    }))
    .sort((a, b) => b.sessions_count - a.sessions_count)
}

// ─── BODY ────────────────────────────────────────────────────────────────────

export async function getBodyWeightHistory(
  userId: string,
  weeks = 12,
): Promise<BodyWeightPoint[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('body_measurements')
    .select('measured_at, weight_kg')
    .eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .gte('measured_at', since)
    .order('measured_at', { ascending: true })

  if (!data || data.length === 0) return []

  const raw = data.map((d) => ({
    date: d.measured_at,
    value: d.weight_kg as number,
  }))

  const mas = movingAverage(raw, 7)

  return raw.map((d, i) => ({
    date: d.date,
    weight_kg: d.value,
    weight_lbs: parseFloat((d.value * 2.205).toFixed(1)),
    ma: mas[i]?.ma,
  }))
}

export async function getWeightTrend(
  userId: string,
): Promise<WeightTrendResult> {
  const data = await getBodyWeightHistory(userId, 4)
  if (data.length < 2) {
    return { trend: 'maintaining', rate_kg_per_week: 0, projected_goal_date: null }
  }

  const weights = data.map((d) => ({ date: d.date, value: d.weight_kg }))
  const rate = calculateWeightTrend(weights)

  const trend =
    Math.abs(rate) < 0.1
      ? 'maintaining'
      : rate > 0
        ? 'gaining'
        : 'losing'

  return { trend, rate_kg_per_week: rate, projected_goal_date: null }
}

// ─── NUTRITION ───────────────────────────────────────────────────────────────

export async function getNutritionCompliance(
  userId: string,
  weeks = 4,
): Promise<NutritionCompliancePoint[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000)
  const sinceDate = since.toISOString().split('T')[0]

  const [logsRes, planRes] = await Promise.all([
    supabase
      .from('food_logs')
      .select('logged_at, calories, protein_g')
      .eq('user_id', userId)
      .gte('logged_at', sinceDate)
      .order('logged_at', { ascending: true }),
    supabase
      .from('nutrition_plans')
      .select('daily_calories, protein_g')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const caloriesTarget = (planRes.data?.daily_calories as number) ?? 2000
  const proteinTarget = (planRes.data?.protein_g as number) ?? 150

  const byDate: Record<string, { cal: number; protein: number }> = {}
  for (const log of logsRes.data ?? []) {
    const date = log.logged_at as string
    if (!byDate[date]) byDate[date] = { cal: 0, protein: 0 }
    byDate[date].cal += log.calories as number
    byDate[date].protein += log.protein_g as number
  }

  return Object.entries(byDate).map(([date, d]) => ({
    date,
    calories_target: caloriesTarget,
    calories_consumed: Math.round(d.cal),
    protein_target: proteinTarget,
    protein_consumed: Math.round(d.protein),
    compliance_score: Math.round(
      (calculateComplianceScore(caloriesTarget, d.cal, 0.1) +
        calculateComplianceScore(proteinTarget, d.protein, 0.1)) /
        2,
    ),
  }))
}

export async function getMacroAverages(
  userId: string,
  period: 'week' | 'month' = 'week',
): Promise<MacroAverages> {
  const supabase = createClient()
  const days = period === 'week' ? 7 : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const sinceDate = since.toISOString().split('T')[0]

  const { data } = await supabase
    .from('food_logs')
    .select('logged_at, calories, protein_g, carbs_g, fat_g, fiber_g')
    .eq('user_id', userId)
    .gte('logged_at', sinceDate)

  if (!data || data.length === 0) {
    return { avg_calories: 0, avg_protein_g: 0, avg_carbs_g: 0, avg_fat_g: 0, avg_fiber_g: 0, days_logged: 0 }
  }

  const byDate: Record<string, { cal: number; p: number; c: number; f: number; fi: number }> = {}
  for (const log of data) {
    const date = log.logged_at as string
    if (!byDate[date]) byDate[date] = { cal: 0, p: 0, c: 0, f: 0, fi: 0 }
    byDate[date].cal += log.calories as number
    byDate[date].p += log.protein_g as number
    byDate[date].c += log.carbs_g as number
    byDate[date].f += log.fat_g as number
    byDate[date].fi += (log.fiber_g as number) ?? 0
  }

  const dayVals = Object.values(byDate)
  const n = dayVals.length

  return {
    avg_calories: Math.round(dayVals.reduce((s, d) => s + d.cal, 0) / n),
    avg_protein_g: Math.round(dayVals.reduce((s, d) => s + d.p, 0) / n),
    avg_carbs_g: Math.round(dayVals.reduce((s, d) => s + d.c, 0) / n),
    avg_fat_g: Math.round(dayVals.reduce((s, d) => s + d.f, 0) / n),
    avg_fiber_g: Math.round(dayVals.reduce((s, d) => s + d.fi, 0) / n),
    days_logged: n,
  }
}

// ─── ACTIVITY ────────────────────────────────────────────────────────────────

export async function getActivitySummary(
  userId: string,
  weeks = 4,
): Promise<ActivitySummaryResult> {
  const supabase = createClient()
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('activity_logs')
    .select('activity_name, category, duration_minutes, calories_burned')
    .eq('user_id', userId)
    .gte('logged_at', since)

  if (!data || data.length === 0) {
    return { total_minutes: 0, total_calories: 0, total_sessions: 0, by_category: [], favorite_activity: null, most_calories_session: 0 }
  }

  const byCategory: Record<string, { minutes: number; calories: number }> = {}
  const byActivity: Record<string, number> = {}
  let maxCal = 0

  for (const log of data) {
    const cat = (log.category as string) || 'Other'
    if (!byCategory[cat]) byCategory[cat] = { minutes: 0, calories: 0 }
    byCategory[cat].minutes += log.duration_minutes as number
    byCategory[cat].calories += log.calories_burned as number
    byActivity[log.activity_name as string] = (byActivity[log.activity_name as string] ?? 0) + 1
    if ((log.calories_burned as number) > maxCal) maxCal = log.calories_burned as number
  }

  const favorite =
    Object.entries(byActivity).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

  return {
    total_minutes: data.reduce((s, l) => s + (l.duration_minutes as number), 0),
    total_calories: data.reduce((s, l) => s + (l.calories_burned as number), 0),
    total_sessions: data.length,
    by_category: Object.entries(byCategory).map(([category, d]) => ({
      category,
      minutes: d.minutes,
      calories: d.calories,
    })),
    favorite_activity: favorite,
    most_calories_session: maxCal,
  }
}

export async function getWeeklyActiveMinutes(
  userId: string,
  weeks = 8,
): Promise<WeeklyActiveMinutesPoint[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('activity_logs')
    .select('duration_minutes, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', since)

  const byWeek: Record<string, number> = {}
  for (const log of data ?? []) {
    const d = new Date(log.logged_at as string)
    const dayOfWeek = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
    const weekKey = monday.toISOString().split('T')[0]
    byWeek[weekKey] = (byWeek[weekKey] ?? 0) + (log.duration_minutes as number)
  }

  return Object.entries(byWeek).map(([week_start, minutes]) => ({
    week_start,
    minutes,
    goal_minutes: 150,
    met_goal: minutes >= 150,
  }))
}

// ─── APEX HEALTH SCORE ───────────────────────────────────────────────────────

export async function getApexHealthScore(
  userId: string,
): Promise<ApexHealthScore> {
  const [streak, compliance, activity, prs] = await Promise.all([
    getWorkoutStreak(userId),
    getNutritionCompliance(userId, 1),
    getWeeklyActiveMinutes(userId, 2),
    getPersonalRecords(userId),
  ])

  // Consistency: streak + recent workout frequency
  const recentDays = streak.streak_history.slice(-14)
  const workoutDays = recentDays.filter((d) => d.has_workout).length
  const consistencyScore = Math.min(100, Math.round((workoutDays / 14) * 100 * 1.5 + streak.current_streak * 2))

  // Nutrition: avg compliance last 7 days
  const recentCompliance = compliance.slice(-7)
  const nutritionScore =
    recentCompliance.length > 0
      ? Math.round(recentCompliance.reduce((s, d) => s + d.compliance_score, 0) / recentCompliance.length)
      : 40

  // Activity: minutes vs goal (150/week)
  const lastWeek = activity.slice(-1)[0]
  const activityScore = lastWeek
    ? Math.min(100, Math.round((lastWeek.minutes / 150) * 100))
    : 0

  // Progression: PRs in last 30 days
  const recentPRCount = prs.filter((p) => {
    const d = new Date(p.achieved_at)
    return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000
  }).length
  const progressionScore = Math.min(100, recentPRCount * 20 + 40)

  // Recovery: placeholder (no pain issues = 80, issues = reduced)
  const recoveryScore = 75

  const components = {
    consistency: Math.min(100, consistencyScore),
    nutrition: Math.min(100, nutritionScore),
    activity: Math.min(100, activityScore),
    progression: Math.min(100, progressionScore),
    recovery: recoveryScore,
  }

  const overall = calculateApexScore(components)

  const insights: string[] = []
  if (components.consistency < 50) insights.push('Increasing workout frequency will significantly boost your score')
  if (components.nutrition < 60) insights.push('Hitting your protein target consistently is your biggest opportunity')
  if (components.activity < 50) insights.push('Add 20 min of activity 3 days/week to meet the WHO guideline')
  if (components.progression < 60) insights.push('Focus on progressive overload — small weight increases each week')

  return {
    overall,
    components,
    trend: 'stable',
    insights,
  }
}
