'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface ProfileForm {
  full_name: string
  age: string
  height_cm: string
  weight_kg: string
  experience_level: string
  fitness_goal: string
  injuries_limitations: string
}

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'athlete']
const FITNESS_GOALS = ['lose_weight', 'build_muscle', 'improve_fitness', 'sport_performance', 'general_health']

export default function EditProfilePage() {
  const router = useRouter()
  const toast = useToast()
  const [supabase] = useState(() => createClient())
  const [form, setForm] = useState<ProfileForm>({
    full_name: '', age: '', height_cm: '', weight_kg: '',
    experience_level: 'intermediate', fitness_goal: 'general_health', injuries_limitations: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    if (data) {
      setForm({
        full_name: (data.full_name as string) ?? '',
        age: String(data.age ?? ''),
        height_cm: String(data.height_cm ?? ''),
        weight_kg: String(data.weight_kg ?? ''),
        experience_level: (data.experience_level as string) ?? 'intermediate',
        fitness_goal: (data.fitness_goal as string) ?? 'general_health',
        injuries_limitations: (data.injuries_limitations as string) ?? '',
      })
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('user_profiles').update({
        full_name: form.full_name,
        age: form.age ? parseInt(form.age) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        experience_level: form.experience_level,
        fitness_goal: form.fitness_goal,
        injuries_limitations: form.injuries_limitations || null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      if (error) throw error
      toast.success('Profile updated')
      router.back()
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof ProfileForm, type = 'text', unit?: string) => (
    <div>
      <label className="text-xs text-[#6B7280] uppercase tracking-wide mb-1 block">{label}</label>
      <div className="flex items-center bg-[#1E1E2E] rounded-xl border border-white/5 overflow-hidden">
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-[#6B7280] outline-none"
        />
        {unit && <span className="px-3 text-xs text-[#6B7280] shrink-0">{unit}</span>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-24">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold flex-1">Edit Profile</h1>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6C63FF] active:opacity-70">
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
        {field('Full Name', 'full_name')}
        {field('Age', 'age', 'number', 'years')}
        {field('Height', 'height_cm', 'number', 'cm')}
        {field('Weight', 'weight_kg', 'number', 'kg')}

        <div>
          <label className="text-xs text-[#6B7280] uppercase tracking-wide mb-1 block">Experience Level</label>
          <div className="grid grid-cols-2 gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setForm((f) => ({ ...f, experience_level: level }))}
                className={`py-3 rounded-xl text-sm font-medium capitalize transition-all ${
                  form.experience_level === level
                    ? 'bg-[#6C63FF] text-white'
                    : 'bg-[#1E1E2E] text-[#6B7280]'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#6B7280] uppercase tracking-wide mb-1 block">Fitness Goal</label>
          <div className="space-y-2">
            {FITNESS_GOALS.map((goal) => (
              <button
                key={goal}
                onClick={() => setForm((f) => ({ ...f, fitness_goal: goal }))}
                className={`w-full py-3 px-4 rounded-xl text-sm font-medium text-left capitalize transition-all ${
                  form.fitness_goal === goal
                    ? 'bg-[#6C63FF]/15 border border-[#6C63FF]/50 text-[#6C63FF]'
                    : 'bg-[#1E1E2E] border border-transparent text-[#6B7280]'
                }`}
              >
                {goal.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#6B7280] uppercase tracking-wide mb-1 block">Injuries & Limitations</label>
          <textarea
            value={form.injuries_limitations}
            onChange={(e) => setForm((f) => ({ ...f, injuries_limitations: e.target.value }))}
            placeholder="E.g. lower back pain, knee injury..."
            rows={3}
            className="w-full bg-[#1E1E2E] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-[#6B7280] outline-none resize-none"
          />
        </div>
      </div>
    </div>
  )
}
