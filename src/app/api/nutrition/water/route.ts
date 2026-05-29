import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { getLocalDate } from '@/types/nutrition'

export const runtime = 'edge'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? getLocalDate()

  const { data, error } = await supabase
    .from('water_logs')
    .select('id, amount_ml, logged_at')
    .eq('user_id', user.id)
    .gte('logged_at', `${date}T00:00:00`)
    .lte('logged_at', `${date}T23:59:59`)
    .order('logged_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const logs = data ?? []
  const total_ml = logs.reduce((sum, w) => sum + w.amount_ml, 0)

  return Response.json({ logs, total_ml, goal_ml: 2500 })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount_ml } = (await request.json()) as { amount_ml: number }
  if (!amount_ml || amount_ml < 1) {
    return Response.json({ error: 'amount_ml required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id: user.id, amount_ml })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ log: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = (await request.json()) as { id: string }
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('water_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
