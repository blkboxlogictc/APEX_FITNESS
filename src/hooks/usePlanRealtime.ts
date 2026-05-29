'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NutritionPlan, FitnessPlan } from '@/types/plans'

interface UsePlanRealtimeOptions {
  userId: string | null
  onNutritionUpdate?: (plan: NutritionPlan) => void
  onFitnessUpdate?: (plan: FitnessPlan) => void
}

export function usePlanRealtime({
  userId,
  onNutritionUpdate,
  onFitnessUpdate,
}: UsePlanRealtimeOptions) {
  const supabaseRef = useRef(createClient())
  const nutritionCbRef = useRef(onNutritionUpdate)
  const fitnessCbRef = useRef(onFitnessUpdate)

  // Keep callback refs current without re-subscribing
  useEffect(() => {
    nutritionCbRef.current = onNutritionUpdate
    fitnessCbRef.current = onFitnessUpdate
  })

  useEffect(() => {
    if (!userId) return

    const supabase = supabaseRef.current

    const nutritionChannel = supabase
      .channel(`nutrition_plans:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nutrition_plans',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as NutritionPlan
          if (updated.is_active) {
            nutritionCbRef.current?.(updated)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nutrition_plans',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const inserted = payload.new as NutritionPlan
          if (inserted.is_active) {
            nutritionCbRef.current?.(inserted)
          }
        }
      )
      .subscribe()

    const fitnessChannel = supabase
      .channel(`fitness_plans:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fitness_plans',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as FitnessPlan
          if (updated.is_active) {
            fitnessCbRef.current?.(updated)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fitness_plans',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const inserted = payload.new as FitnessPlan
          if (inserted.is_active) {
            fitnessCbRef.current?.(inserted)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(nutritionChannel)
      supabase.removeChannel(fitnessChannel)
    }
  }, [userId])
}
