import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { Database } from '@/lib/supabase/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profileContext = buildProfileContext(profile)
    const systemPrompt = buildGenerationPrompt(profileContext)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            'Generate my complete personalized nutrition and fitness plans now. Return only valid JSON.',
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    })

    const rawJson = completion.choices[0]?.message?.content
    if (!rawJson) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    let plans: {
      nutrition_plan: Record<string, unknown>
      fitness_plan: Record<string, unknown>
    }

    try {
      plans = JSON.parse(rawJson)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Deactivate any existing active plans
    await Promise.all([
      supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('fitness_plans')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true),
    ])

    const np = plans.nutrition_plan as Record<string, unknown>
    const fp = plans.fitness_plan as Record<string, unknown>

    const [{ data: nutritionPlan, error: nError }, { data: fitnessPlan, error: fError }] =
      await Promise.all([
        supabase
          .from('nutrition_plans')
          .insert({
            user_id: user.id,
            version: 1,
            daily_calories: (np.daily_calories as number) ?? null,
            protein_g: (np.protein_g as number) ?? null,
            carbs_g: (np.carbs_g as number) ?? null,
            fat_g: (np.fat_g as number) ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            meal_structure: (np.meal_structure as any) ?? [],
            notes: (np.notes as string) ?? null,
            generated_from_context: profileContext,
            is_active: true,
          })
          .select()
          .single(),
        supabase
          .from('fitness_plans')
          .insert({
            user_id: user.id,
            version: 1,
            plan_name: (fp.plan_name as string) ?? null,
            days_per_week: (fp.days_per_week as number) ?? profile.days_per_week ?? 3,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            weekly_structure: (fp.weekly_structure as any) ?? [],
            periodization_notes: (fp.periodization_notes as string) ?? null,
            is_active: true,
          })
          .select()
          .single(),
      ])

    if (nError || fError) {
      console.error('DB insert errors:', nError, fError)
      return NextResponse.json({ error: 'Failed to save plans' }, { status: 500 })
    }

    return NextResponse.json({ nutritionPlan, fitnessPlan, success: true })
  } catch (err) {
    console.error('Plan generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildProfileContext(profile: Record<string, unknown>): string {
  const goalMap: Record<string, string> = {
    lose_weight: 'Lose Weight / Fat Loss',
    build_muscle: 'Build Muscle / Hypertrophy',
    endurance: 'Endurance / Cardio',
    sport_performance: 'Sport Performance',
    general_health: 'General Health & Fitness',
  }

  const lines = [
    `Name: ${profile.full_name ?? 'Not provided'}`,
    `Age: ${profile.age ?? 'Not provided'}`,
    `Biological Sex: ${profile.sex ?? 'Not provided'}`,
    profile.height_cm
      ? `Height: ${profile.height_cm} cm (${Math.floor((profile.height_cm as number) / 30.48)}ft ${Math.round(((profile.height_cm as number) / 2.54) % 12)}in)`
      : `Height: Not provided`,
    profile.weight_kg
      ? `Weight: ${profile.weight_kg} kg (${Math.round((profile.weight_kg as number) * 2.205)} lbs)`
      : `Weight: Not provided`,
    `Primary Goal: ${goalMap[profile.fitness_goal as string] ?? profile.fitness_goal ?? 'Not specified'}`,
    `Experience Level: ${profile.experience_level ?? 'Not specified'}`,
    `Preferred Training Days/Week: ${profile.days_per_week ?? 'Not specified (infer from experience level)'}`,
    `Available Equipment: ${
      Array.isArray(profile.available_equipment) && (profile.available_equipment as string[]).length > 0
        ? (profile.available_equipment as string[]).join(', ')
        : 'None / Bodyweight only'
    }`,
    `Sports & Activities: ${
      Array.isArray(profile.sports_activities) && (profile.sports_activities as string[]).length > 0
        ? (profile.sports_activities as string[]).join(', ')
        : 'None specified'
    }`,
  ]

  if (profile.specific_goal) lines.push(`Specific Goal: ${profile.specific_goal}`)
  if (profile.injuries_limitations) lines.push(`Injuries / Limitations: ${profile.injuries_limitations}`)
  if (profile.personal_context) lines.push(`Additional Context: ${profile.personal_context}`)

  return lines.join('\n')
}

function buildGenerationPrompt(profileContext: string): string {
  return `You are an expert AI personal trainer and nutritionist — think sports physical therapist, certified strength coach, and registered dietitian combined. Generate a complete, evidence-based, highly personalized plan for this user.

USER PROFILE:
${profileContext}

═══════════════════════════════════════
NUTRITION FRAMEWORK (apply rigorously):
═══════════════════════════════════════
TDEE Calculation (Mifflin-St Jeor):
  Male BMR = 10×weight(kg) + 6.25×height(cm) − 5×age + 5
  Female BMR = 10×weight(kg) + 6.25×height(cm) − 5×age − 161
  Multiply by activity factor based on training frequency:
    1-2 days/week → ×1.375 | 3-4 days/week → ×1.55 | 5+ days/week → ×1.725

Calorie targets by goal:
  Fat loss: TDEE minus 350-500 kcal; min 1.0g protein per lb bodyweight
  Muscle gain: TDEE plus 200-300 kcal; 0.8-1.0g protein per lb bodyweight
  Endurance: at TDEE or slight surplus; carb-forward (50-55% carbs)
  Sport performance: at TDEE; carb periodization around training
  General health: at TDEE with balanced macros

Sport-specific nutrition notes:
  Golf: steady blood glucose critical; avoid high-GI spikes; hydration + focus
  Marathon/Running: 55-60% carbs; prioritize glycogen; long-run fueling
  Boxing: if weight management needed — strategic calorie timing; else high protein
  Basketball/Soccer: explosive energy demands; intra-workout carbs for long sessions

Meal structure: 3-5 meals; protein in every meal; post-workout protein within 2h.

═══════════════════════════════════════
FITNESS FRAMEWORK (apply rigorously):
═══════════════════════════════════════
ALWAYS include warmup and cooldown — never just lifting.
Warmup: 3-5 exercises targeting the session's movement patterns.
Cooldown: 2-4 stretches for the primary muscles worked.

Frequency by experience:
  Beginner (<1yr): Full body 3×/week — master movement patterns, not muscles
  Intermediate (1-3yr): Upper/Lower 4×/week or PPL 3-5×/week
  Advanced (3+yr): Higher frequency, periodization blocks, specificity

Equipment: STRICTLY use only what the user listed as available.

Injury modifications: For every exercise where the user's listed injury is relevant,
  provide an explicit modification or alternative. Include 1-2 prehab exercises for
  the affected joint in the warmup.

Sport performance additions:
  Golf → rotational core work, hip mobility, anti-rotation training
  Basketball/Soccer → lateral quickness drills, plyometrics, deceleration training
  Boxing → rotational power, shoulder stability, footwork conditioning
  Running → hip flexor mobility, eccentric calf/hamstring work, single-leg stability
  Cycling → hip flexor stretching, thoracic extension, knee stability

Progressive overload: In coaching_notes, note when to add weight (e.g., "add 5 lbs when you complete all top-range reps across all sets").

Deload reminder: In periodization_notes, mention deloading every 4-6 weeks.

REST DAYS: Always include active_recovery_suggestions — never just say "rest".

All 7 days of the week must appear in weekly_structure. On non-training days, set exercises to empty array but include active_recovery_suggestions.

═══════════════════════════════════════
OUTPUT FORMAT (return ONLY this JSON):
═══════════════════════════════════════
{
  "nutrition_plan": {
    "daily_calories": <integer>,
    "protein_g": <integer>,
    "carbs_g": <integer>,
    "fat_g": <integer>,
    "notes": "<2-3 sentences explaining these specific numbers for this person and why>",
    "meal_structure": [
      {
        "meal_name": "<e.g. Breakfast>",
        "time_suggestion": "<e.g. 7:00–8:00 AM>",
        "calories": <integer>,
        "protein_g": <integer>,
        "carbs_g": <integer>,
        "fat_g": <integer>,
        "example_foods": ["<food1>", "<food2>", "<food3>"],
        "notes": "<optional meal-specific note, or null>"
      }
    ]
  },
  "fitness_plan": {
    "plan_name": "<descriptive name, e.g. '4-Day Upper/Lower Strength'>",
    "days_per_week": <integer: actual training days, not rest days>,
    "periodization_notes": "<2-3 sentences on the programming logic and deload recommendation>",
    "weekly_structure": [
      {
        "day": "<Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday>",
        "focus": "<e.g. Lower Body Strength | Rest | Active Recovery>",
        "session_duration_min": <integer or null for full rest days>,
        "warmup": ["<movement 1>", "<movement 2>", "<movement 3>"],
        "exercises": [
          {
            "name": "<exercise name>",
            "sets": <integer>,
            "reps": "<e.g. 6-8 or 12-15 or 45 sec>",
            "rest_seconds": <integer>,
            "rpe": "<e.g. 7-8>",
            "coaching_notes": "<specific, actionable cue>",
            "modifications": "<injury modification if relevant, otherwise null>"
          }
        ],
        "cooldown": ["<stretch 1>", "<stretch 2>"],
        "active_recovery_suggestions": ["<only for rest/recovery days, otherwise []>"]
      }
    ]
  }
}

Be highly specific to THIS user. Reference their exact stats, goals, injuries, and context.
Make the plans feel like they were written by a trainer who has spent an hour learning about them.`
}
