import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function getWeekStart(): string {
  const d = new Date()
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff))
  return monday.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const weekStart = getWeekStart()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    // Users who want recap notifications
    const { data: users } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('weekly_recap_notification', true)

    if (!users?.length) return NextResponse.json({ processed: 0 })

    let generated = 0
    let notified = 0

    for (const { user_id } of users) {
      try {
        const [{ data: workouts }, { data: foodLogs }] = await Promise.all([
          supabase.from('workout_sessions').select('id').eq('user_id', user_id)
            .not('completed_at', 'is', null).gte('started_at', weekAgo),
          supabase.from('food_logs').select('logged_at').eq('user_id', user_id)
            .gte('logged_at', weekAgo),
        ])

        const uniqueFoodDays = new Set((foodLogs ?? []).map((l) => l.logged_at as string)).size
        const hasEnoughData = (workouts?.length ?? 0) >= 2 || uniqueFoodDays >= 3

        if (!hasEnoughData) continue

        // Check if recap already exists for this week
        const { data: existing } = await supabase
          .from('weekly_recaps')
          .select('id')
          .eq('user_id', user_id)
          .eq('week_start', weekStart)
          .maybeSingle()

        if (!existing) {
          // Generate recap
          const genRes = await fetch(`${appUrl}/api/progress/recap/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({ week_start: weekStart, user_id }),
          })
          if (genRes.ok) generated++
        }

        // Send notification
        await fetch(`${appUrl}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({
            user_id,
            title: 'Your week in review is ready 📊',
            body: 'Your AI coach has analyzed this week\'s performance. Tap to see your recap.',
            url: '/progress',
            tag: 'weekly-recap',
          }),
        })
        notified++
      } catch (userErr) {
        console.error(`Weekly recap error for ${user_id}:`, userErr)
      }
    }

    return NextResponse.json({ processed: users.length, generated, notified })
  } catch (err) {
    console.error('cron/weekly-recap error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
