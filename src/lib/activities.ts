export type ActivityCategory =
  | 'gym'
  | 'outdoor'
  | 'team_sports'
  | 'racket_sports'
  | 'water'
  | 'winter'
  | 'combat'
  | 'cycling'
  | 'running'
  | 'walking'
  | 'yoga_flexibility'
  | 'daily_life'

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  gym: 'Gym',
  outdoor: 'Outdoor',
  team_sports: 'Team Sports',
  racket_sports: 'Racket Sports',
  water: 'Water Sports',
  winter: 'Winter Sports',
  combat: 'Combat Sports',
  cycling: 'Cycling',
  running: 'Running',
  walking: 'Walking',
  yoga_flexibility: 'Yoga & Flexibility',
  daily_life: 'Daily Life',
}

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  gym: '#6C63FF',
  outdoor: '#00D4AA',
  team_sports: '#FF6B35',
  racket_sports: '#FFB347',
  water: '#4FC3F7',
  winter: '#81D4FA',
  combat: '#EF5350',
  cycling: '#AB47BC',
  running: '#26A69A',
  walking: '#66BB6A',
  yoga_flexibility: '#EC407A',
  daily_life: '#8D6E63',
}

export const CATEGORY_EMOJIS: Record<ActivityCategory, string> = {
  gym: '🏋️',
  outdoor: '🌲',
  team_sports: '🏀',
  racket_sports: '🎾',
  water: '🏊',
  winter: '⛷️',
  combat: '🥊',
  cycling: '🚴',
  running: '🏃',
  walking: '🚶',
  yoga_flexibility: '🧘',
  daily_life: '🏠',
}

export interface Activity {
  id: string
  name: string
  category: ActivityCategory
  met: number
  description?: string
  apiNinjasQuery?: string
}

export interface SportTrainingContext {
  sport: string
  focusAreas: string[]
  recommendedActivities: string[]
  periodizationNote: string
  keyMetrics: string[]
}

export const ACTIVITIES: Activity[] = [
  // ── WALKING ──────────────────────────────────────────────────────────────
  { id: 'walking_slow', name: 'Walking 2.0 mph (slow)', category: 'walking', met: 2.5 },
  { id: 'walking_moderate', name: 'Walking 3.0 mph', category: 'walking', met: 3.5 },
  { id: 'walking_brisk', name: 'Walking 3.5 mph (brisk)', category: 'walking', met: 4.3 },
  { id: 'walking_fast', name: 'Walking 4.0 mph (fast)', category: 'walking', met: 5.0 },
  { id: 'walking_uphill', name: 'Walking uphill', category: 'walking', met: 6.0 },
  { id: 'hiking', name: 'Hiking', category: 'walking', met: 6.0, apiNinjasQuery: 'hiking' },
  { id: 'hiking_with_pack', name: 'Hiking with backpack', category: 'walking', met: 7.8 },
  { id: 'walking_dog', name: 'Walking the dog', category: 'walking', met: 3.0 },

  // ── RUNNING ──────────────────────────────────────────────────────────────
  { id: 'jogging', name: 'Jogging, general', category: 'running', met: 7.0, apiNinjasQuery: 'jogging' },
  { id: 'running_5mph', name: 'Running 5 mph (12 min/mi)', category: 'running', met: 8.3, apiNinjasQuery: 'running' },
  { id: 'running_6mph', name: 'Running 6 mph (10 min/mi)', category: 'running', met: 9.8 },
  { id: 'running_7mph', name: 'Running 7 mph (8.5 min/mi)', category: 'running', met: 11.0 },
  { id: 'running_8mph', name: 'Running 8 mph (7.5 min/mi)', category: 'running', met: 11.8 },
  { id: 'running_9mph', name: 'Running 9 mph (6.5 min/mi)', category: 'running', met: 12.8 },
  { id: 'running_10mph', name: 'Running 10+ mph (6 min/mi)', category: 'running', met: 14.5 },
  { id: 'trail_running', name: 'Trail running', category: 'running', met: 9.0 },

  // ── CYCLING ──────────────────────────────────────────────────────────────
  { id: 'cycling_leisure', name: 'Cycling < 10 mph (leisure)', category: 'cycling', met: 4.0 },
  { id: 'cycling_moderate', name: 'Cycling 12–14 mph (moderate)', category: 'cycling', met: 8.0 },
  { id: 'cycling_vigorous', name: 'Cycling 14–16 mph (vigorous)', category: 'cycling', met: 10.0 },
  { id: 'cycling_very_fast', name: 'Cycling 16–19 mph (racing)', category: 'cycling', met: 12.0 },
  { id: 'cycling_racing', name: 'Cycling 20+ mph (competitive)', category: 'cycling', met: 15.8 },
  { id: 'mountain_biking', name: 'Mountain biking', category: 'cycling', met: 8.5 },
  { id: 'stationary_bike_moderate', name: 'Stationary bike, moderate', category: 'cycling', met: 7.0 },
  { id: 'stationary_bike_vigorous', name: 'Stationary bike, vigorous', category: 'cycling', met: 10.5 },
  { id: 'spin_class', name: 'Spin / cycle class', category: 'cycling', met: 8.5 },

  // ── GYM ──────────────────────────────────────────────────────────────────
  { id: 'weightlifting', name: 'Weightlifting, general', category: 'gym', met: 3.5, apiNinjasQuery: 'weight lifting' },
  { id: 'strength_training_vigorous', name: 'Strength training, vigorous', category: 'gym', met: 6.0 },
  { id: 'circuit_training', name: 'Circuit training', category: 'gym', met: 8.0 },
  { id: 'hiit', name: 'HIIT', category: 'gym', met: 8.0, apiNinjasQuery: 'high intensity interval training' },
  { id: 'rowing_machine_moderate', name: 'Rowing machine, moderate', category: 'gym', met: 7.0 },
  { id: 'rowing_machine_vigorous', name: 'Rowing machine, vigorous', category: 'gym', met: 8.5 },
  { id: 'elliptical_moderate', name: 'Elliptical, moderate', category: 'gym', met: 5.0 },
  { id: 'elliptical_vigorous', name: 'Elliptical, vigorous', category: 'gym', met: 7.0 },
  { id: 'stair_climbing', name: 'Stair climbing machine', category: 'gym', met: 8.8 },
  { id: 'jump_rope', name: 'Jump rope', category: 'gym', met: 10.0, apiNinjasQuery: 'jumping rope' },
  { id: 'aerobics_class', name: 'Aerobics class', category: 'gym', met: 7.3 },
  { id: 'crossfit', name: 'CrossFit', category: 'gym', met: 9.0 },
  { id: 'treadmill_walking', name: 'Treadmill walking', category: 'gym', met: 5.0 },
  { id: 'treadmill_running', name: 'Treadmill running', category: 'gym', met: 8.0 },

  // ── OUTDOOR ──────────────────────────────────────────────────────────────
  { id: 'rock_climbing_indoor', name: 'Rock climbing, indoor', category: 'outdoor', met: 7.5 },
  { id: 'rock_climbing_outdoor', name: 'Rock climbing, outdoor', category: 'outdoor', met: 8.0, apiNinjasQuery: 'rock climbing' },
  { id: 'golf_walking', name: 'Golf, walking with clubs', category: 'outdoor', met: 4.3, apiNinjasQuery: 'golf' },
  { id: 'golf_cart', name: 'Golf, riding cart', category: 'outdoor', met: 2.5 },
  { id: 'rollerblading', name: 'Rollerblading / inline skating', category: 'outdoor', met: 9.8, apiNinjasQuery: 'rollerblading' },
  { id: 'skateboarding', name: 'Skateboarding', category: 'outdoor', met: 5.0 },
  { id: 'frisbee', name: 'Frisbee / ultimate frisbee', category: 'outdoor', met: 3.5 },

  // ── TEAM SPORTS ──────────────────────────────────────────────────────────
  { id: 'basketball_game', name: 'Basketball, game', category: 'team_sports', met: 8.0, apiNinjasQuery: 'basketball' },
  { id: 'basketball_recreational', name: 'Basketball, shooting around', category: 'team_sports', met: 4.5 },
  { id: 'soccer_competitive', name: 'Soccer, competitive', category: 'team_sports', met: 10.0, apiNinjasQuery: 'soccer' },
  { id: 'soccer_recreational', name: 'Soccer, recreational', category: 'team_sports', met: 7.0 },
  { id: 'volleyball_recreational', name: 'Volleyball, recreational', category: 'team_sports', met: 3.5, apiNinjasQuery: 'volleyball' },
  { id: 'volleyball_competitive', name: 'Volleyball, competitive', category: 'team_sports', met: 7.0 },
  { id: 'baseball_softball', name: 'Baseball / softball', category: 'team_sports', met: 4.5, apiNinjasQuery: 'baseball' },
  { id: 'football_competitive', name: 'Football, competitive', category: 'team_sports', met: 8.0, apiNinjasQuery: 'football' },
  { id: 'flag_football', name: 'Flag football', category: 'team_sports', met: 7.0 },
  { id: 'rugby', name: 'Rugby', category: 'team_sports', met: 8.3, apiNinjasQuery: 'rugby' },
  { id: 'ice_hockey', name: 'Ice hockey', category: 'team_sports', met: 8.0, apiNinjasQuery: 'ice hockey' },
  { id: 'lacrosse', name: 'Lacrosse', category: 'team_sports', met: 8.0, apiNinjasQuery: 'lacrosse' },

  // ── RACKET SPORTS ────────────────────────────────────────────────────────
  { id: 'tennis_singles', name: 'Tennis, singles', category: 'racket_sports', met: 8.0, apiNinjasQuery: 'tennis' },
  { id: 'tennis_doubles', name: 'Tennis, doubles', category: 'racket_sports', met: 5.0 },
  { id: 'pickleball', name: 'Pickleball', category: 'racket_sports', met: 4.0, apiNinjasQuery: 'pickleball' },
  { id: 'squash', name: 'Squash', category: 'racket_sports', met: 12.0, apiNinjasQuery: 'squash' },
  { id: 'badminton_recreational', name: 'Badminton, recreational', category: 'racket_sports', met: 4.5, apiNinjasQuery: 'badminton' },
  { id: 'badminton_competitive', name: 'Badminton, competitive', category: 'racket_sports', met: 7.0 },
  { id: 'racquetball', name: 'Racquetball', category: 'racket_sports', met: 7.0, apiNinjasQuery: 'racquetball' },
  { id: 'table_tennis', name: 'Table tennis / ping pong', category: 'racket_sports', met: 4.0, apiNinjasQuery: 'ping pong' },

  // ── WATER ────────────────────────────────────────────────────────────────
  { id: 'swimming_leisurely', name: 'Swimming, leisurely', category: 'water', met: 6.0, apiNinjasQuery: 'swimming' },
  { id: 'swimming_moderate', name: 'Swimming freestyle, moderate', category: 'water', met: 8.3 },
  { id: 'swimming_vigorous', name: 'Swimming freestyle, vigorous', category: 'water', met: 9.8 },
  { id: 'swimming_backstroke', name: 'Swimming backstroke', category: 'water', met: 7.0 },
  { id: 'water_polo', name: 'Water polo', category: 'water', met: 10.0, apiNinjasQuery: 'water polo' },
  { id: 'kayaking', name: 'Kayaking', category: 'water', met: 5.0, apiNinjasQuery: 'kayaking' },
  { id: 'canoeing', name: 'Canoeing, leisurely', category: 'water', met: 3.5 },
  { id: 'open_water_rowing', name: 'Rowing on water', category: 'water', met: 12.0, apiNinjasQuery: 'rowing' },
  { id: 'surfing', name: 'Surfing', category: 'water', met: 3.0, apiNinjasQuery: 'surfing' },
  { id: 'stand_up_paddleboarding', name: 'Stand-up paddleboarding (SUP)', category: 'water', met: 6.0 },

  // ── WINTER ───────────────────────────────────────────────────────────────
  { id: 'skiing_downhill', name: 'Skiing, downhill', category: 'winter', met: 5.3, apiNinjasQuery: 'skiing' },
  { id: 'skiing_cross_country_moderate', name: 'Cross-country skiing, moderate', category: 'winter', met: 7.0 },
  { id: 'skiing_cross_country_vigorous', name: 'Cross-country skiing, vigorous', category: 'winter', met: 12.5 },
  { id: 'snowboarding', name: 'Snowboarding', category: 'winter', met: 4.3, apiNinjasQuery: 'snowboarding' },
  { id: 'ice_skating_recreational', name: 'Ice skating, recreational', category: 'winter', met: 5.5, apiNinjasQuery: 'ice skating' },
  { id: 'ice_skating_vigorous', name: 'Ice skating, vigorous / speed', category: 'winter', met: 9.0 },
  { id: 'snowshoeing', name: 'Snowshoeing', category: 'winter', met: 8.0, apiNinjasQuery: 'snowshoeing' },

  // ── COMBAT ───────────────────────────────────────────────────────────────
  { id: 'boxing_bag_work', name: 'Boxing, bag work / training', category: 'combat', met: 7.8, apiNinjasQuery: 'boxing' },
  { id: 'boxing_sparring', name: 'Boxing, sparring', category: 'combat', met: 11.0 },
  { id: 'bjj', name: 'Brazilian Jiu-Jitsu (BJJ)', category: 'combat', met: 10.3, apiNinjasQuery: 'martial arts' },
  { id: 'mma_training', name: 'MMA training', category: 'combat', met: 10.5 },
  { id: 'wrestling', name: 'Wrestling', category: 'combat', met: 8.0, apiNinjasQuery: 'wrestling' },
  { id: 'muay_thai', name: 'Muay Thai / Kickboxing', category: 'combat', met: 9.5 },
  { id: 'judo', name: 'Judo', category: 'combat', met: 10.3 },
  { id: 'karate', name: 'Karate', category: 'combat', met: 10.0 },

  // ── YOGA & FLEXIBILITY ───────────────────────────────────────────────────
  { id: 'yoga_gentle', name: 'Yoga, gentle / Hatha', category: 'yoga_flexibility', met: 2.5, apiNinjasQuery: 'yoga' },
  { id: 'yoga_power', name: 'Yoga, power / Vinyasa', category: 'yoga_flexibility', met: 4.0 },
  { id: 'yoga_hot', name: 'Hot yoga / Bikram', category: 'yoga_flexibility', met: 5.0 },
  { id: 'pilates', name: 'Pilates', category: 'yoga_flexibility', met: 3.0, apiNinjasQuery: 'pilates' },
  { id: 'stretching', name: 'Stretching / flexibility', category: 'yoga_flexibility', met: 2.3 },
  { id: 'foam_rolling', name: 'Foam rolling / myofascial release', category: 'yoga_flexibility', met: 1.5 },
  { id: 'tai_chi', name: 'Tai Chi', category: 'yoga_flexibility', met: 3.0, apiNinjasQuery: 'tai chi' },

  // ── DAILY LIFE ───────────────────────────────────────────────────────────
  { id: 'gardening', name: 'Gardening', category: 'daily_life', met: 3.5 },
  { id: 'house_cleaning', name: 'House cleaning, moderate', category: 'daily_life', met: 2.5 },
  { id: 'yard_work', name: 'Yard work / mowing lawn', category: 'daily_life', met: 5.5 },
  { id: 'dancing_general', name: 'Dancing, general', category: 'daily_life', met: 4.5 },
  { id: 'dancing_vigorous', name: 'Dancing, vigorous / Zumba', category: 'daily_life', met: 6.0, apiNinjasQuery: 'zumba' },
  { id: 'playing_with_kids', name: 'Playing with kids (active)', category: 'daily_life', met: 4.0 },
]

// ── Utility functions ─────────────────────────────────────────────────────────

export function calculateCaloriesBurned(met: number, weightKg: number, durationMinutes: number): number {
  return Math.round(met * weightKg * (durationMinutes / 60))
}

export function getActivitiesByCategory(): Map<ActivityCategory, Activity[]> {
  const map = new Map<ActivityCategory, Activity[]>()
  for (const activity of ACTIVITIES) {
    if (!map.has(activity.category)) map.set(activity.category, [])
    map.get(activity.category)!.push(activity)
  }
  return map
}

export function searchActivities(query: string): Activity[] {
  const q = query.toLowerCase().trim()
  if (!q) return ACTIVITIES
  return ACTIVITIES.filter(
    (a) => a.name.toLowerCase().includes(q) || CATEGORY_LABELS[a.category].toLowerCase().includes(q)
  )
}

export function getActivityById(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}

export function getActivitiesByCategoryName(category: ActivityCategory): Activity[] {
  return ACTIVITIES.filter((a) => a.category === category)
}

// ── Sport training contexts ───────────────────────────────────────────────────

const SPORT_CONTEXTS: SportTrainingContext[] = [
  {
    sport: 'golf',
    focusAreas: ['Rotational power', 'Core stability', 'Hip mobility', 'Balance'],
    recommendedActivities: ['golf_walking', 'weightlifting', 'yoga_gentle', 'pilates', 'stretching'],
    periodizationNote: 'Off-season: mobility and strength. In-season: maintain and play. Avoid heavy lower-body fatigue before rounds.',
    keyMetrics: ['Rounds played', 'Steps walked on course', 'Practice sessions per week'],
  },
  {
    sport: 'basketball',
    focusAreas: ['Vertical jump', 'Lateral quickness', 'Conditioning', 'Strength'],
    recommendedActivities: ['basketball_game', 'basketball_recreational', 'hiit', 'strength_training_vigorous', 'jump_rope'],
    periodizationNote: 'Pre-season: build strength and conditioning. In-season: maintain; reduce gym volume 30–40%. Off-season: active recovery.',
    keyMetrics: ['Games played per week', 'Practice time', 'Jump training sessions'],
  },
  {
    sport: 'soccer',
    focusAreas: ['Aerobic base', 'Sprint speed', 'Agility', 'Lower body strength'],
    recommendedActivities: ['soccer_competitive', 'soccer_recreational', 'running_7mph', 'hiit', 'strength_training_vigorous'],
    periodizationNote: 'Off-season: build aerobic base and strength. Pre-season: speed and agility work. In-season: match prep and recovery.',
    keyMetrics: ['km run per session', 'Sprint intervals', 'Match time per week'],
  },
  {
    sport: 'tennis',
    focusAreas: ['Explosive footwork', 'Rotational power', 'Endurance', 'Shoulder stability'],
    recommendedActivities: ['tennis_singles', 'tennis_doubles', 'running_6mph', 'strength_training_vigorous', 'stretching'],
    periodizationNote: 'Periodize around tournament schedule. 4–6 weeks off-court training between seasons. Shoulder prehab year-round.',
    keyMetrics: ['Hours on court per week', 'Match sessions', 'Shoulder conditioning sessions'],
  },
  {
    sport: 'pickleball',
    focusAreas: ['Quick reflexes', 'Court coverage', 'Shoulder health', 'Cardiovascular fitness'],
    recommendedActivities: ['pickleball', 'tennis_doubles', 'hiit', 'yoga_gentle', 'stretching'],
    periodizationNote: 'High-frequency sport — ensure 1–2 full rest days per week. Emphasize joint health and rotator cuff work.',
    keyMetrics: ['Hours played per week', 'Sessions per week', 'Active minutes'],
  },
  {
    sport: 'running',
    focusAreas: ['Aerobic base', 'Running economy', 'Strength endurance', 'Recovery'],
    recommendedActivities: ['running_6mph', 'running_7mph', 'jogging', 'trail_running', 'yoga_gentle'],
    periodizationNote: 'Base phase: high volume, low intensity. Build phase: add threshold work. Peak: race-specific. Taper 2–3 weeks before goal race.',
    keyMetrics: ['Weekly mileage', 'Long run distance', 'Average pace per km'],
  },
  {
    sport: 'cycling',
    focusAreas: ['Aerobic power (FTP)', 'Climbing strength', 'Sprint power', 'Endurance'],
    recommendedActivities: ['cycling_vigorous', 'cycling_moderate', 'stationary_bike_vigorous', 'strength_training_vigorous', 'stretching'],
    periodizationNote: 'Winter: base miles indoors. Spring: build intensity. Summer: race season. Fall: recovery and cross-training.',
    keyMetrics: ['Weekly km / miles', 'FTP (watts)', 'Elevation gain per week'],
  },
  {
    sport: 'swimming',
    focusAreas: ['Stroke technique', 'Pulling power', 'Kick strength', 'Turns and starts'],
    recommendedActivities: ['swimming_moderate', 'swimming_vigorous', 'open_water_rowing', 'strength_training_vigorous', 'stretching'],
    periodizationNote: '4-week mesocycles alternating volume and intensity. Dryland strength 2x/week. Taper 7–10 days before meets.',
    keyMetrics: ['Weekly yards / meters', 'Lap pace', 'Stroke rate (strokes/min)'],
  },
  {
    sport: 'hiking',
    focusAreas: ['Leg strength', 'Aerobic endurance', 'Balance', 'Core stability'],
    recommendedActivities: ['hiking', 'hiking_with_pack', 'stair_climbing', 'weightlifting', 'yoga_gentle'],
    periodizationNote: 'Build weekly elevation gain by 10% per week. Loaded carries (rucking) simulate pack weight and accelerate adaptation.',
    keyMetrics: ['Weekly elevation gain', 'Distance covered', 'Pack weight carried'],
  },
  {
    sport: 'boxing',
    focusAreas: ['Power generation', 'Cardio conditioning', 'Footwork', 'Core strength'],
    recommendedActivities: ['boxing_bag_work', 'boxing_sparring', 'jump_rope', 'circuit_training', 'running_6mph'],
    periodizationNote: 'Fight camp: 8–12 weeks. Increase sparring volume weeks 4–8. Taper last 10 days. Recovery week after each fight.',
    keyMetrics: ['Sparring rounds per week', 'Bag rounds per session', 'Conditioning miles'],
  },
  {
    sport: 'bjj_mma',
    focusAreas: ['Grip strength', 'Grappling endurance', 'Explosive power', 'Injury prevention'],
    recommendedActivities: ['bjj', 'mma_training', 'wrestling', 'strength_training_vigorous', 'yoga_gentle'],
    periodizationNote: 'Train technique year-round; peak conditioning 6–8 weeks before competition. Rolling volume peaks 4 weeks out, then tapers.',
    keyMetrics: ['Mat hours per week', 'Live rolling rounds', 'Strength training sessions'],
  },
  {
    sport: 'volleyball',
    focusAreas: ['Vertical jump', 'Shoulder stability', 'Lateral movement', 'Core power'],
    recommendedActivities: ['volleyball_competitive', 'volleyball_recreational', 'strength_training_vigorous', 'jump_rope', 'stretching'],
    periodizationNote: 'Off-season: jump training and strength blocks. Pre-season: transition to sport-specific. In-season: reduce gym volume.',
    keyMetrics: ['Practice hours per week', 'Match time', 'Jump training sessions'],
  },
  {
    sport: 'skiing',
    focusAreas: ['Leg strength', 'Balance and proprioception', 'Cardiovascular fitness', 'Core stability'],
    recommendedActivities: ['skiing_downhill', 'skiing_cross_country_moderate', 'stationary_bike_vigorous', 'strength_training_vigorous', 'yoga_power'],
    periodizationNote: 'Pre-season (Oct–Nov): heavy leg strength and VO2max. In-season: maintain with 2 gym sessions/week; ski days count.',
    keyMetrics: ['Days on mountain', 'Vertical feet skied', 'Off-snow conditioning sessions'],
  },
  {
    sport: 'baseball',
    focusAreas: ['Rotational power', 'Arm health', 'Sprint speed', 'Hip mobility'],
    recommendedActivities: ['baseball_softball', 'strength_training_vigorous', 'running_7mph', 'stretching', 'yoga_gentle'],
    periodizationNote: 'Off-season: strength and power focus. Spring training: ramp throwing velocity. In-season: arm care and maintenance lifts.',
    keyMetrics: ['Throwing sessions per week', 'Sprint / agility sessions', 'Strength sessions'],
  },
]

export function getSportTrainingContext(sport: string): SportTrainingContext | null {
  const s = sport.toLowerCase().trim()
  return (
    SPORT_CONTEXTS.find(
      (c) => c.sport === s || s.includes(c.sport) || c.sport.includes(s)
    ) ?? null
  )
}
