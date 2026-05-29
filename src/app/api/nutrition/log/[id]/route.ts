import { createClient } from '@/lib/supabase/server'


import type { Database } from '@/lib/supabase/types'
import { scaleNutrition } from '@/lib/nutrition'
import type { MealType } from '@/types/nutrition'

export const runtime = 'edge'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { servings?: number; meal_type?: MealType; notes?: string }

  // If servings changed, recalculate nutrition from original per-serving data
  if (body.servings !== undefined) {
    const { data: existing } = await supabase
      .from('food_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) return Response.json({ error: 'Log not found' }, { status: 404 })

    const origServings = existing.servings as number
    const newServings = body.servings

    const perServing = {
      calories: (existing.calories as number) / origServings,
      protein_g: (existing.protein_g as number) / origServings,
      carbs_g: (existing.carbs_g as number) / origServings,
      fat_g: (existing.fat_g as number) / origServings,
      fiber_g: (existing.fiber_g as number) / origServings,
      sugar_g: (existing.sugar_g as number) / origServings,
      sodium_mg: (existing.sodium_mg as number) / origServings,
      saturated_fat_g: (existing.saturated_fat_g as number) / origServings,
      cholesterol_mg: 0,
    }

    const newNutrition = scaleNutrition(perServing, newServings)

    const { data: log, error } = await supabase
      .from('food_logs')
      .update({
        servings: newServings,
        meal_type: body.meal_type ?? existing.meal_type,
        notes: body.notes ?? existing.notes,
        ...newNutrition,
      } as any)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ log })
  }

  const { data: log, error } = await supabase
    .from('food_logs')
    .update({ meal_type: body.meal_type, notes: body.notes })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ log })
}
