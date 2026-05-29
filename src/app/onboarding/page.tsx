'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Check, Zap, Loader2 } from 'lucide-react'

const TOTAL_STEPS = 7

type Sex = 'male' | 'female' | 'other'
type FitnessGoal = 'lose_weight' | 'build_muscle' | 'endurance' | 'sport_performance' | 'general_health'
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
type EquipmentOption = 'none' | 'dumbbells' | 'barbell' | 'cables' | 'full_gym'
type ActivityOption = 'golf' | 'basketball' | 'hiking' | 'boxing' | 'running' | 'cycling' | 'swimming' | 'soccer' | 'tennis' | 'weightlifting' | 'yoga' | 'other'

interface FormData {
  full_name: string
  age: string
  sex: Sex | ''
  height_cm: string
  height_ft: string
  height_in: string
  weight_kg: string
  weight_lbs: string
  fitness_goal: FitnessGoal | ''
  experience_level: ExperienceLevel | ''
  available_equipment: EquipmentOption[]
  sports_activities: ActivityOption[]
  specific_goal: string
  injuries_limitations: string
  personal_context: string
}

const STEP_TITLES = [
  "Let's meet you",
  'Your body right now',
  "What's your main goal?",
  'Your experience level',
  'What equipment do you have?',
  'Your sports & activities',
  'Tell your trainer anything',
]

const FITNESS_GOALS = [
  { id: 'lose_weight' as FitnessGoal, emoji: '🔥', title: 'Lose Weight', desc: 'Burn fat & improve body composition' },
  { id: 'build_muscle' as FitnessGoal, emoji: '💪', title: 'Build Muscle', desc: 'Gain strength and muscle mass' },
  { id: 'endurance' as FitnessGoal, emoji: '🏃', title: 'Endurance', desc: 'Run farther, last longer' },
  { id: 'sport_performance' as FitnessGoal, emoji: '🏆', title: 'Sport Performance', desc: 'Train for your sport specifically' },
  { id: 'general_health' as FitnessGoal, emoji: '❤️', title: 'General Health', desc: 'Feel better every day' },
]

const EXPERIENCE_LEVELS = [
  {
    id: 'beginner' as ExperienceLevel,
    title: 'Beginner',
    sub: '< 1 year',
    desc: 'New to structured training or returning after a long break',
  },
  {
    id: 'intermediate' as ExperienceLevel,
    title: 'Intermediate',
    sub: '1–3 years',
    desc: 'Comfortable with the basics and ready to level up',
  },
  {
    id: 'advanced' as ExperienceLevel,
    title: 'Advanced',
    sub: '3+ years',
    desc: 'Experienced athlete with a solid training foundation',
  },
]

const EQUIPMENT_OPTIONS = [
  { id: 'none' as EquipmentOption, emoji: '🏠', title: 'No Equipment', desc: 'Bodyweight only' },
  { id: 'dumbbells' as EquipmentOption, emoji: '🏋️', title: 'Dumbbells', desc: 'Free weights at home' },
  { id: 'barbell' as EquipmentOption, emoji: '⚡', title: 'Barbell & Rack', desc: 'Home gym setup' },
  { id: 'cables' as EquipmentOption, emoji: '🔗', title: 'Cable Machine', desc: 'Cables + machines' },
  { id: 'full_gym' as EquipmentOption, emoji: '🏢', title: 'Full Commercial Gym', desc: 'Access to everything' },
]

const ACTIVITY_OPTIONS = [
  { id: 'golf' as ActivityOption, emoji: '🏌️', title: 'Golf' },
  { id: 'basketball' as ActivityOption, emoji: '🏀', title: 'Basketball' },
  { id: 'hiking' as ActivityOption, emoji: '🥾', title: 'Hiking' },
  { id: 'boxing' as ActivityOption, emoji: '🥊', title: 'Boxing' },
  { id: 'running' as ActivityOption, emoji: '🏃', title: 'Running' },
  { id: 'cycling' as ActivityOption, emoji: '🚴', title: 'Cycling' },
  { id: 'swimming' as ActivityOption, emoji: '🏊', title: 'Swimming' },
  { id: 'soccer' as ActivityOption, emoji: '⚽', title: 'Soccer' },
  { id: 'tennis' as ActivityOption, emoji: '🎾', title: 'Tennis' },
  { id: 'weightlifting' as ActivityOption, emoji: '🏋️', title: 'Lifting' },
  { id: 'yoga' as ActivityOption, emoji: '🧘', title: 'Yoga' },
  { id: 'other' as ActivityOption, emoji: '➕', title: 'Other' },
]

const DEFAULT_FORM: FormData = {
  full_name: '',
  age: '',
  sex: '',
  height_cm: '',
  height_ft: '',
  height_in: '',
  weight_kg: '',
  weight_lbs: '',
  fitness_goal: '',
  experience_level: '',
  available_equipment: [],
  sports_activities: [],
  specific_goal: '',
  injuries_limitations: '',
  personal_context: '',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [step, setStep] = useState(1)
  const [useMetric, setUseMetric] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single()

      if (profile?.onboarding_complete) {
        router.replace('/home')
        return
      }

      try {
        const saved = localStorage.getItem('apex_onboarding_v1')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.formData) setForm((prev) => ({ ...prev, ...parsed.formData }))
          if (parsed.savedStep) setStep(parsed.savedStep)
          if (parsed.savedMetric !== undefined) setUseMetric(parsed.savedMetric)
        }
      } catch {}

      setIsInitializing(false)
    }

    init()
  }, [router, supabase])

  useEffect(() => {
    if (isInitializing) return
    try {
      localStorage.setItem(
        'apex_onboarding_v1',
        JSON.stringify({ formData: form, savedStep: step, savedMetric: useMetric })
      )
    } catch {}
  }, [form, step, useMetric, isInitializing])

  const getHeightCm = () => {
    if (useMetric) return parseFloat(form.height_cm) || 0
    const ft = parseInt(form.height_ft) || 0
    const inches = parseInt(form.height_in) || 0
    return Math.round((ft * 12 + inches) * 2.54 * 10) / 10
  }

  const getWeightKg = () => {
    if (useMetric) return parseFloat(form.weight_kg) || 0
    return Math.round((parseFloat(form.weight_lbs) / 2.205) * 10) / 10
  }

  const saveStep = async (stepNum: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    type ProfileUpdate = Record<string, unknown>
    let data: ProfileUpdate = { id: user.id, updated_at: new Date().toISOString() }

    switch (stepNum) {
      case 1:
        data = { ...data, full_name: form.full_name, age: parseInt(form.age) || null, sex: form.sex || null }
        break
      case 2:
        data = { ...data, height_cm: getHeightCm(), weight_kg: getWeightKg() }
        break
      case 3:
        data = { ...data, fitness_goal: form.fitness_goal || null }
        break
      case 4:
        data = { ...data, experience_level: form.experience_level || null }
        break
      case 5:
        data = { ...data, available_equipment: form.available_equipment }
        break
      case 6:
        data = { ...data, sports_activities: form.sports_activities }
        break
      case 7:
        data = {
          ...data,
          specific_goal: form.specific_goal || null,
          injuries_limitations: form.injuries_limitations || null,
          personal_context: form.personal_context || null,
          onboarding_complete: true,
        }
        break
    }

    const { error } = await supabase
      .from('user_profiles')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(data as any, { onConflict: 'id' })

    if (error) console.error('Supabase upsert error:', error)
  }

  const handleNext = async () => {
    setIsSaving(true)
    await saveStep(step)

    if (step === TOTAL_STEPS) {
      localStorage.removeItem('apex_onboarding_v1')
      setIsComplete(true)
      setTimeout(() => router.replace('/home'), 2800)
    } else {
      setStep((s) => s + 1)
    }

    setIsSaving(false)
  }

  const isStepValid = () => {
    switch (step) {
      case 1:
        return form.full_name.trim().length > 0 && form.age.length > 0 && !!form.sex
      case 2:
        if (useMetric) return !!form.height_cm && !!form.weight_kg
        return !!form.height_ft && !!form.weight_lbs
      case 3:
        return !!form.fitness_goal
      case 4:
        return !!form.experience_level
      case 5:
        return form.available_equipment.length > 0
      case 6:
        return true
      case 7:
        return true
      default:
        return true
    }
  }

  const update = (field: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleEquipment = (item: EquipmentOption) => {
    setForm((prev) => {
      if (item === 'none') {
        return {
          ...prev,
          available_equipment: prev.available_equipment.includes('none') ? [] : ['none'],
        }
      }
      const withoutNone = prev.available_equipment.filter((e) => e !== 'none')
      return {
        ...prev,
        available_equipment: withoutNone.includes(item)
          ? withoutNone.filter((e) => e !== item)
          : [...withoutNone, item],
      }
    })
  }

  const toggleActivity = (item: ActivityOption) => {
    setForm((prev) => ({
      ...prev,
      sports_activities: prev.sports_activities.includes(item)
        ? prev.sports_activities.filter((a) => a !== item)
        : [...prev.sports_activities, item],
    }))
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
            <Zap size={22} className="text-white" fill="white" />
          </div>
          <Loader2 className="w-5 h-5 text-[#6C63FF] animate-spin" />
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center max-w-[430px] mx-auto px-6">
        <div className="text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            <Check size={44} className="text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold font-space-grotesk text-[#F0F0FF] mb-3">
            You&apos;re all set!
          </h2>
          <p className="text-[#6B7280] text-sm leading-relaxed max-w-xs mx-auto">
            Building your personalized training plan based on your goals and profile...
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="w-2.5 h-2.5 rounded-full animate-bounce"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)', animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="flex-none px-5 pt-12 pb-2">
        <div className="flex items-center gap-3 mb-5">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-[#6B7280] hover:text-[#F0F0FF] transition-colors duration-200 p-1 -ml-1"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <div className="flex-1 bg-[#1E1E2E] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(step / TOTAL_STEPS) * 100}%`,
                background: 'linear-gradient(90deg, #6C63FF, #00D4AA)',
              }}
            />
          </div>
          <span className="text-[#6B7280] text-xs font-medium tabular-nums">
            {step}/{TOTAL_STEPS}
          </span>
        </div>
        <h2 className="text-2xl font-bold font-space-grotesk text-[#F0F0FF]">
          {STEP_TITLES[step - 1]}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-5 overflow-y-auto">
        {step === 1 && <Step1 form={form} update={update} />}
        {step === 2 && <Step2 form={form} update={update} useMetric={useMetric} setUseMetric={setUseMetric} />}
        {step === 3 && <Step3 form={form} update={update} />}
        {step === 4 && <Step4 form={form} update={update} />}
        {step === 5 && <Step5 form={form} toggleEquipment={toggleEquipment} />}
        {step === 6 && <Step6 form={form} toggleActivity={toggleActivity} />}
        {step === 7 && <Step7 form={form} update={update} />}
      </div>

      {/* CTA */}
      <div className="flex-none px-5 pb-10 pt-4">
        <button
          onClick={handleNext}
          disabled={isSaving || !isStepValid()}
          className="w-full py-4 rounded-2xl font-semibold text-base text-white disabled:opacity-40 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : step === TOTAL_STEPS ? (
            "Let's build your plan ✨"
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  )
}

/* ─── Step 1: Personal Info ─── */
function Step1({
  form,
  update,
}: {
  form: FormData
  update: (field: keyof FormData, value: unknown) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm text-[#6B7280] mb-2">Full Name</label>
        <input
          type="text"
          value={form.full_name}
          onChange={(e) => update('full_name', e.target.value)}
          autoFocus
          className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-[#F0F0FF] text-base focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280]"
          placeholder="Alex Johnson"
        />
      </div>

      <div>
        <label className="block text-sm text-[#6B7280] mb-2">Age</label>
        <input
          type="number"
          value={form.age}
          onChange={(e) => update('age', e.target.value)}
          min="13"
          max="100"
          className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-[#F0F0FF] text-base focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280]"
          placeholder="25"
        />
      </div>

      <div>
        <label className="block text-sm text-[#6B7280] mb-1.5">Biological Sex</label>
        <p className="text-xs text-[#6B7280] mb-3">Used to accurately calculate your calorie needs</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Prefer not' },
            ] as { value: 'male' | 'female' | 'other'; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => update('sex', value)}
              className={`py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                form.sex === value
                  ? 'border-[#6C63FF] bg-[#6C63FF]/15 text-[#6C63FF]'
                  : 'border-[#1E1E2E] bg-[#13131A] text-[#6B7280] hover:border-[#6C63FF]/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Step 2: Body Metrics ─── */
function Step2({
  form,
  update,
  useMetric,
  setUseMetric,
}: {
  form: FormData
  update: (field: keyof FormData, value: unknown) => void
  useMetric: boolean
  setUseMetric: (v: boolean) => void
}) {
  return (
    <div className="space-y-6">
      {/* Unit toggle */}
      <div className="flex bg-[#13131A] border border-[#1E1E2E] rounded-xl p-1">
        {[
          { label: 'Imperial (ft/lbs)', metric: false },
          { label: 'Metric (cm/kg)', metric: true },
        ].map(({ label, metric }) => (
          <button
            key={label}
            onClick={() => setUseMetric(metric)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              useMetric === metric ? 'text-white' : 'text-[#6B7280]'
            }`}
            style={useMetric === metric ? { background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Height */}
      <div>
        <label className="block text-sm text-[#6B7280] mb-2">Height</label>
        {useMetric ? (
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={form.height_cm}
              onChange={(e) => update('height_cm', e.target.value)}
              min="100"
              max="250"
              className="flex-1 bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-[#F0F0FF] text-base focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280]"
              placeholder="175"
            />
            <span className="text-[#6B7280] text-sm font-medium w-8">cm</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                value={form.height_ft}
                onChange={(e) => update('height_ft', e.target.value)}
                min="3"
                max="8"
                className="flex-1 bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-[#F0F0FF] text-base focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280]"
                placeholder="5"
              />
              <span className="text-[#6B7280] text-sm font-medium">ft</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                value={form.height_in}
                onChange={(e) => update('height_in', e.target.value)}
                min="0"
                max="11"
                className="flex-1 bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-[#F0F0FF] text-base focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280]"
                placeholder="10"
              />
              <span className="text-[#6B7280] text-sm font-medium">in</span>
            </div>
          </div>
        )}
      </div>

      {/* Weight */}
      <div>
        <label className="block text-sm text-[#6B7280] mb-2">Weight</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={useMetric ? form.weight_kg : form.weight_lbs}
            onChange={(e) => update(useMetric ? 'weight_kg' : 'weight_lbs', e.target.value)}
            min={useMetric ? 30 : 66}
            max={useMetric ? 300 : 660}
            className="flex-1 bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-[#F0F0FF] text-base focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280]"
            placeholder={useMetric ? '75' : '165'}
          />
          <span className="text-[#6B7280] text-sm font-medium w-8">{useMetric ? 'kg' : 'lbs'}</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Step 3: Fitness Goal ─── */
function Step3({
  form,
  update,
}: {
  form: FormData
  update: (field: keyof FormData, value: unknown) => void
}) {
  return (
    <div className="space-y-3">
      {FITNESS_GOALS.map((goal) => {
        const active = form.fitness_goal === goal.id
        return (
          <button
            key={goal.id}
            onClick={() => update('fitness_goal', goal.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
              active
                ? 'border-[#6C63FF] bg-[#6C63FF]/10'
                : 'border-[#1E1E2E] bg-[#13131A] hover:border-[#6C63FF]/40'
            }`}
          >
            <span className="text-2xl w-9 text-center leading-none">{goal.emoji}</span>
            <div className="flex-1">
              <p className={`font-semibold text-sm font-space-grotesk ${active ? 'text-[#6C63FF]' : 'text-[#F0F0FF]'}`}>
                {goal.title}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">{goal.desc}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                active ? 'bg-[#6C63FF] border-[#6C63FF]' : 'border-[#1E1E2E]'
              }`}
            >
              {active && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Step 4: Experience Level ─── */
function Step4({
  form,
  update,
}: {
  form: FormData
  update: (field: keyof FormData, value: unknown) => void
}) {
  return (
    <div className="space-y-3">
      {EXPERIENCE_LEVELS.map((level) => {
        const active = form.experience_level === level.id
        return (
          <button
            key={level.id}
            onClick={() => update('experience_level', level.id)}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
              active
                ? 'border-[#6C63FF] bg-[#6C63FF]/10'
                : 'border-[#1E1E2E] bg-[#13131A] hover:border-[#6C63FF]/40'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <p className={`font-semibold text-sm font-space-grotesk ${active ? 'text-[#6C63FF]' : 'text-[#F0F0FF]'}`}>
                  {level.title}
                </p>
                <span className="text-xs text-[#6B7280] bg-[#1E1E2E] px-2 py-0.5 rounded-full">
                  {level.sub}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">{level.desc}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 mt-0.5 ${
                active ? 'bg-[#6C63FF] border-[#6C63FF]' : 'border-[#1E1E2E]'
              }`}
            >
              {active && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Step 5: Equipment ─── */
function Step5({
  form,
  toggleEquipment,
}: {
  form: FormData
  toggleEquipment: (item: EquipmentOption) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#6B7280]">Select all that apply</p>
      {EQUIPMENT_OPTIONS.map((eq) => {
        const active = form.available_equipment.includes(eq.id)
        return (
          <button
            key={eq.id}
            onClick={() => toggleEquipment(eq.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
              active
                ? 'border-[#6C63FF] bg-[#6C63FF]/10'
                : 'border-[#1E1E2E] bg-[#13131A] hover:border-[#6C63FF]/40'
            }`}
          >
            <span className="text-xl w-8 text-center leading-none">{eq.emoji}</span>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${active ? 'text-[#6C63FF]' : 'text-[#F0F0FF]'}`}>
                {eq.title}
              </p>
              <p className="text-xs text-[#6B7280]">{eq.desc}</p>
            </div>
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                active ? 'bg-[#6C63FF] border-[#6C63FF]' : 'border-[#1E1E2E]'
              }`}
            >
              {active && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Step 6: Sports & Activities ─── */
function Step6({
  form,
  toggleActivity,
}: {
  form: FormData
  toggleActivity: (item: ActivityOption) => void
}) {
  return (
    <div>
      <p className="text-sm text-[#6B7280] mb-4">Select all that you enjoy (optional)</p>
      <div className="grid grid-cols-3 gap-2.5">
        {ACTIVITY_OPTIONS.map((activity) => {
          const active = form.sports_activities.includes(activity.id)
          return (
            <button
              key={activity.id}
              onClick={() => toggleActivity(activity.id)}
              className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border transition-all duration-200 ${
                active
                  ? 'border-[#6C63FF] bg-[#6C63FF]/10'
                  : 'border-[#1E1E2E] bg-[#13131A] hover:border-[#6C63FF]/40'
              }`}
            >
              <span className="text-xl leading-none">{activity.emoji}</span>
              <span className={`text-xs font-medium leading-tight text-center ${active ? 'text-[#6C63FF]' : 'text-[#6B7280]'}`}>
                {activity.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step 7: Free-Text Goals ─── */
function Step7({
  form,
  update,
}: {
  form: FormData
  update: (field: keyof FormData, value: unknown) => void
}) {
  const fields = [
    {
      key: 'specific_goal' as keyof FormData,
      label: 'Are you training for something specific?',
      placeholder:
        'e.g. Marathon in October, boxing match in 3 months, golf tournament this summer...',
    },
    {
      key: 'injuries_limitations' as keyof FormData,
      label: 'Any pain, injuries, or physical limitations?',
      placeholder:
        'e.g. Left knee pain going up stairs, lower back tightness in the mornings, had shoulder surgery 2 years ago...',
    },
    {
      key: 'personal_context' as keyof FormData,
      label: 'Anything else your trainer should know?',
      placeholder:
        'e.g. I sit at a desk 10 hours a day, I travel for work 2 weeks a month, I used to be a college athlete...',
    },
  ]

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#6B7280] leading-relaxed">
        This is what makes APEX different — the more context you give, the more personalized your plan.
      </p>
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-[#F0F0FF] mb-1.5">
            {label}{' '}
            <span className="text-[#6B7280] font-normal text-xs">(optional)</span>
          </label>
          <textarea
            value={form[key] as string}
            onChange={(e) => update(key, e.target.value)}
            rows={3}
            className="w-full bg-[#13131A] border border-[#1E1E2E] rounded-xl px-4 py-3 text-[#F0F0FF] text-sm focus:outline-none focus:border-[#6C63FF] transition-colors duration-200 placeholder-[#6B7280] resize-none leading-relaxed"
            placeholder={placeholder}
          />
        </div>
      ))}
    </div>
  )
}
