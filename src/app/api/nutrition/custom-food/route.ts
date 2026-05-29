import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'edge'

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('custom_foods')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ foods: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    name: string
    brand?: string
    serving_size: string
    serving_quantity?: number
    serving_unit?: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g?: number
    sugar_g?: number
    sodium_mg?: number
    is_supplement?: boolean
    supplement_category?: string
    barcode?: string
  }

  if (!body.name || body.calories == null) {
    return Response.json({ error: 'name and calories are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('custom_foods')
    .insert({
      user_id: user.id,
      name: body.name,
      brand: body.brand ?? null,
      serving_size: body.serving_size ?? '1 serving',
      serving_quantity: body.serving_quantity ?? null,
      serving_unit: body.serving_unit ?? 'g',
      calories: body.calories,
      protein_g: body.protein_g ?? 0,
      carbs_g: body.carbs_g ?? 0,
      fat_g: body.fat_g ?? 0,
      fiber_g: body.fiber_g ?? null,
      sugar_g: body.sugar_g ?? null,
      sodium_mg: body.sodium_mg ?? null,
      is_supplement: body.is_supplement ?? false,
      supplement_category: body.supplement_category ?? null,
      barcode: body.barcode ?? null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ food: data })
}
