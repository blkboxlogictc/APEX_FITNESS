import { NextRequest, NextResponse } from 'next/server'
import { getExercises, searchExercises, filterExercises } from '@/lib/exercises'
import type { ExerciseFilters } from '@/lib/exercises'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const search    = searchParams.get('search') ?? ''
  const equipment = searchParams.get('equipment')
  const muscle    = searchParams.get('muscle')
  const level     = searchParams.get('level')
  const category  = searchParams.get('category')
  const ids       = searchParams.get('ids')

  try {
    // Return specific exercises by ID list
    if (ids) {
      const idList = ids.split(',').filter(Boolean)
      const all = await getExercises()
      const idSet = new Set(idList)
      return NextResponse.json(all.filter(e => idSet.has(e.id)))
    }

    // Text search
    if (search) {
      return NextResponse.json(await searchExercises(search))
    }

    // Filtered query
    if (equipment || muscle || level || category) {
      const filters: ExerciseFilters = {}
      if (equipment) filters.equipment = equipment.split(',').filter(Boolean)
      if (muscle)    filters.primaryMuscles = [muscle]
      if (level)     filters.level = level
      if (category)  filters.category = category
      return NextResponse.json(await filterExercises(filters))
    }

    return NextResponse.json(await getExercises())
  } catch (err) {
    console.error('Exercises route error:', err)
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
  }
}
