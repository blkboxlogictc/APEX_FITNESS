import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: activeScreenings },
      { data: resolvedScreenings },
      { data: activePrograms },
      { data: recentLogs },
    ] = await Promise.all([
      supabase
        .from('pain_screenings')
        .select('id, joint, side, pain_level, ai_assessment, red_flags_detected, referral_recommended, recommended_program_id, created_at')
        .eq('user_id', user.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('pain_screenings')
        .select('id, joint, side, pain_level, created_at, resolved_at')
        .eq('user_id', user.id)
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(5),
      supabase
        .from('prehab_programs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('prehab_logs')
        .select('completed_at, program_id, pain_level_before, pain_level_after')
        .eq('user_id', user.id)
        .gte('completed_at', sevenDaysAgo)
        .order('completed_at', { ascending: false }),
    ])

    // Prehab streak calculation
    let streak = 0
    if (recentLogs && recentLogs.length > 0) {
      const logDates = [...new Set(recentLogs.map(l => l.completed_at.split('T')[0]))].sort().reverse()
      const checkDate = new Date()
      for (const logDate of logDates) {
        const ld = new Date(logDate)
        const diff = Math.round((checkDate.getTime() - ld.getTime()) / (1000 * 60 * 60 * 24))
        if (diff <= streak + 1) streak++
        else break
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }

    // Sessions this week per program
    const sessionsByProgram: Record<string, number> = {}
    recentLogs?.forEach(l => {
      sessionsByProgram[l.program_id] = (sessionsByProgram[l.program_id] ?? 0) + 1
    })

    // Find next prehab (program with fewest sessions this week vs frequency)
    const nextPrehab = activePrograms?.find(p => {
      const done = sessionsByProgram[p.id] ?? 0
      const freqPerWeek = p.frequency_per_week ?? 3
      return done < freqPerWeek
    }) ?? null

    // Check if prehab done today
    const prehabDoneToday = recentLogs?.some(l => l.completed_at.startsWith(today)) ?? false

    return NextResponse.json({
      active_issues: activeScreenings ?? [],
      resolved_issues: resolvedScreenings ?? [],
      active_programs: activePrograms ?? [],
      prehab_streak: streak,
      sessions_this_week: recentLogs?.length ?? 0,
      next_prehab_program: nextPrehab,
      prehab_done_today: prehabDoneToday,
    })
  } catch (err) {
    console.error('joint-health/status error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
