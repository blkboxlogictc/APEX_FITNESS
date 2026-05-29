import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { FORM_CHECK_PROMPT } from '@/lib/vision/prompts'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('image') as File | null
    const base64Input = formData.get('base64') as string | null

    let base64: string
    let mimeType = 'image/jpeg'

    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const chunk = 8192
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      base64 = btoa(binary)
      mimeType = file.type || 'image/jpeg'
    } else if (base64Input) {
      base64 = base64Input
      const mt = formData.get('mimeType') as string | null
      mimeType = mt || 'image/jpeg'
    } else {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Fetch user profile for injury context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('injuries_limitations, experience_level, fitness_goal')
      .eq('id', user.id)
      .single()

    const injuryContext = profile?.injuries_limitations
      ? `\n\nIMPORTANT USER CONTEXT: This athlete has the following injuries/limitations: ${profile.injuries_limitations}. Factor this into your assessment and flag any movements that could aggravate these issues.`
      : ''

    const levelContext = profile?.experience_level
      ? `\nExperience level: ${profile.experience_level}.`
      : ''

    const systemPrompt = FORM_CHECK_PROMPT + injuryContext + levelContext

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
            },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err) {
    console.error('vision/form-check error:', err)
    return NextResponse.json({ error: 'Form check failed' }, { status: 500 })
  }
}
