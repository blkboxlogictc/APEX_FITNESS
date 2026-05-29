import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'
import { searchFoods, usdaToFoodResult, offToFoodResult } from '@/lib/nutrition'
import type { FoodResult, FoodLogEntry } from '@/types/nutrition'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''

  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let recentFoods: FoodResult[] = []
  let frequentFoods: FoodResult[] = []

  if (user) {
    // Fetch recent (last 20 unique foods)
    const { data: recentLogs } = await supabase
      .from('food_logs')
      .select('food_id, food_name, brand, servings, serving_size_label, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, saturated_fat_g')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60)

    if (recentLogs) {
      const seen = new Set<string>()
      for (const log of recentLogs as FoodLogEntry[]) {
        if (seen.has(log.food_id) || seen.size >= 20) continue
        seen.add(log.food_id)
        recentFoods.push({
          id: log.food_id,
          source: 'recent',
          name: log.food_name,
          brand: log.brand ?? undefined,
          servingSize: log.serving_size_label,
          servingQuantity: 1,
          servingUnit: 'serving',
          nutrition: {
            calories: Math.round(log.calories / log.servings),
            protein_g: Math.round((log.protein_g / log.servings) * 10) / 10,
            carbs_g: Math.round((log.carbs_g / log.servings) * 10) / 10,
            fat_g: Math.round((log.fat_g / log.servings) * 10) / 10,
            fiber_g: Math.round((log.fiber_g / log.servings) * 10) / 10,
            sugar_g: Math.round((log.sugar_g / log.servings) * 10) / 10,
            sodium_mg: Math.round(log.sodium_mg / log.servings),
            saturated_fat_g: Math.round((log.saturated_fat_g / log.servings) * 10) / 10,
            cholesterol_mg: 0,
          },
        })
      }

      // Frequent: count occurrences
      const freq = new Map<string, { count: number; food: FoodResult }>()
      for (const log of recentLogs as FoodLogEntry[]) {
        const existing = freq.get(log.food_id)
        if (existing) {
          existing.count++
        } else {
          freq.set(log.food_id, {
            count: 1,
            food: {
              id: log.food_id,
              source: 'frequent',
              name: log.food_name,
              brand: log.brand ?? undefined,
              servingSize: log.serving_size_label,
              servingQuantity: 1,
              servingUnit: 'serving',
              nutrition: {
                calories: Math.round(log.calories / log.servings),
                protein_g: Math.round((log.protein_g / log.servings) * 10) / 10,
                carbs_g: Math.round((log.carbs_g / log.servings) * 10) / 10,
                fat_g: Math.round((log.fat_g / log.servings) * 10) / 10,
                fiber_g: 0,
                sugar_g: 0,
                sodium_mg: 0,
                saturated_fat_g: 0,
                cholesterol_mg: 0,
              },
            },
          })
        }
      }
      frequentFoods = Array.from(freq.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
        .map((e) => e.food)
    }
  }

  if (!query.trim()) {
    return Response.json({ results: recentFoods, recent: recentFoods, frequent: frequentFoods })
  }

  const results = await searchFoods(query, recentFoods, frequentFoods)
  return Response.json({ results, recent: recentFoods, frequent: frequentFoods })
}
