export interface WorkoutSession {
  id: string
  user_id: string
  plan_day_reference: string | null
  session_name: string
  started_at: string
  completed_at: string | null
  duration_minutes: number | null
  total_volume_kg: number | null
  notes: string | null
  ai_feedback: string | null
  created_at: string
}

export interface WorkoutSet {
  id: string
  session_id: string
  user_id: string
  exercise_id: string
  exercise_name: string
  set_number: number
  target_reps: number | null
  actual_reps: number | null
  weight_kg: number | null
  weight_lbs: number | null
  rpe: number | null
  is_warmup: boolean
  completed: boolean
  notes: string | null
  logged_at: string
}

export interface ExerciseHistoryRecord {
  id: string
  user_id: string
  exercise_id: string
  exercise_name: string
  best_weight_kg: number
  best_reps: number
  total_sets_logged: number
  last_logged_at: string
  personal_record_set_at: string | null
}

export interface GeneratedWorkout {
  session_name: string
  estimated_duration: number
  warmup: WarmupCooldownItem[]
  main_work: MainWorkItem[]
  cooldown: WarmupCooldownItem[]
  session_notes: string
}

export interface WarmupCooldownItem {
  exercise_id: string
  exercise_name: string
  duration_or_reps?: string
  duration?: string
  notes: string
}

export interface MainWorkItem {
  exercise_id: string
  sets: number
  rep_range: string
  rest_seconds: number
  rpe_target: number
  superset_with: string | null
  coaching_notes: string
  modification_if_pain: string
}

export interface CompletionSummary {
  sessionId: string
  duration_minutes: number
  total_volume_kg: number
  total_volume_lbs: number
  exercises_count: number
  sets_count: number
  prs_broken: { exercise_name: string; weight_kg: number; reps: number }[]
  ai_feedback: string
}

export interface ActiveExercise {
  exercise_id: string
  exercise_name: string
  sets: number
  rep_range: string
  rest_seconds: number
  rpe_target: number
  coaching_notes: string
  modification_if_pain: string
  is_warmup?: boolean
  is_cooldown?: boolean
}

export interface LoggedSet {
  localId: string
  set_number: number
  weight: string
  actual_reps: string
  rpe: number | null
  completed: boolean
  synced: boolean
  dbId?: string
}
