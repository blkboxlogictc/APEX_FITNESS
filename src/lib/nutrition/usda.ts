import type { NutritionFacts } from '@/types/nutrition'

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'

export interface USDANutrient {
  nutrientId: number
  nutrientName: string
  unitName: string
  value: number
}

export interface USDAFood {
  fdcId: number
  description: string
  brandName?: string
  brandOwner?: string
  ingredients?: string
  servingSize?: number
  servingSizeUnit?: string
  foodCategory?: string
  nutrients: USDANutrient[]
}

// Mapping from USDA nutrient IDs to our NutritionFacts keys
const NUTRIENT_MAP: Record<number, keyof NutritionFacts> = {
  1008: 'calories',
  1003: 'protein_g',
  1005: 'carbs_g',
  1004: 'fat_g',
  1079: 'fiber_g',
  1063: 'sugar_g',
  1093: 'sodium_mg',
  1258: 'saturated_fat_g',
  1253: 'cholesterol_mg',
  1114: 'vitamin_d_mcg',
  1087: 'calcium_mg',
  1089: 'iron_mg',
  1092: 'potassium_mg',
}

function apiKey(): string {
  return process.env.USDA_API_KEY ?? 'DEMO_KEY'
}

// Normalize raw USDA search food object to USDAFood
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFood(raw: any): USDAFood {
  const rawNutrients = (raw.foodNutrients ?? []) as {
    nutrientId?: number
    nutrientNumber?: string
    nutrientName?: string
    unitName?: string
    value?: number
  }[]

  const nutrients: USDANutrient[] = rawNutrients.map((n) => ({
    nutrientId: n.nutrientId ?? parseInt(n.nutrientNumber ?? '0'),
    nutrientName: n.nutrientName ?? '',
    unitName: n.unitName ?? '',
    value: n.value ?? 0,
  }))

  return {
    fdcId: raw.fdcId,
    description: raw.description ?? '',
    brandName: raw.brandName || raw.brandOwner || undefined,
    brandOwner: raw.brandOwner || undefined,
    ingredients: raw.ingredients || undefined,
    servingSize: raw.servingSize ?? undefined,
    servingSizeUnit: raw.servingSizeUnit ?? undefined,
    foodCategory: raw.foodCategory ?? raw.foodCategoryLabel ?? undefined,
    nutrients,
  }
}

export async function searchUSDA(query: string, pageSize = 20): Promise<USDAFood[]> {
  if (!query.trim()) return []
  try {
    const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${apiKey()}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as { foods?: any[] }
    return (data.foods ?? []).map(normalizeFood)
  } catch {
    return []
  }
}

export async function getFoodByFdcId(fdcId: number): Promise<USDAFood | null> {
  try {
    const url = `${USDA_BASE}/food/${fdcId}?api_key=${apiKey()}`
    const res = await fetch(url, { next: { revalidate: 604800 } }) // 7 days
    if (!res.ok) return null
    const data = await res.json()
    return normalizeFood(data)
  } catch {
    return null
  }
}

export function parseNutrients(food: USDAFood, servingMultiplier = 1): NutritionFacts {
  const result: NutritionFacts = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    saturated_fat_g: 0,
    cholesterol_mg: 0,
  }

  for (const nutrient of food.nutrients) {
    const key = NUTRIENT_MAP[nutrient.nutrientId]
    if (key) {
      ;(result as unknown as Record<string, number>)[key] =
        Math.round(nutrient.value * servingMultiplier * 100) / 100
    }
  }

  return result
}

// Return a human-readable serving description for a USDA food
export function getUSDAServingLabel(food: USDAFood): string {
  if (food.servingSize && food.servingSizeUnit) {
    return `${food.servingSize}${food.servingSizeUnit}`
  }
  return '100g'
}
