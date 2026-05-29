import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function timeMatches(target: string, toleranceMinutes = 5): boolean {
  const now = new Date()
  const [h, m] = target.split(':').map(Number)
  const targetMinutes = h * 60 + m
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  return Math.abs(nowMinutes - targetMinutes) <= toleranceMinutes
}

async function sendNotification(userId: string, payload: Record<string, unknown>, appUrl: string) {
  await fetch(`${appUrl}/api/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ user_id: userId, ...payload }),
  })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const todayDate = new Intl.DateTimeFormat('en-CA').format(new Date())
    const nowDayOfWeek = new Date().getUTCDay() // 0=Sunday

    // Get all users with active push subscriptions and their preferences
    const { data: users } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .eq('is_active', true)

    if (!users?.length) return NextResponse.json({ processed: 0 })

    const userIds = [...new Set(users.map((u) => u.user_id))]
    let notificationsSent = 0

    for (const userId of userIds) {
      try {
        const [{ data: prefs }, { data: profile }] = await Promise.all([
          supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('user_profiles').select('full_name, fitness_goal').eq('id', userId).single(),
        ])

        if (!prefs) continue

        const firstName = (profile?.full_name as string)?.split(' ')?.[0] ?? 'there'

        // ─── Workout reminder ─────────────────────────────────────────────────
        if (prefs.workout_reminders && timeMatches(prefs.workout_reminder_time as string)) {
          const days = (prefs.workout_reminder_days as number[]) ?? []
          if (days.includes(nowDayOfWeek)) {
            // Check if already worked out today
            const { data: todayWorkout } = await supabase
              .from('workout_sessions')
              .select('id')
              .eq('user_id', userId)
              .gte('started_at', todayDate)
              .not('completed_at', 'is', null)
              .limit(1)
              .maybeSingle()

            if (!todayWorkout) {
              // Get today's workout from plan
              const { data: plan } = await supabase
                .from('fitness_plans')
                .select('weekly_structure')
                .eq('user_id', userId)
                .eq('is_active', true)
                .maybeSingle()

              const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
              const todayPlan = (plan?.weekly_structure as { day: string; focus: string }[])?.find((d) => d.day === dayName)
              const focusText = todayPlan?.focus ?? 'your workout'

              await sendNotification(userId, {
                title: `Time to train, ${firstName} 🏋️`,
                body: `${focusText} is on the schedule today. Let's get it done.`,
                url: '/train',
                tag: 'workout-reminder',
                actions: [{ action: 'start', title: 'Start Workout' }],
              }, appUrl)
              notificationsSent++
            }
          }
        }

        // ─── Meal reminders ───────────────────────────────────────────────────
        if (prefs.nutrition_reminders) {
          const mealTimes = (prefs.meal_reminder_times as string[]) ?? []
          const mealNames = ['Breakfast', 'Lunch', 'Dinner']

          for (let i = 0; i < mealTimes.length; i++) {
            if (timeMatches(mealTimes[i])) {
              const mealType = mealNames[i] ?? 'Meal'
              const { data: todayLogs } = await supabase
                .from('food_logs')
                .select('meal_type')
                .eq('user_id', userId)
                .eq('logged_at', todayDate)

              const hasLoggedMeal = (todayLogs ?? []).some(
                (l) => (l.meal_type as string).toLowerCase() === mealType.toLowerCase()
              )

              if (!hasLoggedMeal) {
                await sendNotification(userId, {
                  title: `Log your ${mealType.toLowerCase()} 🍽️`,
                  body: `Don't forget to track your ${mealType.toLowerCase()} to stay on target.`,
                  url: '/nutrition',
                  tag: `meal-${mealType.toLowerCase()}`,
                }, appUrl)
                notificationsSent++
              }
            }
          }
        }

        // ─── Prehab reminder (afternoon: 14:00–15:00 UTC) ────────────────────
        const nowHour = new Date().getUTCHours()
        if (prefs.prehab_reminders && nowHour >= 14 && nowHour < 15) {
          const { data: activePrograms } = await supabase
            .from('prehab_programs')
            .select('id, program_name, estimated_duration_minutes')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          if (activePrograms) {
            const { data: todayPrehab } = await supabase
              .from('prehab_logs')
              .select('id')
              .eq('user_id', userId)
              .gte('completed_at', todayDate)
              .limit(1)
              .maybeSingle()

            if (!todayPrehab) {
              await sendNotification(userId, {
                title: `Prehab time 🔧`,
                body: `${activePrograms.program_name} · ${activePrograms.estimated_duration_minutes ?? 10} min · Protect your joints.`,
                url: `/joint-health/prehab/${activePrograms.id}`,
                tag: 'prehab-reminder',
              }, appUrl)
              notificationsSent++
            }
          }
        }

        // ─── Supplement reminder ──────────────────────────────────────────────
        if (prefs.supplement_reminders && timeMatches(prefs.supplement_reminder_time as string)) {
          await sendNotification(userId, {
            title: `Don't forget your supplements 💊`,
            body: `Log your morning supplements to track your stack.`,
            url: '/nutrition/supplements',
            tag: 'supplement-reminder',
          }, appUrl)
          notificationsSent++
        }

        // ─── Weekly recap (Sunday 20:00) ─────────────────────────────────────
        if (prefs.weekly_recap_notification && nowDayOfWeek === 0 && nowHour === 20) {
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
          const [{ data: workouts }, { data: foodLogs }] = await Promise.all([
            supabase.from('workout_sessions').select('id').eq('user_id', userId)
              .not('completed_at', 'is', null).gte('started_at', weekAgo),
            supabase.from('food_logs').select('logged_at').eq('user_id', userId)
              .gte('logged_at', weekAgo),
          ])

          const uniqueFoodDays = new Set((foodLogs ?? []).map((l) => l.logged_at as string)).size
          if ((workouts?.length ?? 0) >= 2 || uniqueFoodDays >= 3) {
            await sendNotification(userId, {
              title: `Your week in review is ready 📊`,
              body: `See how ${firstName} performed this week — APEX has your full recap.`,
              url: '/progress',
              tag: 'weekly-recap',
            }, appUrl)
            notificationsSent++
          }
        }
      } catch (userErr) {
        console.error(`Cron error for user ${userId}:`, userErr)
      }
    }

    return NextResponse.json({ processed: userIds.length, sent: notificationsSent })
  } catch (err) {
    console.error('cron/notifications error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
