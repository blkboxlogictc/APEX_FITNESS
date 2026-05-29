import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { HORSCHIG_PRINCIPLES } from '@/lib/jointHealth/knowledgeBase'
import type { JointRegion } from '@/lib/jointHealth/knowledgeBase'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface GenerateRequest {
  pain_screening_id?: string
  target_joints: JointRegion[]
  program_type: 'injury_rehab' | 'prehab' | 'mobility' | 'performance'
  available_equipment: string[]
  time_available_minutes: number
  assessment?: Record<string, unknown>
  program_name?: string
}

const PROGRAM_SYSTEM = `You are APEX's joint health specialist. Generate a complete prehab/rehab exercise program based on the provided data.

${HORSCHIG_PRINCIPLES}

RULES:
- Every exercise must be a real, named movement (no generic descriptions)
- Include full coaching cues, not just names
- Order exercises: mobility/activation first, then stability, then strength
- All exercises must be doable at home with minimal equipment unless equipment is specified
- Include clear progressions and regressions for every exercise
- video_search_term should be what someone would search on YouTube to find a demo

Return ONLY valid JSON array of exercises, no markdown:
[
  {
    "name": "Ankle Dorsiflexion Wall Stretch",
    "category": "mobility",
    "joint_target": ["ankle"],
    "sets": 2,
    "reps_or_duration": "60 seconds each side",
    "frequency": "daily",
    "instructions": [
      "Stand facing a wall, foot 3-4 inches away",
      "Drive knee toward wall keeping heel flat",
      "Hold at end range, feel stretch in calf and ankle"
    ],
    "coaching_cues": [
      "Keep heel glued to floor — if it rises, move foot closer",
      "Drive knee slightly outward to hit lateral ankle"
    ],
    "progression": "Move foot further from wall (5-6 inches)",
    "regression": "Seated ankle circles, then progress to standing",
    "video_search_term": "ankle dorsiflexion wall stretch knee to wall"
  }
]`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as GenerateRequest

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('available_equipment, fitness_goal, experience_level')
      .eq('id', user.id)
      .single()

    const equipment = body.available_equipment.length > 0
      ? body.available_equipment
      : profile?.available_equipment ?? ['bodyweight', 'resistance bands']

    const assessmentContext = body.assessment
      ? `\nAI ASSESSMENT FINDINGS:\n${JSON.stringify(body.assessment, null, 2)}`
      : ''

    const userPrompt = `Generate a ${body.program_type} program for:
Target joints: ${body.target_joints.join(', ')}
Available equipment: ${equipment.join(', ')}
Time available: ${body.time_available_minutes} minutes
Athlete level: ${profile?.experience_level ?? 'intermediate'}
${assessmentContext}

Generate ${Math.max(4, Math.min(8, Math.floor(body.time_available_minutes / 2)))} exercises appropriate for this program type and joints.
${body.program_type === 'injury_rehab' ? 'Focus on gentle loading, isometrics first, then eccentrics. Nothing that aggravates the reported pain.' : ''}
${body.program_type === 'prehab' ? 'Focus on preventive mobility and stability work.' : ''}
${body.program_type === 'mobility' ? 'Focus on joint mobility and tissue flexibility.' : ''}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      messages: [
        { role: 'system', content: PROGRAM_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '[]'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let exercises: Record<string, unknown>[]
    try {
      const parsed = JSON.parse(cleaned)
      exercises = Array.isArray(parsed) ? parsed as Record<string, unknown>[] : []
    } catch {
      exercises = []
    }

    const totalDuration = exercises.length * 2.5
    const programName = body.program_name ?? `${body.target_joints.map(j => j.replace('_', ' ')).join(' & ')} ${
      body.program_type === 'injury_rehab' ? 'Rehab Protocol' : body.program_type === 'mobility' ? 'Mobility Program' : 'Prehab Protocol'
    }`

    const rationale = body.assessment
      ? `Based on your screening: ${(body.assessment.root_cause_analysis as string ?? '').slice(0, 200)}`
      : `Preventive program targeting ${body.target_joints.join(', ')} health and resilience.`

    const { data: program, error } = await supabase
      .from('prehab_programs')
      .insert({
        user_id: user.id,
        program_name: programName,
        target_joints: body.target_joints,
        program_type: body.program_type,
        exercises,
        frequency_per_week: body.program_type === 'injury_rehab' ? 5 : 3,
        estimated_duration_minutes: Math.round(totalDuration),
        ai_rationale: rationale,
        pain_screening_id: body.pain_screening_id ?? null,
        weeks_prescribed: body.program_type === 'injury_rehab' ? 8 : 6,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to save program' }, { status: 500 })

    return NextResponse.json(program)
  } catch (err) {
    console.error('joint-health/program/generate error:', err)
    return NextResponse.json({ error: 'Program generation failed' }, { status: 500 })
  }
}
