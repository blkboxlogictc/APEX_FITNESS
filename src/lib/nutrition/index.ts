import type { FoodResult, NutritionFacts } from '@/types/nutrition'
import {
  searchUSDA,
  getFoodByFdcId,
  parseNutrients,
  getUSDAServingLabel,
  type USDAFood,
} from './usda'
import {
  searchOFF,
  getProductByBarcode,
  parseOFFNutrients,
  isSupplementProduct,
  type OFFProduct,
} from './openfoodfacts'

// ── Converters ────────────────────────────────────────────────────────────────

export function usdaToFoodResult(food: USDAFood): FoodResult {
  const servingLabel = getUSDAServingLabel(food)
  const servingQty = food.servingSize ?? 100
  const nutrition = parseNutrients(food, 1)

  return {
    id: `usda_${food.fdcId}`,
    source: 'usda',
    name: food.description.replace(/,\s*raw$/i, '').replace(/\s+/g, ' ').trim(),
    brand: food.brandName || food.brandOwner || undefined,
    servingSize: servingLabel,
    servingQuantity: servingQty,
    servingUnit: food.servingSizeUnit ?? 'g',
    nutrition,
    ingredients: food.ingredients,
  }
}

export function offToFoodResult(product: OFFProduct): FoodResult {
  const servingQty = product.serving_quantity ?? 100
  const nutrition = parseOFFNutrients(product, 1)

  return {
    id: `off_${product.code}`,
    source: 'openfoodfacts',
    name: product.product_name,
    brand: product.brands || undefined,
    servingSize: product.serving_size ?? `${servingQty}g`,
    servingQuantity: servingQty,
    servingUnit: 'g',
    nutrition,
    nutriscoreGrade: product.nutriscore_grade ?? undefined,
    novaGroup: product.nova_group ?? undefined,
    imageUrl: product.image_url ?? undefined,
    ingredients: product.ingredients_text ?? undefined,
    isSupplementProduct: isSupplementProduct(product),
    allergens: product.allergens ?? undefined,
  }
}

// ── Unified search ────────────────────────────────────────────────────────────

export async function searchFoods(
  query: string,
  recentFoods: FoodResult[] = [],
  frequentFoods: FoodResult[] = []
): Promise<FoodResult[]> {
  if (!query.trim()) {
    return [...recentFoods, ...frequentFoods].slice(0, 30)
  }

  // Search USDA and OFF in parallel (with OFF timeout already handled in the lib)
  const [usdaResults, offResults] = await Promise.all([
    searchUSDA(query, 20),
    searchOFF(query),
  ])

  const allResults: FoodResult[] = [
    ...recentFoods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5),
    ...usdaResults.map(usdaToFoodResult),
    ...offResults.map(offToFoodResult),
  ]

  // Deduplicate by id
  const seen = new Set<string>()
  const deduped = allResults.filter((f) => {
    if (seen.has(f.id)) return false
    seen.add(f.id)
    return true
  })

  return deduped.slice(0, 30)
}

// ── By ID ─────────────────────────────────────────────────────────────────────

export async function getFoodById(id: string): Promise<FoodResult | null> {
  if (id.startsWith('usda_')) {
    const fdcId = parseInt(id.replace('usda_', ''))
    if (isNaN(fdcId)) return null
    const food = await getFoodByFdcId(fdcId)
    if (!food) return null
    return usdaToFoodResult(food)
  }

  if (id.startsWith('off_')) {
    const barcode = id.replace('off_', '')
    const product = await getProductByBarcode(barcode)
    if (!product) return null
    return offToFoodResult(product)
  }

  return null
}

export async function getFoodByBarcode(barcode: string): Promise<FoodResult | null> {
  const product = await getProductByBarcode(barcode)
  if (!product) return null
  return offToFoodResult(product)
}

// ── Nutrition helpers ─────────────────────────────────────────────────────────

export function scaleNutrition(base: NutritionFacts, servings: number): NutritionFacts {
  const round1 = (n: number) => Math.round(n * 10) / 10
  return {
    calories: Math.round(base.calories * servings),
    protein_g: round1(base.protein_g * servings),
    carbs_g: round1(base.carbs_g * servings),
    fat_g: round1(base.fat_g * servings),
    fiber_g: round1(base.fiber_g * servings),
    sugar_g: round1(base.sugar_g * servings),
    sodium_mg: Math.round(base.sodium_mg * servings),
    saturated_fat_g: round1(base.saturated_fat_g * servings),
    cholesterol_mg: Math.round(base.cholesterol_mg * servings),
    vitamin_d_mcg: base.vitamin_d_mcg != null ? round1(base.vitamin_d_mcg * servings) : undefined,
    calcium_mg: base.calcium_mg != null ? Math.round(base.calcium_mg * servings) : undefined,
    iron_mg: base.iron_mg != null ? round1(base.iron_mg * servings) : undefined,
    potassium_mg: base.potassium_mg != null ? Math.round(base.potassium_mg * servings) : undefined,
  }
}
