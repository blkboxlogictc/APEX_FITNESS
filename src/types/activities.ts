export interface ActivityLog {
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

export interface ActivityGoal {
  id: string
  user_id: string
  weekly_active_minutes: number
  weekly_sessions: number
  daily_calorie_burn: number
  created_at: string
  updated_at: string
}

export interface SportProgramDay {
  day: string
  focus: string
  activities: {
    name: string
    duration_minutes: number
    intensity: string
    notes?: string
  }[]
}

export interface SportProgram {
  id: string
  user_id: string
  sport: string
  program_name: string
  weekly_sessions: number
  duration_weeks: number
  weekly_structure: SportProgramDay[]
  coaching_notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ActivityStats {
  this_week: { active_minutes: number; calories_burned: number; sessions: number }
  this_month: { active_minutes: number; calories_burned: number; sessions: number }
  all_time: { active_minutes: number; calories_burned: number; sessions: number }
  daily_minutes: { date: string; minutes: number }[]
  weekly_goal: { active_minutes: number; sessions: number }
}
