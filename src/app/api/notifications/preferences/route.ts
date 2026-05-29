import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })

    // Return defaults if none exist
    if (!data) {
      return NextResponse.json({
        workout_reminders: true,
        workout_reminder_time: '07:00',
        workout_reminder_days: [1, 2, 3, 4, 5],
        nutrition_reminders: true,
        meal_reminder_times: ['08:00', '12:30', '18:30'],
        prehab_reminders: true,
        weekly_recap_notification: true,
        coach_proactive_messages: true,
        supplement_reminders: false,
        supplement_reminder_time: '08:00',
        water_reminders: false,
        water_reminder_interval_hours: 2,
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('preferences GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as Record<string, unknown>

    const allowed = [
      'workout_reminders', 'workout_reminder_time', 'workout_reminder_days',
      'nutrition_reminders', 'meal_reminder_times',
      'prehab_reminders', 'weekly_recap_notification', 'coach_proactive_messages',
      'supplement_reminders', 'supplement_reminder_time',
      'water_reminders', 'water_reminder_interval_hours',
    ]

    const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(update as any, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

    return NextResponse.json(data)
  } catch (err) {
    console.error('preferences POST error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
