export interface MealStructureItem {
  meal_name: string
  time_suggestion: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  example_foods: string[]
  notes?: string
}

export interface NutritionPlan {
  id: string
  user_id: string
  version: number
  daily_calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_structure: MealStructureItem[]
  notes: string
  generated_from_context?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  rest_seconds: number
  rpe?: string
  coaching_notes?: string
  modifications?: string | null
}

export interface WorkoutDay {
  day: string
  focus: string
  session_duration_min: number | null
  warmup: string[]
  exercises: Exercise[]
  cooldown: string[]
  active_recovery_suggestions?: string[]
}

export interface FitnessPlan {
  id: string
  user_id: string
  version: number
  plan_name: string
  days_per_week: number
  weekly_structure: WorkoutDay[]
  periodization_notes: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlanEditHistory {
  id: string
  user_id: string
  plan_type: 'nutrition' | 'fitness' | 'both'
  plan_id: string
  version_before: number
  version_after: number
  user_message: string
  ai_response: string
  diff_summary: string
  created_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  has_plan_edit: boolean
  plan_edit_id?: string | null
  created_at: string
  // local-only fields
  pending?: boolean
  streamingContent?: string
  planEditDetail?: PlanEditHistory | null
}

export interface PlanPatch {
  type: 'nutrition' | 'fitness' | 'both'
  changes: Record<string, unknown>
  change_summary: string
}

export interface GeneratedPlans {
  nutrition_plan: Omit<NutritionPlan, 'id' | 'user_id' | 'version' | 'is_active' | 'created_at' | 'updated_at'>
  fitness_plan: Omit<FitnessPlan, 'id' | 'user_id' | 'version' | 'is_active' | 'created_at' | 'updated_at'>
}
