import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import type { Database } from '@/lib/supabase/types'
import type { CompletionSummary } from '@/types/workouts'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json() as {
    session_id: string
    duration_minutes: number
    exercise_summary: {
      exercise_id: string
      exercise_name: string
      sets_completed: number
      best_weight_kg: number
      best_reps: number
      is_warmup: boolean
    }[]
  }

  // Fetch all completed sets for this session
  const { data: sets } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('session_id', body.session_id)
    .eq('user_id', user.id)
    .eq('completed', true)

  const completedSets = sets ?? []

  // Calculate total volume (kg)
  const totalVolumeKg = completedSets.reduce((sum, s) => {
    const w = s.weight_kg ?? (s.weight_lbs ? s.weight_lbs * 0.453592 : 0)
    const r = s.actual_reps ?? 0
    return sum + w * r
  }, 0)

  // Detect PRs by comparing against exercise_history
  const exerciseIds = [...new Set(completedSets.filter(s => !s.is_warmup).map(s => s.exercise_id))]
  const { data: historyRows } = await supabase
    .from('exercise_history')
    .select('*')
    .eq('user_id', user.id)
    .in('exercise_id', exerciseIds)

  const historyMap = new Map((historyRows ?? []).map(h => [h.exercise_id, h]))

  const prs: CompletionSummary['prs_broken'] = []

  // Upsert exercise_history for each exercise
  for (const exId of exerciseIds) {
    const exSets = completedSets.filter(s => s.exercise_id === exId && !s.is_warmup)
    if (exSets.length === 0) continue

    const exName = exSets[0].exercise_name
    const bestWeightKg = Math.max(...exSets.map(s => s.weight_kg ?? (s.weight_lbs ? s.weight_lbs * 0.453592 : 0)))
    const bestReps = Math.max(...exSets.map(s => s.actual_reps ?? 0))
    const existing = historyMap.get(exId)
    const isPR = !existing || bestWeightKg > (existing.best_weight_kg ?? 0)

    if (isPR && bestWeightKg > 0) {
      prs.push({ exercise_name: exName, weight_kg: bestWeightKg, reps: bestReps })
    }

    await supabase.from('exercise_history').upsert(
      {
        user_id: user.id,
        exercise_id: exId,
        exercise_name: exName,
        best_weight_kg: isPR ? bestWeightKg : (existing?.best_weight_kg ?? bestWeightKg),
        best_reps: isPR ? bestReps : Math.max(existing?.best_reps ?? 0, bestReps),
        total_sets_logged: (existing?.total_sets_logged ?? 0) + exSets.length,
        last_logged_at: new Date().toISOString(),
        personal_record_set_at: isPR ? new Date().toISOString() : (existing?.personal_record_set_at ?? null),
      },
      { onConflict: 'user_id,exercise_id' }
    )
  }

  // Build GPT context for feedback
  const exerciseLines = body.exercise_summary
    .filter(e => !e.is_warmup)
    .map(e => `${e.exercise_name}: ${e.sets_completed} sets, best ${e.best_weight_kg > 0 ? `${(e.best_weight_kg * 2.205).toFixed(1)} lbs × ${e.best_reps} reps` : `${e.best_reps} reps`}`)
    .join('\n')

  const prLines = prs.length > 0
    ? `PRs broken: ${prs.map(p => `${p.exercise_name} (${(p.weight_kg * 2.205).toFixed(1)} lbs)`).join(', ')}`
    : 'No PRs today.'

  let aiFeedback = 'Great work completing this session!'

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are APEX, an expert personal trainer. Give a 2-3 sentence post-workout summary. Mention what they did well, one specific thing to focus on next time. Be warm, specific, and motivating. No bullet points.',
        },
        {
          role: 'user',
          content: `Session: ${body.duration_minutes} minutes\n${exerciseLines}\n${prLines}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 150,
    })
    aiFeedback = completion.choices[0]?.message?.content ?? aiFeedback
  } catch {
    // Non-fatal — continue with default message
  }

  // Complete the session
  await supabase
    .from('workout_sessions')
    .update({
      completed_at: new Date().toISOString(),
      duration_minutes: body.duration_minutes,
      total_volume_kg: Math.round(totalVolumeKg * 10) / 10,
      ai_feedback: aiFeedback,
    })
    .eq('id', body.session_id)
    .eq('user_id', user.id)

  const summary: CompletionSummary = {
    sessionId: body.session_id,
    duration_minutes: body.duration_minutes,
    total_volume_kg: Math.round(totalVolumeKg * 10) / 10,
    total_volume_lbs: Math.round(totalVolumeKg * 2.205 * 10) / 10,
    exercises_count: exerciseIds.length,
    sets_count: completedSets.length,
    prs_broken: prs,
    ai_feedback: aiFeedback,
  }

  return new Response(JSON.stringify({ summary }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
