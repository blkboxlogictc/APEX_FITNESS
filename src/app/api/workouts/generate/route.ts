import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import type { Database } from '@/lib/supabase/types'
import { getExercisesForUserEquipment, getFocusExercises, getExercisesByIds } from '@/lib/exercises'
import type { GeneratedWorkout } from '@/types/workouts'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EXPERIENCE_GUIDANCE: Record<string, string> = {
  beginner:     '2-3 sets, 10-15 reps, 90-120s rest, RPE 6-7. Prioritize form over load.',
  intermediate: '3-4 sets, 8-12 reps, 60-90s rest, RPE 7-8. Progressive overload.',
  advanced:     '4-5 sets, 4-8 reps, 45-75s rest, RPE 8-9. High intensity techniques OK.',
  expert:       '4-6 sets, 3-6 reps, 45-60s rest, RPE 9. Periodized intensity.',
}

function mainWorkCount(duration: number): string {
  if (duration <= 30) return '4-5'
  if (duration <= 45) return '5-6'
  if (duration <= 60) return '6-7'
  if (duration <= 75) return '7-8'
  return '8-9'
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json() as {
    focus: string
    equipment: string[]
    experience: string
    injuries: string
    duration_minutes: number
    exercises_to_avoid: string[]
    preferred_exercises: string[]
  }

  // Get exercises available for user's equipment, filtered to focus
  const equipmentExercises = await getExercisesForUserEquipment(body.equipment)
  const focusExercises = getFocusExercises(equipmentExercises, body.focus)

  const avoidSet = new Set(body.exercises_to_avoid)
  const filtered = focusExercises.filter(e => !avoidSet.has(e.id))

  const exerciseLines = filtered
    .map(e => `${e.id} | ${e.name} | ${e.primaryMuscles.join(', ')} | ${e.equipment ?? 'body only'}`)
    .join('\n')

  const expGuidance = EXPERIENCE_GUIDANCE[body.experience] ?? EXPERIENCE_GUIDANCE.intermediate

  const prompt = `You are APEX's workout generator. Select exercises ONLY from the provided list using exact IDs.

User Context:
- Focus: ${body.focus}
- Experience: ${body.experience}
- Target duration: ${body.duration_minutes} minutes
- Injuries/Limitations: ${body.injuries || 'none'}
- Equipment available: ${body.equipment.join(', ') || 'bodyweight'}

Volume guidance for ${body.experience}: ${expGuidance}
Main exercises to select: ${mainWorkCount(body.duration_minutes)}

Available exercises (ID | Name | Primary Muscles | Equipment):
${exerciseLines}

Rules:
1. ONLY use IDs exactly as shown above — no modifications
2. Warm-up: 3-5 dynamic movements (5-8 min)
3. Main work: ${mainWorkCount(body.duration_minutes)} exercises matching the focus
4. Cooldown: 3-4 static stretches (5-8 min), use stretching category exercises
5. Account for injuries — avoid exercises stressing those areas
6. Supersets are encouraged for time efficiency (use superset_with field)

Return ONLY valid JSON:
{
  "session_name": "...",
  "estimated_duration": ${body.duration_minutes},
  "warmup": [
    { "exercise_id": "...", "exercise_name": "...", "duration_or_reps": "...", "notes": "..." }
  ],
  "main_work": [
    {
      "exercise_id": "...",
      "sets": 3,
      "rep_range": "8-12",
      "rest_seconds": 90,
      "rpe_target": 7,
      "superset_with": null,
      "coaching_notes": "...",
      "modification_if_pain": "..."
    }
  ],
  "cooldown": [
    { "exercise_id": "...", "exercise_name": "...", "duration": "30 seconds", "notes": "..." }
  ],
  "session_notes": "..."
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2000,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  const workout = JSON.parse(raw) as GeneratedWorkout

  // Fetch full exercise data for all selected IDs
  const allIds = [
    ...workout.warmup.map(e => e.exercise_id),
    ...workout.main_work.map(e => e.exercise_id),
    ...workout.cooldown.map(e => e.exercise_id),
  ]
  const fullExercises = await getExercisesByIds(allIds)
  const exMap = new Map(fullExercises.map(e => [e.id, e]))

  // Enrich warmup/cooldown with proper names from DB
  workout.warmup = workout.warmup.map(e => ({
    ...e,
    exercise_name: exMap.get(e.exercise_id)?.name ?? e.exercise_name,
  }))
  workout.cooldown = workout.cooldown.map(e => ({
    ...e,
    exercise_name: exMap.get(e.exercise_id)?.name ?? e.exercise_name,
  }))

  return new Response(
    JSON.stringify({ workout, exercises: Object.fromEntries(exMap) }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
