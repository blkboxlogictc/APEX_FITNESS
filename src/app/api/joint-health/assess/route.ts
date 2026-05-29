import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { HORSCHIG_PRINCIPLES, ASSESSMENT_TYPES } from '@/lib/jointHealth/knowledgeBase'
import type { AssessmentType } from '@/lib/jointHealth/knowledgeBase'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface AssessRequest {
  assessment_type: AssessmentType
  answers: Record<string, string>
}

const ASSESS_SYSTEM = `You are APEX's movement specialist, trained in the methodologies of Dr. Aaron Horschig and FMS (Functional Movement Screen) principles.

${HORSCHIG_PRINCIPLES}

Analyze the movement assessment answers and provide a detailed report.

Respond in this exact JSON structure, no markdown:
{
  "overall_score": 0-100,
  "movement_quality": "excellent|good|moderate|poor",
  "results": [
    {
      "movement": "question about the movement fault",
      "passed": true,
      "observations": "what this answer tells us",
      "implications": "what joints/tissues are likely affected",
      "corrections": ["specific exercise or drill to fix this"]
    }
  ],
  "priority_corrections": ["top 3 things to address in order of importance"],
  "recommended_exercises": [
    {
      "name": "exercise name",
      "purpose": "what fault this addresses",
      "sets_reps": "e.g. 2x30s or 3x10"
    }
  ],
  "ai_summary": "2-3 sentence plain-language summary of movement quality and most important finding",
  "joints_to_mobilize": ["list of joints that need mobility work"],
  "muscles_to_strengthen": ["list of muscle groups that need strengthening"]
}`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as AssessRequest
    const { assessment_type, answers } = body

    const assessConfig = ASSESSMENT_TYPES[assessment_type]
    if (!assessConfig) return NextResponse.json({ error: 'Invalid assessment type' }, { status: 400 })

    const questionAnswerText = assessConfig.questions.map(q => {
      const answer = answers[q.id]
      const selectedOption = q.options.find(o => o.value === answer)
      return `Q: ${q.prompt}\nA: ${selectedOption?.label ?? answer ?? 'Not answered'} (${answer ?? 'skip'})`
    }).join('\n\n')

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('experience_level, injuries_limitations')
      .eq('id', user.id)
      .single()

    const userPrompt = `ASSESSMENT TYPE: ${assessConfig.name}
ATHLETE LEVEL: ${profile?.experience_level ?? 'intermediate'}
KNOWN ISSUES: ${profile?.injuries_limitations ?? 'none'}

ANSWERS:
${questionAnswerText}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: ASSESS_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let result: Record<string, unknown>
    try {
      result = JSON.parse(cleaned)
    } catch {
      result = { overall_score: 50, movement_quality: 'moderate', ai_summary: 'Assessment could not be fully analyzed.' }
    }

    const { data: assessment, error } = await supabase
      .from('movement_assessments')
      .insert({
        user_id: user.id,
        assessment_type,
        results: (result.results ?? []) as Record<string, unknown>[],
        ai_summary: result.ai_summary as string ?? '',
        priority_corrections: result.priority_corrections as string[] ?? [],
        score: result.overall_score as number ?? 50,
      })
      .select('id')
      .single()

    if (error) console.error('Assessment save error:', error)

    return NextResponse.json({
      assessment_id: assessment?.id ?? null,
      ...result,
    })
  } catch (err) {
    console.error('joint-health/assess error:', err)
    return NextResponse.json({ error: 'Assessment failed' }, { status: 500 })
  }
}
