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
    .from('supplement_stack')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('added_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ supplements: data ?? [] })
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
    supplement_type: string
    serving_size: string
    calories_per_serving?: number
    protein_g_per_serving?: number
    key_ingredients?: { name: string; amount: string; unit: string; notes?: string }[]
    timing_recommendation?: string
    daily_timing?: string[]
    ai_notes?: string
    food_log_id?: string
    image_url?: string
  }

  if (!body.name || !body.supplement_type) {
    return Response.json({ error: 'name and supplement_type required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('supplement_stack')
    .insert({
      user_id: user.id,
      name: body.name,
      brand: body.brand ?? null,
      supplement_type: body.supplement_type,
      serving_size: body.serving_size ?? '1 serving',
      calories_per_serving: body.calories_per_serving ?? 0,
      protein_g_per_serving: body.protein_g_per_serving ?? 0,
      key_ingredients: (body.key_ingredients ?? []) as unknown as Record<string, unknown>[],
      timing_recommendation: body.timing_recommendation ?? '',
      daily_timing: body.daily_timing ?? [],
      ai_notes: body.ai_notes ?? '',
      food_log_id: body.food_log_id ?? null,
      image_url: body.image_url ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ supplement: data })
}
