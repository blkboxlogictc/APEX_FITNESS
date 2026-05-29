import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { MEAL_PHOTO_PROMPT } from '@/lib/vision/prompts'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface MealAnalysisItem {
  name: string
  quantity: number
  unit: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  confidence: number
}

export interface MealAnalysisResult {
  meal_name: string
  confidence: number
  items: MealAnalysisItem[]
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  notes: string
}

export async function POST(req: NextRequest) {
  try {
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: MEAL_PHOTO_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result: MealAnalysisResult = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err) {
    console.error('vision/meal error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
