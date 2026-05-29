import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { NUTRITION_LABEL_PROMPT, SUPPLEMENT_LABEL_PROMPT } from '@/lib/vision/prompts'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function imageToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    const base64Input = formData.get('base64') as string | null
    const labelTypeHint = (formData.get('labelType') as string | null) ?? 'auto'

    let base64: string
    let mimeType = 'image/jpeg'

    if (file) {
      base64 = await imageToBase64(file)
      mimeType = file.type || 'image/jpeg'
    } else if (base64Input) {
      base64 = base64Input
      const mt = formData.get('mimeType') as string | null
      mimeType = mt || 'image/jpeg'
    } else {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // First pass: detect if food or supplement label (unless hinted)
    let prompt = NUTRITION_LABEL_PROMPT
    if (labelTypeHint === 'supplement') {
      prompt = SUPPLEMENT_LABEL_PROMPT
    } else if (labelTypeHint === 'auto') {
      // Quick detection pass
      const detect = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Is this a "Supplement Facts" panel or a "Nutrition Facts" panel? Reply with exactly one word: "supplement" or "food".',
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'low' },
              },
            ],
          },
        ],
      })
      const answer = (detect.choices[0]?.message?.content ?? '').toLowerCase().trim()
      if (answer.includes('supplement')) prompt = SUPPLEMENT_LABEL_PROMPT
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
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

    return NextResponse.json({
      ...result,
      label_type: prompt === SUPPLEMENT_LABEL_PROMPT ? 'supplement' : 'food',
    })
  } catch (err) {
    console.error('vision/label error:', err)
    return NextResponse.json({ error: 'Label scan failed' }, { status: 500 })
  }
}
