import type { NutritionFacts } from '@/types/nutrition'

const OFF_BASE = 'https://world.openfoodfacts.org'

const OFF_FIELDS =
  'code,product_name,brands,serving_size,serving_quantity,nutriments,nutriscore_grade,nova_group,image_url,ingredients_text,allergens,categories,quantity'

const SUPPLEMENT_CATEGORIES = [
  'supplements',
  'protein-powders',
  'proteins',
  'vitamins',
  'pre-workout',
  'sports-nutrition',
  'nutritional-supplements',
  'dietary-supplements',
  'whey',
  'creatine',
  'amino-acids',
  'plant-based-proteins',
]

export interface OFFNutriments {
  'energy-kcal_serving'?: number
  'energy-kcal_100g'?: number
  'proteins_serving'?: number
  'proteins_100g'?: number
  'carbohydrates_serving'?: number
  'carbohydrates_100g'?: number
  'fat_serving'?: number
  'fat_100g'?: number
  'fiber_serving'?: number
  'fiber_100g'?: number
  'sugars_serving'?: number
  'sugars_100g'?: number
  'sodium_serving'?: number
  'sodium_100g'?: number
  'saturated-fat_serving'?: number
  'saturated-fat_100g'?: number
}

export interface OFFProduct {
  code: string
  product_name: string
  brands?: string
  serving_size?: string
  serving_quantity?: number
  nutriments: OFFNutriments
  nutriscore_grade?: string
  nova_group?: number
  image_url?: string
  ingredients_text?: string
  allergens?: string
  categories?: string
  quantity?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProduct(raw: any): OFFProduct | null {
  if (!raw || !raw.product_name) return null
  return {
    code: raw.code ?? '',
    product_name: raw.product_name ?? '',
    brands: raw.brands || undefined,
    serving_size: raw.serving_size || undefined,
    serving_quantity: raw.serving_quantity ? parseFloat(raw.serving_quantity) : undefined,
    nutriments: raw.nutriments ?? {},
    nutriscore_grade: raw.nutriscore_grade || undefined,
    nova_group: raw.nova_group ?? undefined,
    image_url: raw.image_url || raw.image_front_url || undefined,
    ingredients_text: raw.ingredients_text || undefined,
    allergens: raw.allergens || undefined,
    categories: raw.categories || undefined,
    quantity: raw.quantity || undefined,
  }
}

export async function searchOFF(query: string): Promise<OFFProduct[]> {
  if (!query.trim()) return []
  try {
    const url =
      `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20` +
      `&fields=${OFF_FIELDS}`
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) })
    if (!res.ok) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as { products?: any[] }
    return (data.products ?? []).map(normalizeProduct).filter(Boolean) as OFFProduct[]
  } catch {
    return []
  }
}

export async function getProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const url = `${OFF_BASE}/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`
    const res = await fetch(url, { next: { revalidate: 604800 }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    return normalizeProduct(data.product)
  } catch {
    return null
  }
}

// Prefers _serving values, falls back to _100g × serving_quantity/100
function getNutrientValue(
  nutriments: OFFNutriments,
  servingKey: keyof OFFNutriments,
  per100Key: keyof OFFNutriments,
  servingQuantity: number,
  servingFactor: number
): number {
  const servingVal = nutriments[servingKey]
  if (servingVal != null) return (servingVal as number) * servingFactor

  const per100Val = nutriments[per100Key]
  if (per100Val != null) {
    return ((per100Val as number) * servingQuantity * servingFactor) / 100
  }
  return 0
}

export function parseOFFNutrients(product: OFFProduct, servings: number): NutritionFacts {
  const sq = product.serving_quantity ?? 100
  const n = product.nutriments

  const get = (sk: keyof OFFNutriments, pk: keyof OFFNutriments) =>
    getNutrientValue(n, sk, pk, sq, servings)

  return {
    calories: Math.round(get('energy-kcal_serving', 'energy-kcal_100g')),
    protein_g: Math.round(get('proteins_serving', 'proteins_100g') * 10) / 10,
    carbs_g: Math.round(get('carbohydrates_serving', 'carbohydrates_100g') * 10) / 10,
    fat_g: Math.round(get('fat_serving', 'fat_100g') * 10) / 10,
    fiber_g: Math.round(get('fiber_serving', 'fiber_100g') * 10) / 10,
    sugar_g: Math.round(get('sugars_serving', 'sugars_100g') * 10) / 10,
    sodium_mg: Math.round(get('sodium_serving', 'sodium_100g') * 1000 * servings),
    saturated_fat_g: Math.round(get('saturated-fat_serving', 'saturated-fat_100g') * 10) / 10,
    cholesterol_mg: 0,
  }
}

export function isSupplementProduct(product: OFFProduct): boolean {
  const cats = (product.categories ?? '').toLowerCase()
  return SUPPLEMENT_CATEGORIES.some((c) => cats.includes(c))
}
