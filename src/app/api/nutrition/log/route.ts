import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'
import { getFoodById, scaleNutrition } from '@/lib/nutrition'
import { getLocalDate, type MealType, type FoodLogEntry, type NutritionFacts, EMPTY_NUTRITION, addNutrition } from '@/types/nutrition'

export const runtime = 'edge'

// GET ?date=YYYY-MM-DD
export async function GET(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? getLocalDate()

  const [logsRes, profileRes, planRes, waterRes] = await Promise.all([
    supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_at', date)
      .order('created_at', { ascending: true }),
    supabase.from('user_profiles').select('weight_kg').eq('id', user.id).single(),
    supabase
      .from('nutrition_plans')
      .select('daily_calories, protein_g, carbs_g, fat_g')
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
  ])

  const logs = (logsRes.data ?? []) as FoodLogEntry[]
  const plan = planRes.data

  // Group by meal type
  const logsByMeal: Partial<Record<MealType, FoodLogEntry[]>> = {}
  for (const log of logs) {
    const mt = log.meal_type as MealType
    if (!logsByMeal[mt]) logsByMeal[mt] = []
    logsByMeal[mt]!.push(log)
  }

  // Calculate daily totals
  let dailyTotals: NutritionFacts = { ...EMPTY_NUTRITION }
  for (const log of logs) {
    dailyTotals = addNutrition(dailyTotals, {
      calories: log.calories,
      protein_g: log.protein_g,
      carbs_g: log.carbs_g,
      fat_g: log.fat_g,
      fiber_g: log.fiber_g,
      sugar_g: log.sugar_g,
      sodium_mg: log.sodium_mg,
      saturated_fat_g: log.saturated_fat_g,
      cholesterol_mg: 0,
    })
  }

  const targets = {
    calories: plan?.daily_calories ?? 2000,
    protein_g: plan?.protein_g ?? 150,
    carbs_g: plan?.carbs_g ?? 250,
    fat_g: plan?.fat_g ?? 65,
  }

  const remaining: NutritionFacts = {
    calories: Math.max(0, targets.calories - dailyTotals.calories),
    protein_g: Math.max(0, targets.protein_g - dailyTotals.protein_g),
    carbs_g: Math.max(0, targets.carbs_g - dailyTotals.carbs_g),
    fat_g: Math.max(0, targets.fat_g - dailyTotals.fat_g),
    fiber_g: Math.max(0, 25 - dailyTotals.fiber_g),
    sugar_g: dailyTotals.sugar_g,
    sodium_mg: Math.max(0, 2300 - dailyTotals.sodium_mg),
    saturated_fat_g: dailyTotals.saturated_fat_g,
    cholesterol_mg: 0,
  }

  const waterMl = ((waterRes.data ?? []) as { amount_ml: number }[]).reduce(
    (sum, w) => sum + w.amount_ml,
    0
  )

  return Response.json({
    date,
    logs_by_meal: logsByMeal,
    daily_totals: dailyTotals,
    targets,
    remaining,
    water_ml: waterMl,
    water_goal_ml: 2500,
  })
}

// POST — log a food
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    food_id: string
    meal_type: MealType
    servings: number
    logged_at?: string
    notes?: string
    // Allow passing food details directly (for custom/manual entry)
    food_name?: string
    brand?: string
    serving_size_label?: string
    calories?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    fiber_g?: number
    sugar_g?: number
    sodium_mg?: number
    saturated_fat_g?: number
    is_supplement?: boolean
    supplement_category?: string
    image_url?: string
  }

  const { food_id, meal_type, servings, logged_at, notes } = body

  if (!food_id || !meal_type || !servings) {
    return Response.json({ error: 'food_id, meal_type, and servings required' }, { status: 400 })
  }

  let foodName = body.food_name ?? ''
  let brand = body.brand ?? null
  let servingLabel = body.serving_size_label ?? '1 serving'
  let nutrition: NutritionFacts = {
    calories: body.calories ?? 0,
    protein_g: body.protein_g ?? 0,
    carbs_g: body.carbs_g ?? 0,
    fat_g: body.fat_g ?? 0,
    fiber_g: body.fiber_g ?? 0,
    sugar_g: body.sugar_g ?? 0,
    sodium_mg: body.sodium_mg ?? 0,
    saturated_fat_g: body.saturated_fat_g ?? 0,
    cholesterol_mg: 0,
  }
  let isSupp = body.is_supplement ?? false
  let imageUrl = body.image_url ?? null

  // If not provided inline, fetch food details
  if (!foodName) {
    if (food_id.startsWith('custom_')) {
      const { data: cf } = await supabase
        .from('custom_foods')
        .select('*')
        .eq('id', food_id.replace('custom_', ''))
        .eq('user_id', user.id)
        .single()
      if (cf) {
        foodName = cf.name as string
        brand = (cf.brand as string | null)
        servingLabel = cf.serving_size as string
        const cfData = cf as unknown as Record<string, number | null>
        nutrition = scaleNutrition({
          calories: (cfData.calories as number) ?? 0,
          protein_g: (cfData.protein_g as number) ?? 0,
          carbs_g: (cfData.carbs_g as number) ?? 0,
          fat_g: (cfData.fat_g as number) ?? 0,
          fiber_g: (cfData.fiber_g as number) ?? 0,
          sugar_g: (cfData.sugar_g as number) ?? 0,
          sodium_mg: (cfData.sodium_mg as number) ?? 0,
          saturated_fat_g: 0,
          cholesterol_mg: 0,
        }, servings)
        isSupp = (cf.is_supplement as boolean) ?? false
      }
    } else {
      const food = await getFoodById(food_id)
      if (!food) return Response.json({ error: 'Food not found' }, { status: 404 })
      foodName = food.name
      brand = food.brand ?? null
      servingLabel = food.servingSize
      nutrition = scaleNutrition(food.nutrition, servings)
      isSupp = food.isSupplementProduct ?? false
      imageUrl = food.imageUrl ?? null
    }
  } else {
    // Inline nutrition provided — scale by servings
    nutrition = scaleNutrition(nutrition, servings)
  }

  const { data: log, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      food_id,
      food_name: foodName,
      brand,
      meal_type,
      servings,
      serving_size_label: servingLabel,
      calories: nutrition.calories,
      protein_g: nutrition.protein_g,
      carbs_g: nutrition.carbs_g,
      fat_g: nutrition.fat_g,
      fiber_g: nutrition.fiber_g,
      sugar_g: nutrition.sugar_g,
      sodium_mg: nutrition.sodium_mg,
      saturated_fat_g: nutrition.saturated_fat_g,
      is_supplement: isSupp,
      supplement_category: body.supplement_category ?? null,
      notes: notes ?? null,
      image_url: imageUrl,
      logged_at: logged_at ?? getLocalDate(),
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ log })
}
