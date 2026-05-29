import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const programId = searchParams.get('program_id')
    const limit = parseInt(searchParams.get('limit') ?? '20')

    let query = supabase
      .from('prehab_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (programId) query = query.eq('program_id', programId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Failed to load logs' }, { status: 500 })

    return NextResponse.json(data)
  } catch (err) {
    console.error('prehab-log GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      program_id: string
      duration_minutes: number
      exercises_completed: Array<{ name: string; completed: boolean; pain_level?: number }>
      pain_level_before: number
      pain_level_after: number
      notes?: string
    }

    const { data, error } = await supabase
      .from('prehab_logs')
      .insert({
        user_id: user.id,
        program_id: body.program_id,
        duration_minutes: body.duration_minutes,
        exercises_completed: body.exercises_completed,
        pain_level_before: body.pain_level_before,
        pain_level_after: body.pain_level_after,
        notes: body.notes ?? null,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to save log' }, { status: 500 })

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('prehab-log POST error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
