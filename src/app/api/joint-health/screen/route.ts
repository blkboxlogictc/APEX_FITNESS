import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { HORSCHIG_PRINCIPLES } from '@/lib/jointHealth/knowledgeBase'
import type { PainScreeningResult } from '@/lib/jointHealth/knowledgeBase'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SCREEN_SYSTEM_PROMPT = `You are APEX's joint health specialist, trained in the principles of sports physical therapy and the methodologies of Dr. Aaron Horschig (Rebuilding Milo, The Squat Bible). Analyze this pain screening and provide a thorough assessment.

${HORSCHIG_PRINCIPLES}

Respond in this exact JSON structure, no markdown:
{
  "likely_diagnosis": "most probable cause in plain language",
  "confidence": "high|medium|low",
  "root_cause_analysis": "explanation of what is likely causing this, looking at joints above and below",
  "tissue_type_affected": "muscle|tendon|ligament|joint|nerve|unknown",
  "healing_timeline": "realistic expectation",
  "red_flag_assessment": "explanation if any red flags present, else null",
  "referral_recommended": false,
  "referral_urgency": "immediate|soon|if_no_improvement|not_needed",
  "immediate_actions": ["what to do right now"],
  "exercises_to_avoid": ["specific movements to avoid and why"],
  "exercises_to_modify": [
    { "exercise": "name", "modification": "how to modify it" }
  ],
  "recovery_phases": [
    {
      "phase": "Phase 1 — Pain Management",
      "duration": "1-2 weeks",
      "focus": "description",
      "key_exercises": ["exercise names"]
    }
  ],
  "training_can_continue": true,
  "training_guidance": "how to keep training safely",
  "horschig_principle_applied": "which specific principle guides this assessment"
}`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as PainScreeningResult & { context?: string }
    const { joint, side, pain_level, pain_type, when_painful, movements_that_hurt, duration_weeks, has_red_flags, red_flags_present, context } = body

    // Fetch user profile for context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('fitness_goal, experience_level, sports_activities, injuries_limitations')
      .eq('id', user.id)
      .single()

    const screeningContext = `
ATHLETE CONTEXT:
- Goal: ${profile?.fitness_goal ?? 'general fitness'}
- Experience: ${profile?.experience_level ?? 'intermediate'}
- Sports: ${profile?.sports_activities?.join(', ') ?? 'none reported'}
- Known injuries: ${profile?.injuries_limitations ?? 'none previously reported'}

PAIN SCREENING DATA:
- Joint: ${joint} (${side} side)
- Pain level: ${pain_level}/10
- Pain character: ${pain_type.join(', ')}
- When painful: ${when_painful.join(', ')}
- Movements that hurt: ${movements_that_hurt.join(', ')}
- Duration: ${duration_weeks < 1 ? 'less than 1 week' : `${duration_weeks} weeks`}
- Red flags present: ${has_red_flags ? red_flags_present.join(', ') : 'none'}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SCREEN_SYSTEM_PROMPT },
        { role: 'user', content: screeningContext },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let assessment: Record<string, unknown>
    try {
      assessment = JSON.parse(cleaned)
    } catch {
      assessment = { likely_diagnosis: 'Assessment unavailable', confidence: 'low', referral_recommended: has_red_flags }
    }

    if (has_red_flags) {
      assessment.referral_recommended = true
      assessment.referral_urgency = 'soon'
    }

    // Save screening
    const { data: screening, error: screenError } = await supabase
      .from('pain_screenings')
      .insert({
        user_id: user.id,
        joint,
        side,
        pain_level,
        pain_description: body as unknown as Record<string, unknown>,
        ai_assessment: JSON.stringify(assessment),
        red_flags_detected: has_red_flags,
        referral_recommended: assessment.referral_recommended as boolean,
        context: context ?? 'initial',
      } as any)
      .select('id')
      .single()

    if (screenError || !screening) {
      return NextResponse.json({ error: 'Failed to save screening' }, { status: 500 })
    }

    // Update user profile injuries field
    const currentInjuries = profile?.injuries_limitations ?? ''
    const injuryNote = `${joint} pain (${side}, ${pain_level}/10) — ${assessment.likely_diagnosis as string}`
    const updatedInjuries = currentInjuries
      ? currentInjuries.includes(joint) ? currentInjuries : `${currentInjuries}; ${injuryNote}`
      : injuryNote
    await supabase.from('user_profiles').update({ injuries_limitations: updatedInjuries }).eq('id', user.id)

    // Auto-generate prehab program for pain levels > 2
    let programId: string | null = null
    if (pain_level > 2) {
      const programRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/joint-health/program/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('cookie') ?? '' },
        body: JSON.stringify({
          pain_screening_id: screening.id,
          target_joints: [joint],
          program_type: pain_level >= 5 ? 'injury_rehab' : 'prehab',
          available_equipment: profile ? [] : [],
          time_available_minutes: 12,
          assessment,
        }),
      })
      if (programRes.ok) {
        const programData = await programRes.json() as { id?: string }
        programId = programData.id ?? null
        if (programId) {
          await supabase.from('pain_screenings').update({ recommended_program_id: programId }).eq('id', screening.id)
        }
      }
    }

    return NextResponse.json({
      screening_id: screening.id,
      program_id: programId,
      assessment,
      red_flags_detected: has_red_flags,
    })
  } catch (err) {
    console.error('joint-health/screen error:', err)
    return NextResponse.json({ error: 'Screening failed' }, { status: 500 })
  }
}
