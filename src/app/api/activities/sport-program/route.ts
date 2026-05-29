import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import type { Database } from '@/lib/supabase/types'
import { getSportTrainingContext } from '@/lib/activities'
import type { SportProgramDay } from '@/types/activities'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    sport: string
    focus?: string
    sessions_per_week: number
    duration_weeks: number
  }

  const { sport, focus, sessions_per_week, duration_weeks } = body

  if (!sport || !sessions_per_week || !duration_weeks) {
    return Response.json({ error: 'sport, sessions_per_week, and duration_weeks are required' }, { status: 400 })
  }

  // Get user profile for context
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('age, sex, experience_level, fitness_goal, injuries_limitations, weight_kg, height_cm')
    .eq('id', user.id)
    .single()

  const sportContext = getSportTrainingContext(sport)

  const profileSummary = profile
    ? `Age: ${profile.age ?? '?'}, Sex: ${profile.sex ?? '?'}, Experience: ${profile.experience_level ?? '?'}, Goal: ${profile.fitness_goal ?? '?'}${profile.injuries_limitations ? `, Injuries/Limitations: ${profile.injuries_limitations}` : ''}`
    : 'Profile not available.'

  const contextSummary = sportContext
    ? `Focus areas: ${sportContext.focusAreas.join(', ')}. Periodization: ${sportContext.periodizationNote}. Key metrics: ${sportContext.keyMetrics.join(', ')}.`
    : ''

  const systemPrompt = `You are APEX, an expert sports performance coach. Generate a ${duration_weeks}-week sport-specific training program in JSON format.

User profile: ${profileSummary}
Sport: ${sport}${focus ? `\nSpecific focus: ${focus}` : ''}
${contextSummary}

Return ONLY valid JSON matching this schema:
{
  "program_name": "string",
  "coaching_notes": "string (2-3 sentences about the program philosophy and goals)",
  "weekly_structure": [
    {
      "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
      "focus": "string (brief focus description, e.g. 'Strength & Power' or 'Active Recovery')",
      "activities": [
        {
          "name": "string (activity name)",
          "duration_minutes": number,
          "intensity": "low" | "moderate" | "high",
          "notes": "string (optional coaching cue)"
        }
      ]
    }
  ]
}

Include exactly ${sessions_per_week} training days (rest days have empty activities array). Make it specific and progressive.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    })

    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}') as {
      program_name: string
      coaching_notes: string
      weekly_structure: SportProgramDay[]
    }

    // Deactivate existing programs for this sport
    await supabase
      .from('sport_programs')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('sport', sport.toLowerCase())

    // Save new program
    const { data: program, error } = await supabase
      .from('sport_programs')
      .insert({
        user_id: user.id,
        sport: sport.toLowerCase(),
        program_name: parsed.program_name,
        weekly_sessions: sessions_per_week,
        duration_weeks,
        weekly_structure: parsed.weekly_structure as unknown as Record<string, unknown>[],
        coaching_notes: parsed.coaching_notes,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ program })
  } catch (err) {
    console.error('Sport program generation error:', err)
    return Response.json({ error: 'Failed to generate sport program' }, { status: 500 })
  }
}

// DELETE — delete a sport program by ?id=
export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('sport_programs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

// GET — fetch user's active sport programs
export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: programs, error } = await supabase
    .from('sport_programs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ programs: programs ?? [] })
}
