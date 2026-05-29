import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import type { Database } from '@/lib/supabase/types'
import type { NutritionPlan, FitnessPlan, PlanPatch, WorkoutDay, MealStructureItem } from '@/types/plans'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PLAN_UPDATE_START = '###PLAN_UPDATE_START###'
const PLAN_UPDATE_END = '###PLAN_UPDATE_END###'

function sse(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(sse(data)))

      try {
        const { message, conversationHistory = [] } = (await request.json()) as {
          message: string
          conversationHistory: { role: 'user' | 'assistant'; content: string }[]
        }

        const supabase = await createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          send({ type: 'error', message: 'Unauthorized' })
          controller.close()
          return
        }

        // Fetch all context in parallel
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const todayDate = new Intl.DateTimeFormat('en-CA').format(new Date())
        const [
          { data: profile },
          { data: nutritionPlan },
          { data: fitnessPlan },
          { data: recentMessages },
          { data: recentSessions },
          { data: exHistory },
          { data: activityLogs },
          { data: sportPrograms },
          { data: todayFoodLogs },
          { data: weekFoodLogs },
          { data: activeSupplements },
          { data: activeScreenings },
          { data: activePrehabPrograms },
          { data: recentPrehabLogs },
          { data: activeGoals },
          { data: latestRecap },
          { data: weekPRs },
        ] = await Promise.all([
          supabase.from('user_profiles').select('*').eq('id', user.id).single(),
          supabase
            .from('nutrition_plans')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('fitness_plans')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('chat_messages')
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('workout_sessions')
            .select('session_name, started_at, duration_minutes, total_volume_kg, ai_feedback')
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .order('started_at', { ascending: false })
            .limit(3),
          supabase
            .from('exercise_history')
            .select('exercise_name, best_weight_kg, best_reps, personal_record_set_at')
            .eq('user_id', user.id)
            .gt('best_weight_kg', 0)
            .order('best_weight_kg', { ascending: false })
            .limit(8),
          supabase
            .from('activity_logs')
            .select('activity_name, category, duration_minutes, calories_burned, logged_at')
            .eq('user_id', user.id)
            .gte('logged_at', sevenDaysAgo)
            .order('logged_at', { ascending: false })
            .limit(15),
          supabase
            .from('sport_programs')
            .select('sport, program_name, weekly_sessions, duration_weeks, coaching_notes')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(3),
          supabase
            .from('food_logs')
            .select('food_name, meal_type, calories, protein_g, carbs_g, fat_g, serving_size_label')
            .eq('user_id', user.id)
            .eq('logged_at', todayDate)
            .order('created_at', { ascending: true }),
          supabase
            .from('food_logs')
            .select('calories, protein_g, logged_at')
            .eq('user_id', user.id)
            .gte('logged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .lt('logged_at', todayDate),
          supabase
            .from('supplement_stack')
            .select('name, supplement_type, timing_recommendation')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(10),
          supabase
            .from('pain_screenings')
            .select('joint, side, pain_level, referral_recommended, created_at')
            .eq('user_id', user.id)
            .is('resolved_at', null)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('prehab_programs')
            .select('program_name, target_joints, frequency_per_week, program_type')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(3),
          supabase
            .from('prehab_logs')
            .select('completed_at, program_id, pain_level_before, pain_level_after')
            .eq('user_id', user.id)
            .gte('completed_at', sevenDaysAgo)
            .order('completed_at', { ascending: false }),
          supabase
            .from('goals')
            .select('title, goal_type, target_value, current_value, start_value, target_unit, target_date, is_achieved')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('is_achieved', false)
            .limit(5),
          supabase
            .from('weekly_recaps')
            .select('headline, apex_score, highlights, focus_areas, week_start')
            .eq('user_id', user.id)
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('exercise_history')
            .select('exercise_name, best_weight_kg, best_reps, personal_record_set_at')
            .eq('user_id', user.id)
            .gte('personal_record_set_at', sevenDaysAgo)
            .order('personal_record_set_at', { ascending: false })
            .limit(5),
        ])

        // Save user message
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          role: 'user',
          content: message,
        })

        const systemPrompt = buildChatSystemPrompt(
          profile,
          nutritionPlan as NutritionPlan | null,
          fitnessPlan as FitnessPlan | null,
          (recentMessages ?? []).reverse(),
          recentSessions ?? [],
          exHistory ?? [],
          activityLogs ?? [],
          sportPrograms ?? [],
          todayFoodLogs ?? [],
          weekFoodLogs ?? [],
          activeSupplements ?? [],
          activeScreenings ?? [],
          activePrehabPrograms ?? [],
          recentPrehabLogs ?? [],
          activeGoals ?? [],
          latestRecap ?? null,
          weekPRs ?? []
        )

        // Build message history for GPT (keep last 10 turns to stay under token budget)
        const history = conversationHistory.slice(-10).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

        // Stream from GPT-4o and buffer simultaneously
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message },
          ],
          stream: true,
          temperature: 0.8,
          max_tokens: 1500,
        })

        let fullText = ''
        let detectedPlanUpdate = false
        // Once we've seen more chars than the marker without finding it, stream directly
        const LOOKAHEAD = PLAN_UPDATE_START.length + 5

        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content ?? ''
          if (!token) continue
          fullText += token

          if (!detectedPlanUpdate) {
            if (fullText.startsWith(PLAN_UPDATE_START)) {
              detectedPlanUpdate = true
              // Don't emit tokens yet — buffer until we have the full JSON
            } else if (fullText.length > LOOKAHEAD) {
              // Not a plan update format — emit all buffered content then stream normally
              if (fullText.length === LOOKAHEAD + token.length) {
                send({ type: 'token', content: fullText })
              } else {
                send({ type: 'token', content: token })
              }
            }
          }
          // If detectedPlanUpdate: keep buffering silently
        }

        let displayText = fullText
        let planEditId: string | null = null

        if (detectedPlanUpdate) {
          // Parse the plan update JSON
          const match = fullText.match(
            new RegExp(
              PLAN_UPDATE_START.replace(/\#/g, '\\#') +
                '\\s*([\\s\\S]*?)\\s*' +
                PLAN_UPDATE_END.replace(/\#/g, '\\#')
            )
          )

          if (match) {
            try {
              const parsed = JSON.parse(match[1]) as {
                message: string
                plan_patch: PlanPatch
              }
              displayText = parsed.message

              // Apply the patch
              planEditId = await applyPlanPatch(
                supabase,
                user.id,
                parsed.plan_patch,
                nutritionPlan as NutritionPlan | null,
                fitnessPlan as FitnessPlan | null,
                message,
                displayText
              )

              // Emit plan updated event
              send({
                type: 'plan_updated',
                planType: parsed.plan_patch.type,
                changeSummary: parsed.plan_patch.change_summary,
                editId: planEditId,
              })
            } catch (parseErr) {
              // Graceful degradation: strip markers, show raw message
              displayText = fullText
                .replace(new RegExp(PLAN_UPDATE_START + '[\\s\\S]*?' + PLAN_UPDATE_END), '')
                .trim()
              if (!displayText) displayText = fullText
            }
          }

          // Stream the display text word-by-word for smooth UX
          const words = displayText.split(/(\s+)/)
          for (const word of words) {
            send({ type: 'token', content: word })
            await new Promise<void>((r) => setTimeout(r, 12))
          }
        }

        // Persist assistant message
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          role: 'assistant',
          content: displayText,
          has_plan_edit: !!planEditId,
          plan_edit_id: planEditId,
        })

        send({ type: 'done' })
        controller.close()
      } catch (err) {
        console.error('Chat error:', err)
        controller.enqueue(
          encoder.encode(sse({ type: 'error', message: 'Something went wrong. Please try again.' }))
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ─── System prompt builder ───────────────────────────────────────────────────

function buildChatSystemPrompt(
  profile: Record<string, unknown> | null,
  nutritionPlan: NutritionPlan | null,
  fitnessPlan: FitnessPlan | null,
  recentMessages: { role: string; content: string }[],
  recentSessions: Record<string, unknown>[],
  exHistory: Record<string, unknown>[],
  activityLogs: Record<string, unknown>[],
  sportPrograms: Record<string, unknown>[],
  todayFoodLogs: Record<string, unknown>[],
  weekFoodLogs: Record<string, unknown>[],
  activeSupplements: Record<string, unknown>[],
  activeScreenings: Record<string, unknown>[],
  activePrehabPrograms: Record<string, unknown>[],
  recentPrehabLogs: Record<string, unknown>[],
  activeGoals: Record<string, unknown>[],
  latestRecap: Record<string, unknown> | null,
  weekPRs: Record<string, unknown>[]
): string {
  const profileSection = profile
    ? `Name: ${profile.full_name ?? 'Unknown'}, Age: ${profile.age ?? '?'}, Sex: ${profile.sex ?? '?'}
Height: ${profile.height_cm ? `${profile.height_cm}cm` : '?'}, Weight: ${profile.weight_kg ? `${profile.weight_kg}kg` : '?'}
Goal: ${profile.fitness_goal ?? '?'}, Experience: ${profile.experience_level ?? '?'}
Equipment: ${Array.isArray(profile.available_equipment) ? (profile.available_equipment as string[]).join(', ') || 'none' : 'none'}
Sports: ${Array.isArray(profile.sports_activities) ? (profile.sports_activities as string[]).join(', ') || 'none' : 'none'}${profile.specific_goal ? `\nSpecific goal: ${profile.specific_goal}` : ''}${profile.injuries_limitations ? `\nInjuries/Limitations: ${profile.injuries_limitations}` : ''}${profile.personal_context ? `\nContext: ${profile.personal_context}` : ''}`
    : 'Profile not available.'

  const nutritionSection = nutritionPlan
    ? `Daily targets (v${nutritionPlan.version}): ${nutritionPlan.daily_calories} kcal | ${nutritionPlan.protein_g}g protein | ${nutritionPlan.carbs_g}g carbs | ${nutritionPlan.fat_g}g fat
Meals: ${(nutritionPlan.meal_structure ?? []).map((m: MealStructureItem) => `${m.meal_name} (${m.calories}kcal, ${m.protein_g}g P)`).join(' → ')}`
    : 'No nutrition plan yet.'

  const fitnessSection = fitnessPlan
    ? `${fitnessPlan.plan_name} (v${fitnessPlan.version})
${(fitnessPlan.weekly_structure ?? [])
      .map(
        (d: WorkoutDay) =>
          `${d.day} [${d.focus}]: ${
            d.exercises.length === 0
              ? 'Rest'
              : d.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(', ')
          }`
      )
      .join('\n')}`
    : 'No fitness plan yet.'

  const historySection =
    recentMessages.length > 0
      ? recentMessages
          .slice(-10)
          .map((m) => `${m.role === 'user' ? 'User' : 'APEX'}: ${m.content}`)
          .join('\n')
      : 'No previous conversation.'

  const workoutSection =
    recentSessions.length > 0
      ? recentSessions
          .map((s) => {
            const date = new Date(s.started_at as string).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            const vol = s.total_volume_kg ? ` · ${Math.round((s.total_volume_kg as number) * 2.205).toLocaleString()} lbs` : ''
            const dur = s.duration_minutes ? ` · ${s.duration_minutes} min` : ''
            return `${date}: ${s.session_name}${dur}${vol}`
          })
          .join('\n')
      : 'No recent sessions.'

  const prSection =
    exHistory.length > 0
      ? exHistory
          .map((h) => {
            const w = h.best_weight_kg ? `${((h.best_weight_kg as number) * 2.205).toFixed(1)} lbs` : 'bodyweight'
            return `${h.exercise_name}: ${w} × ${h.best_reps} reps`
          })
          .join('\n')
      : 'No PR data yet.'

  const activitySection =
    activityLogs.length > 0
      ? activityLogs
          .map((a) => {
            const date = new Date(a.logged_at as string).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            return `${date}: ${a.activity_name} — ${a.duration_minutes} min · ${a.calories_burned} cal`
          })
          .join('\n')
      : 'No activity logged this week.'

  const sportProgramSection =
    sportPrograms.length > 0
      ? sportPrograms
          .map((p) => `${(p.sport as string).replace('_', ' ')} — ${p.program_name} (${p.weekly_sessions}×/week, ${p.duration_weeks} weeks)${p.coaching_notes ? `: ${p.coaching_notes}` : ''}`)
          .join('\n')
      : 'No active sport programs.'

  // Today's food log summary
  let todayFoodSection = 'Nothing logged yet today.'
  if (todayFoodLogs.length > 0) {
    const totalCals = todayFoodLogs.reduce((s, l) => s + (l.calories as number), 0)
    const totalProtein = todayFoodLogs.reduce((s, l) => s + (l.protein_g as number), 0)
    const totalCarbs = todayFoodLogs.reduce((s, l) => s + (l.carbs_g as number), 0)
    const totalFat = todayFoodLogs.reduce((s, l) => s + (l.fat_g as number), 0)
    const byMeal: Record<string, string[]> = {}
    for (const log of todayFoodLogs as { food_name: string; meal_type: string; calories: number; serving_size_label: string }[]) {
      if (!byMeal[log.meal_type]) byMeal[log.meal_type] = []
      byMeal[log.meal_type].push(`${log.food_name} (${log.calories} kcal)`)
    }
    const mealLines = Object.entries(byMeal).map(([meal, foods]) => `${meal}: ${foods.join(', ')}`).join('\n')
    todayFoodSection = `Totals: ${totalCals} kcal | ${Math.round(totalProtein)}g protein | ${Math.round(totalCarbs)}g carbs | ${Math.round(totalFat)}g fat\n${mealLines}`
  }

  // Weekly nutrition averages
  let weekNutritionSection = 'No food logged in the last 7 days.'
  if (weekFoodLogs.length > 0) {
    const dayMap: Record<string, { cal: number; protein: number }> = {}
    for (const log of weekFoodLogs as { calories: number; protein_g: number; logged_at: string }[]) {
      const d = log.logged_at
      if (!dayMap[d]) dayMap[d] = { cal: 0, protein: 0 }
      dayMap[d].cal += log.calories
      dayMap[d].protein += log.protein_g
    }
    const days = Object.values(dayMap)
    const avgCal = Math.round(days.reduce((s, d) => s + d.cal, 0) / days.length)
    const avgProtein = Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length)
    const caloriesTarget = (nutritionPlan?.daily_calories ?? 2000) as number
    const onTarget = days.filter(d => Math.abs(d.cal - caloriesTarget) / caloriesTarget < 0.15).length
    weekNutritionSection = `Avg calories: ${avgCal} kcal/day | Avg protein: ${avgProtein}g/day | On-target days: ${onTarget}/${days.length}`
  }

  const supplementSection =
    activeSupplements.length > 0
      ? (activeSupplements as { name: string; supplement_type: string; timing_recommendation: string }[])
          .map(s => `${s.name} (${s.supplement_type})${s.timing_recommendation ? ` — ${s.timing_recommendation}` : ''}`)
          .join('\n')
      : 'No active supplements.'

  // Joint health context
  let jointHealthSection = 'No active pain issues.'
  if (activeScreenings.length > 0) {
    const issues = (activeScreenings as { joint: string; side: string; pain_level: number; referral_recommended: boolean; created_at: string }[])
      .map(s => {
        const side = s.side !== 'center' && s.side !== 'both' ? `${s.side} ` : ''
        const days = Math.round((Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24))
        return `${side}${s.joint.replace('_', ' ')} — pain ${s.pain_level}/10 (${days}d)${s.referral_recommended ? ' ⚠️ referral recommended' : ''}`
      })
      .join('\n')
    jointHealthSection = issues
  }

  const prehabProgramSection =
    activePrehabPrograms.length > 0
      ? (activePrehabPrograms as { program_name: string; target_joints: string[]; frequency_per_week: number; program_type: string }[])
          .map(p => `${p.program_name} — ${p.target_joints.join(', ')} — ${p.frequency_per_week}×/week (${p.program_type})`)
          .join('\n')
      : 'No active prehab programs.'

  const prehabAdherenceSection = recentPrehabLogs.length > 0
    ? `${recentPrehabLogs.length} prehab sessions this week`
    : '0 prehab sessions this week.'

  // Active goals context
  const goalsSection = activeGoals.length > 0
    ? (activeGoals as {
        title: string; goal_type: string; target_value: number | null; current_value: number | null
        start_value: number | null; target_unit: string | null; target_date: string | null
      }[]).map(g => {
        const progress = g.target_value != null && g.start_value != null && g.current_value != null && g.target_value !== g.start_value
          ? `${Math.min(100, Math.round(((g.current_value - g.start_value) / (g.target_value - g.start_value)) * 100))}% to target`
          : g.current_value != null ? `current: ${g.current_value}${g.target_unit ? ' ' + g.target_unit : ''}` : ''
        const deadline = g.target_date
          ? ` — ${Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86400000)}d remaining`
          : ''
        return `${g.title} (${g.goal_type})${g.target_value != null ? ` → ${g.target_value}${g.target_unit ? ' ' + g.target_unit : ''}` : ''}${progress ? ` — ${progress}` : ''}${deadline}`
      }).join('\n')
    : 'No active goals.'

  // Latest weekly recap
  let recapSection = 'No recap generated yet.'
  if (latestRecap) {
    const r = latestRecap as { headline: string; apex_score: number; highlights: string[]; focus_areas: string[]; week_start: string }
    recapSection = `Week of ${r.week_start} — Score: ${r.apex_score}/100\n"${r.headline}"\nHighlights: ${(r.highlights ?? []).slice(0, 2).join('; ')}\nFocus areas: ${(r.focus_areas ?? []).slice(0, 2).join('; ')}`
  }

  // This week's PRs
  const weekPRsSection = weekPRs.length > 0
    ? (weekPRs as { exercise_name: string; best_weight_kg: number; best_reps: number }[])
        .map(pr => `${pr.exercise_name}: ${((pr.best_weight_kg ?? 0) * 2.205).toFixed(1)} lbs × ${pr.best_reps} reps`)
        .join('\n')
    : 'No new PRs this week.'

  return `You are APEX, an expert AI personal trainer and nutritionist. You have the combined knowledge of a sports physical therapist, certified strength coach, and registered dietitian. You are warm, direct, evidence-based, and never give generic advice — everything you say is specific to this user.

━━━ USER PROFILE ━━━
${profileSection}

━━━ ACTIVE NUTRITION PLAN ━━━
${nutritionSection}

━━━ ACTIVE FITNESS PLAN ━━━
${fitnessSection}

━━━ RECENT WORKOUT SESSIONS ━━━
${workoutSection}

━━━ PERSONAL RECORDS (major lifts) ━━━
${prSection}

━━━ ACTIVITY LOG (last 7 days) ━━━
${activitySection}

━━━ ACTIVE SPORT PROGRAMS ━━━
${sportProgramSection}

━━━ TODAY'S FOOD LOG ━━━
${todayFoodSection}

━━━ WEEKLY NUTRITION AVERAGES (last 7 days) ━━━
${weekNutritionSection}

━━━ ACTIVE SUPPLEMENTS ━━━
${supplementSection}

━━━ ACTIVE PAIN ISSUES ━━━
${jointHealthSection}

━━━ ACTIVE PREHAB PROGRAMS ━━━
${prehabProgramSection}

━━━ PREHAB ADHERENCE (last 7 days) ━━━
${prehabAdherenceSection}

━━━ ACTIVE GOALS ━━━
${goalsSection}

━━━ LATEST WEEKLY RECAP ━━━
${recapSection}

━━━ THIS WEEK'S PRs ━━━
${weekPRsSection}

━━━ RECENT CONVERSATION ━━━
${historySection}

━━━ YOUR BEHAVIOR RULES ━━━
1. Always respond as their personal trainer who knows them well — reference their profile details.
2. When the user asks to change something in their plan, DO IT. Make the change and tell them what changed.
3. Detect plan modification requests: swapping exercises or meals, changing volumes/calories/frequency, adjusting for pain/fatigue/travel/time constraints, goal updates. Reference the user's active goals when suggesting progressions or modifications.
3b. Progress awareness: use the latest recap and this week's PRs to celebrate wins, acknowledge struggles, and give contextual advice. If the user just hit a PR, acknowledge it.
4. Joint health: if user has active pain issues, factor this into every exercise recommendation. Use Horschig principles — pain = modify training, never push through. If pain level 6+ or referral recommended, strongly encourage professional evaluation FIRST.
5. Prehab: if user has prehab programs, remind them to complete sessions per their frequency target. Low adherence = address it.
6. Supplements: explain what it does, typical dosing, timing, interactions/cautions. Never prescribe — inform only.
7. Keep responses concise. Short paragraphs. No bullet-point walls unless listing exercises.

━━━ PLAN UPDATE FORMAT ━━━
If the user's message requires a plan modification, respond with EXACTLY this format (the JSON must be valid):

${PLAN_UPDATE_START}
{
  "message": "<your full conversational response — warm, specific, explain what you changed and why>",
  "plan_patch": {
    "type": "nutrition" | "fitness" | "both",
    "changes": {
      <include ONLY changed fields using the exact same structure as the plan JSON above>
      <for meal_structure or weekly_structure: include the complete updated array, not partial>
    },
    "change_summary": "<short human-readable summary of what changed, e.g. 'Replaced pull-ups with lat pulldowns on Monday'>"
  }
}
${PLAN_UPDATE_END}

If NO plan modification is needed, respond with plain conversational text only — no JSON, no markers.`
}

// ─── Plan patch application ───────────────────────────────────────────────────

async function applyPlanPatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  patch: PlanPatch,
  nutritionPlan: NutritionPlan | null,
  fitnessPlan: FitnessPlan | null,
  userMessage: string,
  aiResponse: string
): Promise<string | null> {
  const changes = patch.changes as Record<string, unknown>
  let editId: string | null = null

  try {
    if ((patch.type === 'nutrition' || patch.type === 'both') && nutritionPlan) {
      const nutritionChanges = (changes.nutrition ?? changes) as Record<string, unknown>

      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

      if (nutritionChanges.daily_calories !== undefined) update.daily_calories = nutritionChanges.daily_calories
      if (nutritionChanges.protein_g !== undefined) update.protein_g = nutritionChanges.protein_g
      if (nutritionChanges.carbs_g !== undefined) update.carbs_g = nutritionChanges.carbs_g
      if (nutritionChanges.fat_g !== undefined) update.fat_g = nutritionChanges.fat_g
      if (nutritionChanges.notes !== undefined) update.notes = nutritionChanges.notes
      if (nutritionChanges.meal_structure !== undefined) {
        update.meal_structure = nutritionChanges.meal_structure
      }
      update.version = nutritionPlan.version + 1

      await supabase.from('nutrition_plans').update(update).eq('id', nutritionPlan.id)

      const { data: historyRow } = await supabase
        .from('plan_edit_history')
        .insert({
          user_id: userId,
          plan_type: patch.type,
          plan_id: nutritionPlan.id,
          version_before: nutritionPlan.version,
          version_after: nutritionPlan.version + 1,
          user_message: userMessage,
          ai_response: aiResponse,
          diff_summary: patch.change_summary,
        })
        .select('id')
        .single()

      editId = historyRow?.id ?? null
    }

    if ((patch.type === 'fitness' || patch.type === 'both') && fitnessPlan) {
      const fitnessChanges = (changes.fitness ?? changes) as Record<string, unknown>

      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

      if (fitnessChanges.plan_name !== undefined) update.plan_name = fitnessChanges.plan_name
      if (fitnessChanges.days_per_week !== undefined) update.days_per_week = fitnessChanges.days_per_week
      if (fitnessChanges.periodization_notes !== undefined) update.periodization_notes = fitnessChanges.periodization_notes
      if (fitnessChanges.weekly_structure !== undefined) {
        update.weekly_structure = fitnessChanges.weekly_structure
      }
      update.version = fitnessPlan.version + 1

      await supabase.from('fitness_plans').update(update).eq('id', fitnessPlan.id)

      if (!editId) {
        const { data: historyRow } = await supabase
          .from('plan_edit_history')
          .insert({
            user_id: userId,
            plan_type: patch.type,
            plan_id: fitnessPlan.id,
            version_before: fitnessPlan.version,
            version_after: fitnessPlan.version + 1,
            user_message: userMessage,
            ai_response: aiResponse,
            diff_summary: patch.change_summary,
          })
          .select('id')
          .single()

        editId = historyRow?.id ?? null
      }
    }
  } catch (err) {
    console.error('Plan patch application error:', err)
  }

  return editId
}
