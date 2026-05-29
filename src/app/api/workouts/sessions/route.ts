import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    session_name: string
    plan_day_reference?: string
    started_at?: string
  }

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: user.id,
      session_name: body.session_name,
      plan_day_reference: body.plan_day_reference ?? null,
      started_at: body.started_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page  = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('workout_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    sessions: data ?? [],
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  })
}
