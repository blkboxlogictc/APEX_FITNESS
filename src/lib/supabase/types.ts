import type { MealStructureItem, WorkoutDay } from '@/types/plans'

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          age: number | null
          sex: string | null
          height_cm: number | null
          weight_kg: number | null
          fitness_goal: string | null
          experience_level: string | null
          days_per_week: number | null
          available_equipment: string[] | null
          sports_activities: string[] | null
          specific_goal: string | null
          injuries_limitations: string | null
          personal_context: string | null
          weight_unit: string | null
          onboarding_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          age?: number | null
          sex?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          fitness_goal?: string | null
          experience_level?: string | null
          days_per_week?: number | null
          available_equipment?: string[] | null
          sports_activities?: string[] | null
          specific_goal?: string | null
          injuries_limitations?: string | null
          personal_context?: string | null
          weight_unit?: string | null
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          age?: number | null
          sex?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          fitness_goal?: string | null
          experience_level?: string | null
          days_per_week?: number | null
          available_equipment?: string[] | null
          sports_activities?: string[] | null
          specific_goal?: string | null
          injuries_limitations?: string | null
          personal_context?: string | null
          weight_unit?: string | null
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_plans: {
        Row: {
          id: string
          user_id: string
          version: number
          daily_calories: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          meal_structure: MealStructureItem[]
          notes: string | null
          generated_from_context: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          version?: number
          daily_calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          meal_structure?: MealStructureItem[]
          notes?: string | null
          generated_from_context?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          version?: number
          daily_calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          meal_structure?: MealStructureItem[]
          notes?: string | null
          generated_from_context?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fitness_plans: {
        Row: {
          id: string
          user_id: string
          version: number
          plan_name: string | null
          days_per_week: number | null
          weekly_structure: WorkoutDay[]
          periodization_notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          version?: number
          plan_name?: string | null
          days_per_week?: number | null
          weekly_structure?: WorkoutDay[]
          periodization_notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          version?: number
          plan_name?: string | null
          days_per_week?: number | null
          weekly_structure?: WorkoutDay[]
          periodization_notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_edit_history: {
        Row: {
          id: string
          user_id: string
          plan_type: string
          plan_id: string
          version_before: number
          version_after: number
          user_message: string | null
          ai_response: string | null
          diff_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_type: string
          plan_id: string
          version_before: number
          version_after: number
          user_message?: string | null
          ai_response?: string | null
          diff_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: string
          plan_id?: string
          version_before?: number
          version_after?: number
          user_message?: string | null
          ai_response?: string | null
          diff_summary?: string | null
          created_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: string
          content: string
          has_plan_edit: boolean
          plan_edit_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          content: string
          has_plan_edit?: boolean
          plan_edit_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          content?: string
          has_plan_edit?: boolean
          plan_edit_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          plan_day_reference?: string | null
          session_name: string
          started_at?: string
          completed_at?: string | null
          duration_minutes?: number | null
          total_volume_kg?: number | null
          notes?: string | null
          ai_feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_day_reference?: string | null
          session_name?: string
          started_at?: string
          completed_at?: string | null
          duration_minutes?: number | null
          total_volume_kg?: number | null
          notes?: string | null
          ai_feedback?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
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
        Insert: {
          id?: string
          session_id: string
          user_id: string
          exercise_id: string
          exercise_name: string
          set_number: number
          target_reps?: number | null
          actual_reps?: number | null
          weight_kg?: number | null
          weight_lbs?: number | null
          rpe?: number | null
          is_warmup?: boolean
          completed?: boolean
          notes?: string | null
          logged_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          exercise_id?: string
          exercise_name?: string
          set_number?: number
          target_reps?: number | null
          actual_reps?: number | null
          weight_kg?: number | null
          weight_lbs?: number | null
          rpe?: number | null
          is_warmup?: boolean
          completed?: boolean
          notes?: string | null
          logged_at?: string
        }
        Relationships: []
      }
      exercise_history: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          exercise_id: string
          exercise_name: string
          best_weight_kg?: number
          best_reps?: number
          total_sets_logged?: number
          last_logged_at?: string
          personal_record_set_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          exercise_id?: string
          exercise_name?: string
          best_weight_kg?: number
          best_reps?: number
          total_sets_logged?: number
          last_logged_at?: string
          personal_record_set_at?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          activity_id: string
          activity_name: string
          category: string
          duration_minutes: number
          calories_burned: number
          met_value: number
          notes: string | null
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_id: string
          activity_name: string
          category: string
          duration_minutes: number
          calories_burned?: number
          met_value?: number
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_id?: string
          activity_name?: string
          category?: string
          duration_minutes?: number
          calories_burned?: number
          met_value?: number
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
        Relationships: []
      }
      activity_goals: {
        Row: {
          id: string
          user_id: string
          weekly_active_minutes: number
          weekly_sessions: number
          daily_calorie_burn: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weekly_active_minutes?: number
          weekly_sessions?: number
          daily_calorie_burn?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weekly_active_minutes?: number
          weekly_sessions?: number
          daily_calorie_burn?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sport_programs: {
        Row: {
          id: string
          user_id: string
          sport: string
          program_name: string
          weekly_sessions: number
          duration_weeks: number
          weekly_structure: Record<string, unknown>[]
          coaching_notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sport: string
          program_name: string
          weekly_sessions?: number
          duration_weeks?: number
          weekly_structure?: Record<string, unknown>[]
          coaching_notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sport?: string
          program_name?: string
          weekly_sessions?: number
          duration_weeks?: number
          weekly_structure?: Record<string, unknown>[]
          coaching_notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          id: string
          user_id: string
          food_id: string
          food_name: string
          brand: string | null
          meal_type: string
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
          meal_photo_session_id: string | null
          logged_at: string
          logged_time: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          food_id: string
          food_name: string
          brand?: string | null
          meal_type: string
          servings?: number
          serving_size_label?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          fiber_g?: number
          sugar_g?: number
          sodium_mg?: number
          saturated_fat_g?: number
          is_supplement?: boolean
          supplement_category?: string | null
          notes?: string | null
          image_url?: string | null
          meal_photo_session_id?: string | null
          logged_at?: string
          logged_time?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          food_id?: string
          food_name?: string
          brand?: string | null
          meal_type?: string
          servings?: number
          serving_size_label?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          fiber_g?: number
          sugar_g?: number
          sodium_mg?: number
          saturated_fat_g?: number
          is_supplement?: boolean
          supplement_category?: string | null
          notes?: string | null
          image_url?: string | null
          meal_photo_session_id?: string | null
          logged_at?: string
          logged_time?: string | null
          created_at?: string
        }
        Relationships: []
      }
      custom_foods: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          name: string
          brand?: string | null
          serving_size?: string
          serving_quantity?: number | null
          serving_unit?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          fiber_g?: number | null
          sugar_g?: number | null
          sodium_mg?: number | null
          is_supplement?: boolean
          supplement_category?: string | null
          barcode?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brand?: string | null
          serving_size?: string
          serving_quantity?: number | null
          serving_unit?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          fiber_g?: number | null
          sugar_g?: number | null
          sodium_mg?: number | null
          is_supplement?: boolean
          supplement_category?: string | null
          barcode?: string | null
          created_at?: string
        }
        Relationships: []
      }
      supplement_stack: {
        Row: {
          id: string
          user_id: string
          name: string
          brand: string | null
          supplement_type: string
          serving_size: string
          calories_per_serving: number
          protein_g_per_serving: number
          key_ingredients: Record<string, unknown>[]
          timing_recommendation: string
          daily_timing: string[]
          ai_notes: string
          is_active: boolean
          food_log_id: string | null
          image_url: string | null
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          brand?: string | null
          supplement_type: string
          serving_size?: string
          calories_per_serving?: number
          protein_g_per_serving?: number
          key_ingredients?: Record<string, unknown>[]
          timing_recommendation?: string
          daily_timing?: string[]
          ai_notes?: string
          is_active?: boolean
          food_log_id?: string | null
          image_url?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brand?: string | null
          supplement_type?: string
          serving_size?: string
          calories_per_serving?: number
          protein_g_per_serving?: number
          key_ingredients?: Record<string, unknown>[]
          timing_recommendation?: string
          daily_timing?: string[]
          ai_notes?: string
          is_active?: boolean
          food_log_id?: string | null
          image_url?: string | null
          added_at?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          id: string
          user_id: string
          amount_ml: number
          logged_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_ml: number
          logged_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount_ml?: number
          logged_at?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          id: string
          user_id: string
          storage_path: string
          public_url: string | null
          photo_date: string
          weight_kg: number | null
          body_fat_pct: number | null
          notes: string | null
          tags: string[]
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          storage_path: string
          public_url?: string | null
          photo_date?: string
          weight_kg?: number | null
          body_fat_pct?: number | null
          notes?: string | null
          tags?: string[]
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          storage_path?: string
          public_url?: string | null
          photo_date?: string
          weight_kg?: number | null
          body_fat_pct?: number | null
          notes?: string | null
          tags?: string[]
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      pain_screenings: {
        Row: {
          id: string
          user_id: string
          joint: string
          side: string
          pain_level: number
          pain_description: Record<string, unknown>
          ai_assessment: string | null
          red_flags_detected: boolean
          referral_recommended: boolean
          recommended_program_id: string | null
          context: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          joint: string
          side: string
          pain_level: number
          pain_description?: Record<string, unknown>
          ai_assessment?: string | null
          red_flags_detected?: boolean
          referral_recommended?: boolean
          recommended_program_id?: string | null
          context?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          joint?: string
          side?: string
          pain_level?: number
          pain_description?: Record<string, unknown>
          ai_assessment?: string | null
          red_flags_detected?: boolean
          referral_recommended?: boolean
          recommended_program_id?: string | null
          context?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      prehab_programs: {
        Row: {
          id: string
          user_id: string
          program_name: string
          target_joints: string[]
          program_type: string
          exercises: Record<string, unknown>[]
          frequency_per_week: number
          estimated_duration_minutes: number
          ai_rationale: string | null
          pain_screening_id: string | null
          weeks_prescribed: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          program_name: string
          target_joints?: string[]
          program_type?: string
          exercises?: Record<string, unknown>[]
          frequency_per_week?: number
          estimated_duration_minutes?: number
          ai_rationale?: string | null
          pain_screening_id?: string | null
          weeks_prescribed?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          program_name?: string
          target_joints?: string[]
          program_type?: string
          exercises?: Record<string, unknown>[]
          frequency_per_week?: number
          estimated_duration_minutes?: number
          ai_rationale?: string | null
          pain_screening_id?: string | null
          weeks_prescribed?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      prehab_logs: {
        Row: {
          id: string
          user_id: string
          program_id: string
          duration_minutes: number
          exercises_completed: Record<string, unknown>[]
          pain_level_before: number
          pain_level_after: number
          notes: string | null
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          program_id: string
          duration_minutes?: number
          exercises_completed?: Record<string, unknown>[]
          pain_level_before?: number
          pain_level_after?: number
          notes?: string | null
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          program_id?: string
          duration_minutes?: number
          exercises_completed?: Record<string, unknown>[]
          pain_level_before?: number
          pain_level_after?: number
          notes?: string | null
          completed_at?: string
        }
        Relationships: []
      }
      movement_assessments: {
        Row: {
          id: string
          user_id: string
          assessment_type: string
          results: Record<string, unknown>[]
          ai_summary: string
          priority_corrections: string[]
          score: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          assessment_type: string
          results?: Record<string, unknown>[]
          ai_summary?: string
          priority_corrections?: string[]
          score?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          assessment_type?: string
          results?: Record<string, unknown>[]
          ai_summary?: string
          priority_corrections?: string[]
          score?: number
          created_at?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          id: string
          user_id: string
          measured_at: string
          weight_kg: number | null
          body_fat_percent: number | null
          muscle_mass_kg: number | null
          measurements: Record<string, number>
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          measured_at?: string
          weight_kg?: number | null
          body_fat_percent?: number | null
          muscle_mass_kg?: number | null
          measurements?: Record<string, number>
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          measured_at?: string
          weight_kg?: number | null
          body_fat_percent?: number | null
          muscle_mass_kg?: number | null
          measurements?: Record<string, number>
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      weekly_recaps: {
        Row: {
          id: string
          user_id: string
          week_start: string
          week_end: string
          recap_data: Record<string, unknown>
          ai_narrative: string | null
          headline: string | null
          highlights: string[]
          focus_areas: string[]
          apex_score: number
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          week_end: string
          recap_data?: Record<string, unknown>
          ai_narrative?: string | null
          headline?: string | null
          highlights?: string[]
          focus_areas?: string[]
          apex_score?: number
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start?: string
          week_end?: string
          recap_data?: Record<string, unknown>
          ai_narrative?: string | null
          headline?: string | null
          highlights?: string[]
          focus_areas?: string[]
          apex_score?: number
          generated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          user_id: string
          goal_type: string
          title: string
          description: string | null
          target_value: number | null
          target_unit: string | null
          target_date: string | null
          current_value: number | null
          start_value: number | null
          exercise_id: string | null
          is_active: boolean
          is_achieved: boolean
          achieved_at: string | null
          coach_note: string | null
          milestones: Record<string, unknown>[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_type: string
          title: string
          description?: string | null
          target_value?: number | null
          target_unit?: string | null
          target_date?: string | null
          current_value?: number | null
          start_value?: number | null
          exercise_id?: string | null
          is_active?: boolean
          is_achieved?: boolean
          achieved_at?: string | null
          coach_note?: string | null
          milestones?: Record<string, unknown>[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_type?: string
          title?: string
          description?: string | null
          target_value?: number | null
          target_unit?: string | null
          target_date?: string | null
          current_value?: number | null
          start_value?: number | null
          exercise_id?: string | null
          is_active?: boolean
          is_achieved?: boolean
          achieved_at?: string | null
          coach_note?: string | null
          milestones?: Record<string, unknown>[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          device_name: string | null
          user_agent: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          device_name?: string | null
          user_agent?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth_key?: string
          device_name?: string | null
          user_agent?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          workout_reminders: boolean
          workout_reminder_time: string
          workout_reminder_days: number[]
          nutrition_reminders: boolean
          meal_reminder_times: string[]
          prehab_reminders: boolean
          weekly_recap_notification: boolean
          coach_proactive_messages: boolean
          supplement_reminders: boolean
          supplement_reminder_time: string
          water_reminders: boolean
          water_reminder_interval_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workout_reminders?: boolean
          workout_reminder_time?: string
          workout_reminder_days?: number[]
          nutrition_reminders?: boolean
          meal_reminder_times?: string[]
          prehab_reminders?: boolean
          weekly_recap_notification?: boolean
          coach_proactive_messages?: boolean
          supplement_reminders?: boolean
          supplement_reminder_time?: string
          water_reminders?: boolean
          water_reminder_interval_hours?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workout_reminders?: boolean
          workout_reminder_time?: string
          workout_reminder_days?: number[]
          nutrition_reminders?: boolean
          meal_reminder_times?: string[]
          prehab_reminders?: boolean
          weekly_recap_notification?: boolean
          coach_proactive_messages?: boolean
          supplement_reminders?: boolean
          supplement_reminder_time?: string
          water_reminders?: boolean
          water_reminder_interval_hours?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
