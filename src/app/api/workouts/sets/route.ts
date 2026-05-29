import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    session_id: string
    exercise_id: string
    exercise_name: string
    set_number: number
    target_reps?: number | null
    actual_reps?: number | null
    weight_kg?: number | null
    weight_lbs?: number | null
    rpe?: number | null
    is_warmup?: boolean
    completed?: boolean
    notes?: string | null
  }

  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      ...body,
      user_id: user.id,
      is_warmup: body.is_warmup ?? false,
      completed: body.completed ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ set: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, ...updates } = await request.json() as { id: string; [key: string]: unknown }

  const { data, error } = await supabase
    .from('workout_sets')
    .update(updates as any)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ set: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json() as { id: string }

  const { error } = await supabase
    .from('workout_sets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
