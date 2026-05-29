import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const message = (formData.get('message') as string | null) ?? ''
    const file = formData.get('image') as File | null
    const base64Input = formData.get('base64') as string | null
    const historyRaw = (formData.get('history') as string | null) ?? '[]'

    // Load profile for context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const systemPrompt = `You are APEX, an elite AI personal trainer and sports nutritionist. You can see and analyze images the user shares.

${profile ? `━━━ ATHLETE PROFILE ━━━
Name: ${profile.full_name ?? 'Athlete'}
Age: ${profile.age ?? 'Unknown'} | Sex: ${profile.sex ?? 'Unknown'}
Height: ${profile.height_cm ?? '?'}cm | Weight: ${profile.weight_kg ?? '?'}kg
Goal: ${profile.fitness_goal ?? 'General fitness'} | Level: ${profile.experience_level ?? 'Intermediate'}
Injuries: ${profile.injuries_limitations ?? 'None reported'}` : ''}

When analyzing images:
- For food/meals: provide detailed nutritional breakdown and whether it aligns with their goals
- For nutrition labels: extract key data and advise on the product
- For exercise form: give specific, actionable coaching cues
- For progress photos: comment on physique progress diplomatically and constructively
- Always be specific, data-driven, and encouraging`

    // Build image content if provided
    let imageContent: OpenAI.Chat.ChatCompletionContentPart[] = []

    if (file || base64Input) {
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
      } else {
        base64 = base64Input!
        const mt = formData.get('mimeType') as string | null
        mimeType = mt || 'image/jpeg'
      }

      imageContent = [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
        },
      ]
    }

    const history = JSON.parse(historyRaw) as Array<{ role: string; content: string }>
    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = history.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      ...(message ? [{ type: 'text' as const, text: message }] : []),
      ...imageContent,
    ]

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: userContent.length > 0 ? userContent : 'Analyze this image.' },
    ]

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      stream: true,
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('coach/vision-chat error:', err)
    return NextResponse.json({ error: 'Vision chat failed' }, { status: 500 })
  }
}
