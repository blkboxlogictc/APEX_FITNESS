import OpenAI from 'openai'
import type { SupplementAIAnalysis } from '@/types/nutrition'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const body = (await request.json()) as {
    supplement_name: string
    brand?: string
    ingredients?: string
    supplement_type?: string
  }

  const { supplement_name, brand, ingredients, supplement_type } = body

  if (!supplement_name) {
    return Response.json({ error: 'supplement_name required' }, { status: 400 })
  }

  const prompt = `Analyze this supplement and return ONLY valid JSON:

Supplement: ${supplement_name}${brand ? ` by ${brand}` : ''}
Type: ${supplement_type ?? 'unknown'}${ingredients ? `\nKey ingredients/label: ${ingredients}` : ''}

Return JSON exactly matching this schema:
{
  "what_it_does": "2-3 sentence plain English explanation of what this supplement does in the body",
  "evidence_level": "strong" | "moderate" | "limited" | "none",
  "recommended_timing": "specific timing recommendation (e.g. '30 min pre-workout with carbs')",
  "recommended_dose": "evidence-based dose range (e.g. '3-5g daily')",
  "synergistic_with": ["list of supplements that work well with this one, max 4"],
  "cautions": ["list of cautions/side effects to be aware of, max 3"],
  "interactions": ["potential drug or supplement interactions, max 3, empty array if none"],
  "apex_verdict": "one balanced sentence summarizing whether this is worth taking"
}`

  const system = `You are a knowledgeable sports nutritionist. Provide evidence-based, balanced information about supplements.
Never tell users they SHOULD take a supplement. Never make medical claims.
Always recommend consulting a healthcare provider for medical concerns.
Be honest about evidence quality. If evidence is limited or absent, say so clearly.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    })

    const analysis = JSON.parse(
      completion.choices[0].message.content ?? '{}'
    ) as SupplementAIAnalysis

    return Response.json({ analysis })
  } catch (err) {
    console.error('Supplement analysis error:', err)
    return Response.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
