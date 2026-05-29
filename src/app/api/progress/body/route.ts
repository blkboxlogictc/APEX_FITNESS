import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const weeks = parseInt(searchParams.get('weeks') ?? '12')
    const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .gte('measured_at', since)
      .order('measured_at', { ascending: true })

    if (error) return NextResponse.json({ error: 'Failed to load' }, { status: 500 })

    const withLbs = (data ?? []).map((m) => ({
      ...m,
      weight_lbs: m.weight_kg ? parseFloat(((m.weight_kg as number) * 2.205).toFixed(1)) : null,
    }))

    // Compute 7-day moving average for weight
    const weightPoints = withLbs.filter((m) => m.weight_kg != null)
    const withMA = weightPoints.map((point, i) => {
      const start = Math.max(0, i - 6)
      const slice = weightPoints.slice(start, i + 1)
      const ma = slice.reduce((s, p) => s + (p.weight_kg as number), 0) / slice.length
      return { ...point, ma_kg: parseFloat(ma.toFixed(2)), ma_lbs: parseFloat((ma * 2.205).toFixed(1)) }
    })

    return NextResponse.json({ measurements: withLbs, weight_series: withMA })
  } catch (err) {
    console.error('progress/body GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      measured_at?: string
      weight_kg?: number
      body_fat_percent?: number
      muscle_mass_kg?: number
      measurements?: Record<string, number>
      notes?: string
    }

    const { data, error } = await supabase
      .from('body_measurements')
      .insert({
        user_id: user.id,
        measured_at: body.measured_at ?? new Date().toISOString().split('T')[0],
        weight_kg: body.weight_kg ?? null,
        body_fat_percent: body.body_fat_percent ?? null,
        muscle_mass_kg: body.muscle_mass_kg ?? null,
        measurements: body.measurements ?? {},
        notes: body.notes ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

    // Also update user profile weight if provided
    if (body.weight_kg) {
      await supabase
        .from('user_profiles')
        .update({ weight_kg: body.weight_kg })
        .eq('id', user.id)
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('progress/body POST error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
