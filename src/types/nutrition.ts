export interface NutritionFacts {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
  saturated_fat_g: number
  cholesterol_mg: number
  vitamin_d_mcg?: number
  calcium_mg?: number
  iron_mg?: number
  potassium_mg?: number
}

export interface FoodResult {
  id: string
  source: 'usda' | 'openfoodfacts' | 'custom' | 'recent' | 'frequent'
  name: string
  brand?: string
  servingSize: string
  servingQuantity: number
  servingUnit: string
  nutrition: NutritionFacts
  nutriscoreGrade?: string
  novaGroup?: number
  imageUrl?: string
  ingredients?: string
  isSupplementProduct?: boolean
  allergens?: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
}

export const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
  pre_workout: '⚡',
  post_workout: '💪',
}

export interface FoodLogEntry {
  id: string
  user_id: string
  food_id: string
  food_name: string
  brand: string | null
  meal_type: MealType
  servings: number
  serving_size_label: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
  saturated_fat_g: number
  is_supplement: boolean
  supplement_category: string | null
  notes: string | null
  image_url: string | null
  logged_at: string
  logged_time: string | null
  created_at: string
}

export interface DailyNutrition {
  date: string
  logs_by_meal: Partial<Record<MealType, FoodLogEntry[]>>
  daily_totals: NutritionFacts
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
  remaining: NutritionFacts
  water_ml: number
  water_goal_ml: number
}

export interface SupplementIngredient {
  name: string
  amount: string
  unit: string
  notes?: string
}

export interface SupplementAIAnalysis {
  what_it_does: string
  evidence_level: 'strong' | 'moderate' | 'limited' | 'none'
  recommended_timing: string
  recommended_dose: string
  synergistic_with: string[]
  cautions: string[]
  interactions: string[]
  apex_verdict: string
}

export interface SupplementItem {
  id: string
  user_id: string
  name: string
  brand: string | null
  supplement_type: string
  serving_size: string
  calories_per_serving: number
  protein_g_per_serving: number
  key_ingredients: SupplementIngredient[]
  timing_recommendation: string
  daily_timing: string[]
  ai_notes: string
  is_active: boolean
  food_log_id: string | null
  image_url: string | null
  added_at: string
}

export interface CustomFood {
  id: string
  user_id: string
  name: string
  brand: string | null
  serving_size: string
  serving_quantity: number | null
  serving_unit: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  is_supplement: boolean
  supplement_category: string | null
  barcode: string | null
  created_at: string
}

export interface WaterLog {
  id: string
  user_id: string
  amount_ml: number
  logged_at: string
}

export const EMPTY_NUTRITION: NutritionFacts = {
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

export function addNutrition(a: NutritionFacts, b: NutritionFacts): NutritionFacts {
  return {
    calories: a.calories + b.calories,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    fiber_g: a.fiber_g + b.fiber_g,
    sugar_g: a.sugar_g + b.sugar_g,
    sodium_mg: a.sodium_mg + b.sodium_mg,
    saturated_fat_g: a.saturated_fat_g + b.saturated_fat_g,
    cholesterol_mg: a.cholesterol_mg + b.cholesterol_mg,
    vitamin_d_mcg: (a.vitamin_d_mcg ?? 0) + (b.vitamin_d_mcg ?? 0),
    calcium_mg: (a.calcium_mg ?? 0) + (b.calcium_mg ?? 0),
    iron_mg: (a.iron_mg ?? 0) + (b.iron_mg ?? 0),
    potassium_mg: (a.potassium_mg ?? 0) + (b.potassium_mg ?? 0),
  }
}

export function multiplyNutrition(n: NutritionFacts, factor: number): NutritionFacts {
  return {
    calories: Math.round(n.calories * factor),
    protein_g: Math.round(n.protein_g * factor * 10) / 10,
    carbs_g: Math.round(n.carbs_g * factor * 10) / 10,
    fat_g: Math.round(n.fat_g * factor * 10) / 10,
    fiber_g: Math.round(n.fiber_g * factor * 10) / 10,
    sugar_g: Math.round(n.sugar_g * factor * 10) / 10,
    sodium_mg: Math.round(n.sodium_mg * factor),
    saturated_fat_g: Math.round(n.saturated_fat_g * factor * 10) / 10,
    cholesterol_mg: Math.round(n.cholesterol_mg * factor),
    vitamin_d_mcg: n.vitamin_d_mcg != null ? Math.round(n.vitamin_d_mcg * factor * 10) / 10 : undefined,
    calcium_mg: n.calcium_mg != null ? Math.round(n.calcium_mg * factor) : undefined,
    iron_mg: n.iron_mg != null ? Math.round(n.iron_mg * factor * 10) / 10 : undefined,
    potassium_mg: n.potassium_mg != null ? Math.round(n.potassium_mg * factor) : undefined,
  }
}

export function getLocalDate(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date()) // YYYY-MM-DD in local TZ
}
