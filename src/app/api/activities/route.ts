import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import {
  ACTIVITIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_EMOJIS,
  getActivityById,
  calculateCaloriesBurned,
  type ActivityCategory,
} from '@/lib/activities'

export const runtime = 'edge'

// GET — return all activities grouped by category (with optional ?search= or ?category= filter)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase().trim() ?? ''
  const categoryFilter = searchParams.get('category') as ActivityCategory | null

  let filtered = ACTIVITIES
  if (search) {
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(search) ||
        CATEGORY_LABELS[a.category].toLowerCase().includes(search)
    )
  }
  if (categoryFilter) {
    filtered = filtered.filter((a) => a.category === categoryFilter)
  }

  // Group by category
  const grouped: Record<
    string,
    { id: string; label: string; color: string; emoji: string; activities: typeof ACTIVITIES }
  > = {}

  for (const activity of filtered) {
    if (!grouped[activity.category]) {
      grouped[activity.category] = {
        id: activity.category,
        label: CATEGORY_LABELS[activity.category],
        color: CATEGORY_COLORS[activity.category],
        emoji: CATEGORY_EMOJIS[activity.category],
        activities: [],
      }
    }
    grouped[activity.category].activities.push(activity)
  }

  return Response.json({ categories: Object.values(grouped), total: filtered.length })
}

// POST — log an activity
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    activity_id: string
    duration_minutes: number
    notes?: string
    logged_at?: string
  }

  const { activity_id, duration_minutes, notes, logged_at } = body

  if (!activity_id || !duration_minutes || duration_minutes < 1) {
    return Response.json({ error: 'activity_id and duration_minutes are required' }, { status: 400 })
  }

  // Get user weight for calorie calc
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('weight_kg')
    .eq('id', user.id)
    .single()

  const weightKg = (profile?.weight_kg as number | null) ?? 75

  // Look up activity in local library
  let activity = getActivityById(activity_id)
  let calories = 0
  let metValue = 0

  if (activity) {
    metValue = activity.met
    calories = calculateCaloriesBurned(metValue, weightKg, duration_minutes)
  } else if (process.env.API_NINJAS_KEY) {
    // Fallback: try API Ninjas for unknown activities
    try {
      const res = await fetch(
        `https://api.api-ninjas.com/v1/caloriesburned?activity=${encodeURIComponent(activity_id)}&weight=${Math.round(weightKg * 2.205)}&duration=${duration_minutes}`,
        { headers: { 'X-Api-Key': process.env.API_NINJAS_KEY } }
      )
      if (res.ok) {
        const data = (await res.json()) as { name: string; calories_per_hour: number; total_calories: number }[]
        if (data[0]) {
          calories = Math.round(data[0].total_calories)
          metValue = calories / (weightKg * (duration_minutes / 60))
          activity = {
            id: activity_id,
            name: data[0].name,
            category: 'daily_life',
            met: metValue,
          }
        }
      }
    } catch {
      // ignore API Ninjas failure
    }
  }

  if (!activity) {
    return Response.json({ error: 'Activity not found' }, { status: 404 })
  }

  const { data: log, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: user.id,
      activity_id: activity.id,
      activity_name: activity.name,
      category: activity.category,
      duration_minutes,
      calories_burned: calories,
      met_value: metValue,
      notes: notes ?? null,
      logged_at: logged_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ log })
}
