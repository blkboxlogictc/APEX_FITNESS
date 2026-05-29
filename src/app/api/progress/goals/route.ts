import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('goals GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      goal_type: string
      title: string
      description?: string
      target_value?: number
      target_unit?: string
      target_date?: string
      current_value?: number
      start_value?: number
      exercise_id?: string
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, experience_level, fitness_goal')
      .eq('id', user.id)
      .single()

    // Generate AI coach note + milestones
    let coachNote = null
    let milestones: Record<string, unknown>[] = []
    try {
      const prompt = `User goal: ${body.goal_type} — "${body.title}"
${body.target_value ? `Target: ${body.target_value} ${body.target_unit ?? ''}` : ''}
${body.current_value ? `Current: ${body.current_value}` : ''}
${body.target_date ? `Target date: ${body.target_date}` : ''}
${body.description ? `Notes: ${body.description}` : ''}
Athlete level: ${profile?.experience_level ?? 'intermediate'}
Fitness goal: ${profile?.fitness_goal ?? 'general fitness'}

Return JSON:
{
  "coach_note": "2-3 sentence motivating and practical note from the coach about this goal",
  "milestones": [
    {"label": "milestone name", "target": number_or_null, "week": week_number_from_now}
  ]
}`
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 400,
        messages: [
          { role: 'system', content: 'You are APEX, a personal trainer helping a client set a goal. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
      })
      const raw = res.choices[0]?.message?.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() ?? '{}'
      const parsed = JSON.parse(raw) as { coach_note: string; milestones: Record<string, unknown>[] }
      coachNote = parsed.coach_note
      milestones = parsed.milestones ?? []
    } catch { /* non-critical */ }

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        goal_type: body.goal_type,
        title: body.title,
        description: body.description ?? null,
        target_value: body.target_value ?? null,
        target_unit: body.target_unit ?? null,
        target_date: body.target_date ?? null,
        current_value: body.current_value ?? null,
        start_value: body.start_value ?? body.current_value ?? null,
        exercise_id: body.exercise_id ?? null,
        coach_note: coachNote,
        milestones,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to save goal' }, { status: 500 })

    return NextResponse.json(data)
  } catch (err) {
    console.error('goals POST error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
