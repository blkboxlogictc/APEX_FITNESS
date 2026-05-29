import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { calculateEpley1RM, calculateApexScore, calculateComplianceScore } from '@/lib/analytics/calculations'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const RECAP_SYSTEM = `You are APEX, generating a weekly performance recap. Write like a knowledgeable personal trainer reviewing their client's week — specific, data-driven, encouraging but honest. Reference actual numbers. Acknowledge struggles without dwelling on them. Celebrate wins specifically. Give 2-3 clear action items for next week.

Return ONLY valid JSON, no markdown:
{
  "headline": "one punchy sentence summarizing the week (max 80 chars)",
  "narrative": "3-4 paragraph conversational recap using actual data — write as a letter from coach to athlete",
  "highlights": ["specific win 1 with data", "specific win 2 with data", "specific win 3 with data"],
  "by_the_numbers": {
    "workouts_completed": number,
    "total_volume_kg": number,
    "avg_daily_protein": number,
    "active_minutes": number,
    "nutrition_compliance": number,
    "prehab_sessions": number
  },
  "what_worked": ["specific thing 1 with data", "specific thing 2 with data"],
  "focus_next_week": ["specific actionable item 1", "specific actionable item 2", "specific actionable item 3"],
  "coach_note": "2-3 sentences with the most insightful observation from the data — the thing the user might not see themselves",
  "apex_score": number (0-100),
  "score_breakdown": {
    "consistency": number,
    "nutrition": number,
    "activity": number,
    "progression": number,
    "recovery": number
  }
}`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { week_start } = await req.json() as { week_start: string }

    const weekStartDate = new Date(week_start)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const weekEnd = weekEndDate.toISOString().split('T')[0]
    const weekStartStr = weekStartDate.toISOString().split('T')[0]

    // Gather all data for the week in parallel
    const [
      { data: profile },
      { data: workouts },
      { data: foodLogs },
      { data: activityLogs },
      { data: prehabLogs },
      { data: activeScreenings },
      { data: goals },
      { data: previousRecap },
      { data: nutritionPlan },
      { data: exHistory },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('workout_sessions').select('session_name, duration_minutes, total_volume_kg, started_at')
        .eq('user_id', user.id).not('completed_at', 'is', null)
        .gte('started_at', weekStartStr).lte('started_at', weekEnd),
      supabase.from('food_logs').select('calories, protein_g, carbs_g, fat_g, logged_at')
        .eq('user_id', user.id).gte('logged_at', weekStartStr).lte('logged_at', weekEnd),
      supabase.from('activity_logs').select('activity_name, duration_minutes, calories_burned, logged_at')
        .eq('user_id', user.id).gte('logged_at', weekStartStr + 'T00:00:00').lte('logged_at', weekEnd + 'T23:59:59'),
      supabase.from('prehab_logs').select('completed_at, pain_level_before, pain_level_after')
        .eq('user_id', user.id).gte('completed_at', weekStartStr).lte('completed_at', weekEnd),
      supabase.from('pain_screenings').select('joint, pain_level, created_at')
        .eq('user_id', user.id).is('resolved_at', null).limit(5),
      supabase.from('goals').select('title, goal_type, target_value, current_value, target_date, is_achieved')
        .eq('user_id', user.id).eq('is_active', true).limit(5),
      supabase.from('weekly_recaps').select('headline, apex_score, highlights')
        .eq('user_id', user.id).lt('week_start', weekStartStr)
        .order('week_start', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('nutrition_plans').select('daily_calories, protein_g')
        .eq('user_id', user.id).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('exercise_history').select('exercise_name, best_weight_kg, best_reps, personal_record_set_at')
        .eq('user_id', user.id).gt('best_weight_kg', 0)
        .gte('personal_record_set_at', weekStartStr)
        .order('best_weight_kg', { ascending: false }).limit(5),
    ])

    // Compute week stats
    const totalVolume = (workouts ?? []).reduce((s, w) => s + ((w.total_volume_kg as number) ?? 0), 0)
    const totalDuration = (workouts ?? []).reduce((s, w) => s + ((w.duration_minutes as number) ?? 0), 0)

    const byDate: Record<string, { cal: number; p: number }> = {}
    for (const log of foodLogs ?? []) {
      const d = log.logged_at as string
      if (!byDate[d]) byDate[d] = { cal: 0, p: 0 }
      byDate[d].cal += log.calories as number
      byDate[d].p += log.protein_g as number
    }
    const daysLogged = Object.keys(byDate).length
    const avgCal = daysLogged > 0 ? Math.round(Object.values(byDate).reduce((s, d) => s + d.cal, 0) / daysLogged) : 0
    const avgProtein = daysLogged > 0 ? Math.round(Object.values(byDate).reduce((s, d) => s + d.p, 0) / daysLogged) : 0

    const caloriesTarget = (nutritionPlan?.daily_calories as number) ?? 2000
    const proteinTarget = (nutritionPlan?.protein_g as number) ?? 150
    const nutritionCompliance = daysLogged > 0
      ? Math.round(Object.values(byDate).reduce((s, d) =>
          s + calculateComplianceScore(caloriesTarget, d.cal, 0.1), 0) / daysLogged)
      : 0

    const totalActivityMin = (activityLogs ?? []).reduce((s, l) => s + (l.duration_minutes as number), 0)
    const prehabCount = prehabLogs?.length ?? 0

    const newPRs = (exHistory ?? []).map((h) => ({
      exercise: h.exercise_name,
      weight_kg: h.best_weight_kg,
      weight_lbs: parseFloat(((h.best_weight_kg as number) * 2.205).toFixed(1)),
      estimated_1rm: calculateEpley1RM(h.best_weight_kg as number, h.best_reps as number),
    }))

    // Calculate APEX score for the week
    const workoutsThisWeek = workouts?.length ?? 0
    const consistencyScore = Math.min(100, workoutsThisWeek * 25 + (workoutsThisWeek >= 3 ? 25 : 0))
    const activityScore = Math.min(100, Math.round((totalActivityMin / 150) * 100))
    const progressionScore = Math.min(100, newPRs.length * 25 + 40)
    const recoveryScore = 75
    const components = {
      consistency: consistencyScore,
      nutrition: Math.min(100, nutritionCompliance),
      activity: activityScore,
      progression: progressionScore,
      recovery: recoveryScore,
    }
    const weekApexScore = calculateApexScore(components)

    const weekData = {
      workouts_completed: workoutsThisWeek,
      total_volume_kg: Math.round(totalVolume),
      total_duration_minutes: totalDuration,
      avg_daily_calories: avgCal,
      avg_daily_protein: avgProtein,
      calories_target: caloriesTarget,
      protein_target: proteinTarget,
      days_food_logged: daysLogged,
      nutrition_compliance_pct: nutritionCompliance,
      active_minutes: totalActivityMin,
      prehab_sessions: prehabCount,
      new_prs: newPRs,
      active_pain_issues: activeScreenings?.length ?? 0,
    }

    const userPrompt = `User: ${(profile?.full_name as string)?.split(' ')?.[0] ?? 'Athlete'}
Profile: ${profile?.experience_level ?? 'intermediate'} level, goal: ${profile?.fitness_goal ?? 'general fitness'}
Current goals: ${(goals ?? []).map((g) => g.title).join(', ') || 'none set'}

THIS WEEK'S DATA (${weekStartStr} to ${weekEnd}):
${JSON.stringify(weekData, null, 2)}

Workout sessions: ${(workouts ?? []).map((w) => w.session_name).join(', ') || 'none'}

PREVIOUS WEEK (for comparison):
${previousRecap ? `Score: ${previousRecap.apex_score} — "${previousRecap.headline}"` : 'No previous recap'}

Write the weekly recap.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: RECAP_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let recap: Record<string, unknown>
    try {
      recap = JSON.parse(cleaned)
    } catch {
      recap = {
        headline: `Week of ${weekStartStr}`,
        narrative: 'Great work this week. Keep building momentum.',
        highlights: [],
        by_the_numbers: weekData,
        what_worked: [],
        focus_next_week: [],
        coach_note: 'Stay consistent.',
        apex_score: weekApexScore,
        score_breakdown: components,
      }
    }

    // Save to weekly_recaps
    const { data: saved, error } = await supabase
      .from('weekly_recaps')
      .upsert({
        user_id: user.id,
        week_start: weekStartStr,
        week_end: weekEnd,
        recap_data: weekData,
        ai_narrative: recap.narrative as string,
        headline: recap.headline as string,
        highlights: (recap.highlights as string[]) ?? [],
        focus_areas: (recap.focus_next_week as string[]) ?? [],
        apex_score: (recap.apex_score as number) ?? weekApexScore,
      }, { onConflict: 'user_id,week_start' })
      .select()
      .single()

    if (error) console.error('recap save error:', error)

    return NextResponse.json({ ...recap, id: saved?.id, week_start: weekStartStr, week_end: weekEnd })
  } catch (err) {
    console.error('recap/generate error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
