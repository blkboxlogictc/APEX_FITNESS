const DB_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main'
export const EXERCISE_LIST_URL = `${DB_BASE}/dist/exercises.json`
export const EXERCISE_IMAGE_BASE = `${DB_BASE}/exercises`

export interface Exercise {
  id: string
  name: string
  force: 'pull' | 'push' | 'static' | null
  level: 'beginner' | 'intermediate' | 'expert'
  mechanic: 'compound' | 'isolation' | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}

export interface ExerciseFilters {
  equipment?: string[]
  primaryMuscles?: string[]
  level?: string
  category?: string
  force?: string
}

// Maps user profile equipment to free-exercise-db equipment values
const EQUIPMENT_MAP: Record<string, string[]> = {
  none:      ['body only', 'bands'],
  dumbbells: ['body only', 'bands', 'dumbbell', 'kettlebells'],
  barbell:   ['body only', 'bands', 'dumbbell', 'kettlebells', 'barbell', 'foam roll', 'medicine ball', 'other'],
  cables:    ['body only', 'bands', 'dumbbell', 'kettlebells', 'barbell', 'foam roll', 'medicine ball', 'other', 'cable', 'machine'],
  full_gym:  ['body only', 'bands', 'dumbbell', 'kettlebells', 'barbell', 'foam roll', 'medicine ball', 'other', 'cable', 'machine'],
}

export async function getExercises(): Promise<Exercise[]> {
  const res = await fetch(EXERCISE_LIST_URL, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`Failed to fetch exercises: ${res.status}`)
  return res.json() as Promise<Exercise[]>
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const all = await getExercises()
  if (!query.trim()) return all
  const q = query.toLowerCase().trim()
  return all.filter(e => e.name.toLowerCase().includes(q))
}

export async function filterExercises(filters: ExerciseFilters): Promise<Exercise[]> {
  const all = await getExercises()
  return all.filter(e => {
    if (filters.equipment?.length) {
      const eq = e.equipment ?? 'body only'
      if (!filters.equipment.includes(eq)) return false
    }
    if (filters.primaryMuscles?.length) {
      const norm = filters.primaryMuscles.map(m => m.toLowerCase())
      if (!e.primaryMuscles.some(m => norm.includes(m.toLowerCase()))) return false
    }
    if (filters.level && e.level !== filters.level) return false
    if (filters.category && e.category !== filters.category) return false
    if (filters.force && e.force !== filters.force) return false
    return true
  })
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const all = await getExercises()
  return all.find(e => e.id === id) ?? null
}

export async function getExercisesByIds(ids: string[]): Promise<Exercise[]> {
  const all = await getExercises()
  const idSet = new Set(ids)
  return all.filter(e => idSet.has(e.id))
}

export async function getExercisesByMuscleGroup(muscle: string): Promise<Exercise[]> {
  const all = await getExercises()
  const m = muscle.toLowerCase()
  return all.filter(e => e.primaryMuscles.some(pm => pm.toLowerCase().includes(m)))
}

export async function getExercisesForUserEquipment(userEquipment: string[]): Promise<Exercise[]> {
  const all = await getExercises()

  const sources = userEquipment.length === 0 ? ['none'] : userEquipment
  if (sources.includes('full_gym')) return all

  const allowed = new Set<string>()
  for (const eq of sources) {
    const mapped = EQUIPMENT_MAP[eq]
    if (mapped) mapped.forEach(v => allowed.add(v))
  }

  return all.filter(e => allowed.has(e.equipment ?? 'body only'))
}

export async function findExerciseByName(name: string): Promise<Exercise | null> {
  const all = await getExercises()
  const norm = name.toLowerCase().trim()

  const exact = all.find(e => e.name.toLowerCase() === norm)
  if (exact) return exact

  // Substring match (either direction)
  const partial = all.find(
    e => e.name.toLowerCase().includes(norm) || norm.includes(e.name.toLowerCase())
  )
  return partial ?? null
}

export function getImageUrl(exercise: Exercise, index = 0): string {
  const filename = exercise.images[index]
  if (!filename) return ''
  return `${EXERCISE_IMAGE_BASE}/${exercise.id}/${filename}`
}

export function getMuscleColor(muscle: string): string {
  const m = muscle.toLowerCase()
  if (m.includes('chest')) return '#FF6B35'
  if (m.includes('lat') || m.includes('back') || m.includes('trap')) return '#6C63FF'
  if (m.includes('shoulder') || m.includes('delt')) return '#00D4AA'
  if (m.includes('bicep') || m.includes('tricep') || m.includes('forearm')) return '#FFB347'
  if (m.includes('quad') || m.includes('hamstring') || m.includes('glute') || m.includes('calf') || m.includes('adduct') || m.includes('abduct')) return '#FF6B6B'
  if (m.includes('abs') || m.includes('oblique') || m.includes('core')) return '#4ECDC4'
  if (m.includes('lower back')) return '#A78BFA'
  return '#6B7280'
}

// Return exercises most relevant to a workout focus string
export function getFocusExercises(exercises: Exercise[], focus: string): Exercise[] {
  const f = focus.toLowerCase()

  let targetMuscles: string[] = []

  if (f.includes('lower') || f.includes('leg') || f.includes('squat') || f.includes('deadlift')) {
    targetMuscles = ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'lower back']
  } else if (f.includes('push') || f.includes('chest') || f.includes('press')) {
    targetMuscles = ['chest', 'shoulders', 'triceps', 'forearms']
  } else if (f.includes('pull') || f.includes('back') || f.includes('row')) {
    targetMuscles = ['lats', 'middle back', 'lower back', 'biceps', 'traps', 'forearms']
  } else if (f.includes('upper')) {
    targetMuscles = ['chest', 'lats', 'middle back', 'lower back', 'shoulders', 'biceps', 'triceps', 'traps']
  } else if (f.includes('shoulder') || f.includes('arm')) {
    targetMuscles = ['shoulders', 'biceps', 'triceps', 'forearms', 'traps']
  } else if (f.includes('core') || f.includes('abs')) {
    targetMuscles = ['abdominals', 'obliques', 'lower back']
  } else {
    // full body — return broad selection
    return [
      ...exercises.filter(e => e.category === 'stretching').slice(0, 25),
      ...exercises.filter(e => e.category !== 'stretching').slice(0, 130),
    ].slice(0, 150)
  }

  const stretches = exercises.filter(e => e.category === 'stretching').slice(0, 25)
  const targeted = exercises.filter(e =>
    e.primaryMuscles.some(m =>
      targetMuscles.some(tm => m.toLowerCase().includes(tm.toLowerCase()))
    )
  )

  const combined = [...targeted, ...stretches]
  const seen = new Set<string>()
  return combined.filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  }).slice(0, 150)
}
