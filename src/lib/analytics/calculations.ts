export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  const raw = weight * (1 + reps / 30)
  return Math.round(raw / 2.5) * 2.5
}

export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: string,
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return sex === 'female' ? base - 161 : base + 5
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateTDEE(bmr: number, activity_level: string): number {
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activity_level] ?? 1.55))
}

export function calculateWeightTrend(
  weights: { date: string; value: number }[],
): number {
  if (weights.length < 2) return 0
  const sorted = [...weights].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const n = sorted.length
  const xBase = new Date(sorted[0].date).getTime()
  const xs = sorted.map(
    (w) => (new Date(w.date).getTime() - xBase) / (1000 * 60 * 60 * 24 * 7),
  )
  const ys = sorted.map((w) => w.value)
  const xMean = xs.reduce((a, b) => a + b, 0) / n
  const yMean = ys.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0)
  const den = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0)
  return den === 0 ? 0 : parseFloat((num / den).toFixed(3))
}

export function calculateStreak(
  dates: string[],
): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 }
  const uniqueDates = [
    ...new Set(dates.map((d) => d.split('T')[0])),
  ].sort()
  let current = 0
  let longest = 0
  let streak = 1

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1])
    const curr = new Date(uniqueDates[i])
    const diff =
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      streak++
    } else {
      longest = Math.max(longest, streak)
      streak = 1
    }
  }
  longest = Math.max(longest, streak)

  // Current streak: check if last date is today or yesterday
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastDate = new Date(uniqueDates[uniqueDates.length - 1])
  const diffFromToday =
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)

  if (diffFromToday <= 1) {
    // Walk backward counting consecutive days
    current = 1
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const a = new Date(uniqueDates[i + 1])
      const b = new Date(uniqueDates[i])
      const d = (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
      if (d === 1) current++
      else break
    }
  }

  return { current, longest }
}

export function calculateComplianceScore(
  target: number,
  actual: number,
  tolerance = 0.1,
): number {
  if (target === 0) return actual === 0 ? 100 : 0
  const ratio = actual / target
  const diff = Math.abs(1 - ratio)
  if (diff <= tolerance) return 100
  if (diff >= 0.5) return 0
  return Math.round(100 * (1 - (diff - tolerance) / (0.5 - tolerance)))
}

export function calculateApexScore(components: {
  consistency: number
  nutrition: number
  activity: number
  progression: number
  recovery: number
}): number {
  return Math.round(
    components.consistency * 0.3 +
      components.nutrition * 0.25 +
      components.activity * 0.2 +
      components.progression * 0.15 +
      components.recovery * 0.1,
  )
}

export function movingAverage(
  data: { date: string; value: number }[],
  window = 7,
): { date: string; ma: number }[] {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = data.slice(start, i + 1)
    const avg = slice.reduce((s, x) => s + x.value, 0) / slice.length
    return { date: d.date, ma: parseFloat(avg.toFixed(2)) }
  })
}

export const MUSCLE_GROUP_MAP: Record<string, string> = {
  'middle back': 'Back',
  'lower back': 'Back',
  lats: 'Back',
  traps: 'Back',
  chest: 'Chest',
  pectorals: 'Chest',
  quadriceps: 'Quads',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  'glute maximus': 'Glutes',
  calves: 'Calves',
  'anterior deltoid': 'Shoulders',
  'medial deltoid': 'Shoulders',
  'posterior deltoid': 'Shoulders',
  deltoids: 'Shoulders',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Core',
  abdominals: 'Core',
  core: 'Core',
  obliques: 'Core',
  'hip flexors': 'Hips',
  adductors: 'Adductors',
  abductors: 'Abductors',
  neck: 'Neck',
}

export function normalizeMuscle(raw: string): string {
  const lower = raw.toLowerCase()
  return MUSCLE_GROUP_MAP[lower] ?? raw
}

export function lbsToKg(lbs: number): number {
  return parseFloat((lbs / 2.205).toFixed(2))
}

export function kgToLbs(kg: number): number {
  return parseFloat((kg * 2.205).toFixed(1))
}

export function formatKgOrLbs(kg: number, unit: 'kg' | 'lbs' = 'lbs'): string {
  if (unit === 'lbs') return `${kgToLbs(kg)} lbs`
  return `${kg} kg`
}
