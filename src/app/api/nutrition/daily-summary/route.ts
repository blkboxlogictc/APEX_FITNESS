import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'
import { getLocalDate } from '@/types/nutrition'

export const runtime = 'edge'

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? getLocalDate()

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  const [logsRes, planRes, waterRes, weekLogsRes, suppRes] = await Promise.all([
    supabase
      .from('food_logs')
      .select('calories, protein_g, carbs_g, fat_g, meal_type')
      .eq('user_id', user.id)
      .eq('logged_at', date),
    supabase
      .from('nutrition_plans')
      .select('daily_calories, protein_g')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', user.id)
      .gte('logged_at', `${date}T00:00:00`)
      .lte('logged_at', `${date}T23:59:59`),
    supabase
      .from('food_logs')
      .select('calories, protein_g, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', weekAgoStr)
      .lt('logged_at', date),
    supabase
      .from('supplement_stack')
      .select('name')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ])

  const logs = (logsRes.data ?? []) as { calories: number; protein_g: number; carbs_g: number; fat_g: number; meal_type: string }[]
  const plan = planRes.data
  const waterMl = ((waterRes.data ?? []) as { amount_ml: number }[]).reduce(
    (s, w) => s + w.amount_ml,
    0
  )

  const caloriesConsumed = logs.reduce((s, l) => s + l.calories, 0)
  const proteinG = logs.reduce((s, l) => s + l.protein_g, 0)
  const carbsG = logs.reduce((s, l) => s + l.carbs_g, 0)
  const fatG = logs.reduce((s, l) => s + l.fat_g, 0)

  const caloriesTarget = plan?.daily_calories ?? 2000
  const proteinTarget = plan?.protein_g ?? 150

  const mealsLogged = [...new Set(logs.map((l) => l.meal_type))]

  // Weekly averages
  const weekLogs = weekLogsRes.data ?? []
  const weekDays = new Map<string, { cal: number; protein: number }>()
  for (const wl of weekLogs as { calories: number; protein_g: number; logged_at: string }[]) {
    const d = wl.logged_at
    const existing = weekDays.get(d) ?? { cal: 0, protein: 0 }
    weekDays.set(d, { cal: existing.cal + wl.calories, protein: existing.protein + wl.protein_g })
  }
  const daysArr = Array.from(weekDays.values())
  const avgCalories = daysArr.length > 0 ? Math.round(daysArr.reduce((s, d) => s + d.cal, 0) / daysArr.length) : 0
  const avgProtein = daysArr.length > 0 ? Math.round(daysArr.reduce((s, d) => s + d.protein, 0) / daysArr.length) : 0
  const adherencePct = caloriesTarget > 0
    ? Math.round((daysArr.filter((d) => Math.abs(d.cal - caloriesTarget) / caloriesTarget < 0.15).length / Math.max(daysArr.length, 1)) * 100)
    : 0

  const supplementsActive = ((suppRes.data ?? []) as { name: string }[]).map((s) => s.name)

  return Response.json({
    todays_nutrition: {
      calories_consumed: caloriesConsumed,
      calories_target: caloriesTarget,
      calories_remaining: Math.max(0, caloriesTarget - caloriesConsumed),
      protein_g: Math.round(proteinG * 10) / 10,
      protein_target_g: proteinTarget,
      carbs_g: Math.round(carbsG * 10) / 10,
      fat_g: Math.round(fatG * 10) / 10,
      water_ml: waterMl,
      meals_logged: mealsLogged,
      supplement_logged_today: [],
      supplement_stack: supplementsActive,
    },
    weekly_averages: {
      avg_calories: avgCalories,
      avg_protein_g: avgProtein,
      adherence_percent: adherencePct,
    },
  })
}
