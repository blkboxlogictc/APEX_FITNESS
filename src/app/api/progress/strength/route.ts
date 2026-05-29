import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateEpley1RM } from '@/lib/analytics/calculations'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const exerciseId = searchParams.get('exercise_id')
    const weeks = parseInt(searchParams.get('weeks') ?? '52')

    if (exerciseId) {
      // Return strength progress for specific exercise
      const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: sets } = await supabase
        .from('workout_sets')
        .select('weight_kg, actual_reps, logged_at')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .eq('is_warmup', false)
        .eq('completed', true)
        .gte('logged_at', since)
        .order('logged_at', { ascending: true })

      if (!sets || sets.length === 0) {
        return NextResponse.json([])
      }

      const byDate: Record<string, { maxWeight: number; maxReps: number; volume: number; bestORM: number }> = {}
      for (const set of sets) {
        const date = (set.logged_at as string).split('T')[0]
        const w = (set.weight_kg as number) ?? 0
        const r = (set.actual_reps as number) ?? 0
        const orm = calculateEpley1RM(w, r)
        if (!byDate[date]) byDate[date] = { maxWeight: 0, maxReps: 0, volume: 0, bestORM: 0 }
        if (orm > byDate[date].bestORM) {
          byDate[date].bestORM = orm
          byDate[date].maxWeight = w
          byDate[date].maxReps = r
        }
        byDate[date].volume += w * r
      }

      return NextResponse.json(
        Object.entries(byDate).map(([date, d]) => ({
          date,
          best_weight_kg: d.maxWeight,
          best_weight_lbs: parseFloat((d.maxWeight * 2.205).toFixed(1)),
          best_reps: d.maxReps,
          estimated_1rm: d.bestORM,
          estimated_1rm_lbs: parseFloat((d.bestORM * 2.205).toFixed(1)),
          volume: parseFloat(d.volume.toFixed(1)),
        })),
      )
    }

    // Return all tracked exercises with current bests
    const { data: history } = await supabase
      .from('exercise_history')
      .select('*')
      .eq('user_id', user.id)
      .gt('best_weight_kg', 0)
      .order('last_logged_at', { ascending: false })

    return NextResponse.json(
      (history ?? []).map((h) => ({
        exercise_id: h.exercise_id,
        exercise_name: h.exercise_name,
        best_weight_kg: h.best_weight_kg,
        best_weight_lbs: parseFloat(((h.best_weight_kg as number) * 2.205).toFixed(1)),
        best_reps: h.best_reps,
        estimated_1rm: calculateEpley1RM(h.best_weight_kg as number, h.best_reps as number),
        total_sets_logged: h.total_sets_logged,
        last_logged_at: h.last_logged_at,
        pr_date: h.personal_record_set_at,
      })),
    )
  } catch (err) {
    console.error('progress/strength error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
