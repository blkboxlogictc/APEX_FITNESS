import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function lookupOpenFoodFacts(barcode: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://apex-fitness.app'
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,serving_size,serving_quantity,nutriments,nutriscore_grade,nova_group,ingredients_text`
  const res = await fetch(url, {
    headers: { 'User-Agent': `APEX-AI-Fitness/1.0 (${appUrl})` },
  })
  if (!res.ok) return null
  const data = await res.json() as { status: number; product?: Record<string, unknown> }
  if (data.status !== 1 || !data.product) return null
  return data.product
}

function mapOFFProduct(product: Record<string, unknown>, barcode: string) {
  const n = (product.nutriments ?? {}) as Record<string, number>
  return {
    id: `off_${barcode}`,
    name: (product.product_name as string) || 'Unknown Product',
    brand: (product.brands as string) || null,
    barcode,
    source: 'openfoodfacts' as const,
    servingSize: (product.serving_size as string) || '100g',
    servingQuantity: (product.serving_quantity as number) || 100,
    nutrition: {
      calories: Math.round(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0),
      protein: n.proteins_serving ?? n.proteins_100g ?? 0,
      carbs: n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0,
      fat: n.fat_serving ?? n.fat_100g ?? 0,
      fiber: n.fiber_serving ?? n.fiber_100g ?? 0,
      sugar: n.sugars_serving ?? n.sugars_100g ?? 0,
      sodium: (n.sodium_serving ?? n.sodium_100g ?? 0) * 1000,
      saturatedFat: n['saturated-fat_serving'] ?? n['saturated-fat_100g'] ?? 0,
    },
    nutriscoreGrade: (product.nutriscore_grade as string)?.toUpperCase() ?? null,
    novaGroup: (product.nova_group as number) ?? null,
    ingredientsText: (product.ingredients_text as string) ?? null,
  }
}

async function extractBarcodeFromImage(base64: string, mimeType: string): Promise<string | null> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Read the barcode number in this image. Return ONLY the numeric barcode digits, nothing else. If you cannot read it clearly, return "null".',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
          },
        ],
      },
    ],
  })
  const text = (response.choices[0]?.message?.content ?? '').trim()
  if (text === 'null' || text === '' || !/^\d{8,14}$/.test(text)) return null
  return text
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const barcodeKnown = formData.get('barcode') as string | null

    let barcode: string | null = barcodeKnown

    if (!barcode) {
      // Need to extract from image
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
        return NextResponse.json({ error: 'No barcode or image provided' }, { status: 400 })
      }

      barcode = await extractBarcodeFromImage(base64, mimeType)
    }

    if (!barcode) {
      return NextResponse.json({ found: false, error: 'Could not read barcode' })
    }

    const product = await lookupOpenFoodFacts(barcode)
    if (!product) {
      return NextResponse.json({ found: false, barcode, error: 'Product not found in database' })
    }

    return NextResponse.json({ found: true, barcode, product: mapOFFProduct(product, barcode) })
  } catch (err) {
    console.error('vision/barcode error:', err)
    return NextResponse.json({ error: 'Barcode scan failed' }, { status: 500 })
  }
}
