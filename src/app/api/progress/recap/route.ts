import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const week = searchParams.get('week')
    const page = parseInt(searchParams.get('page') ?? '0')
    const limit = 10

    if (week) {
      const { data, error } = await supabase
        .from('weekly_recaps')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', week)
        .single()

      if (error) return NextResponse.json(null)
      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('weekly_recaps')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .range(page * limit, page * limit + limit - 1)

    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('recap GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
