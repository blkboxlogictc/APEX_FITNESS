'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Dumbbell, Apple, Wrench, Pill, BarChart2, MessageSquare, Droplets, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { requestNotificationPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/notifications'
import { useToast } from '@/components/ui/Toast'

interface Prefs {
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
}

const DEFAULT_PREFS: Prefs = {
  workout_reminders: true, workout_reminder_time: '07:00', workout_reminder_days: [1, 2, 3, 4, 5],
  nutrition_reminders: true, meal_reminder_times: ['08:00', '12:30', '18:30'],
  prehab_reminders: true, weekly_recap_notification: true, coach_proactive_messages: true,
  supplement_reminders: false, supplement_reminder_time: '08:00',
  water_reminders: false, water_reminder_interval_hours: 2,
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${value ? 'bg-[#6C63FF]' : 'bg-[#2D2D3A]'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${value ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-4 space-y-3">{children}</div>
}

function CategoryHeader({ icon: Icon, label, enabled, onToggle, color }: {
  icon: typeof Bell; label: string; enabled: boolean; onToggle: (v: boolean) => void; color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="flex-1 text-sm font-semibold text-white">{label}</p>
      <Toggle value={enabled} onChange={onToggle} />
    </div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const toast = useToast()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [waterOpen, setWaterOpen] = useState(false)

  const load = useCallback(async () => {
    if ('Notification' in window) setPermission(Notification.permission)
    const res = await fetch('/api/notifications/preferences')
    if (res.ok) {
      const data = await res.json()
      setPrefs({ ...DEFAULT_PREFS, ...data })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission()
    setPermission(perm)
    if (perm === 'granted') {
      await subscribeToPush()
      toast.success('Notifications enabled!')
    } else {
      toast.error('Notifications blocked. Enable in browser settings.')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (permission === 'default') await handleEnableNotifications()
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error()
      toast.success('Preferences saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: number) => {
    setPrefs((p) => ({
      ...p,
      workout_reminder_days: p.workout_reminder_days.includes(day)
        ? p.workout_reminder_days.filter((d) => d !== day)
        : [...p.workout_reminder_days, day],
    }))
  }

  const setMealTime = (index: number, time: string) => {
    const times = [...prefs.meal_reminder_times]
    times[index] = time
    setPrefs((p) => ({ ...p, meal_reminder_times: times }))
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-32">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Notifications</h1>
          <p className="text-xs text-[#6B7280]">Stay on track with smart reminders</p>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {/* Permission status */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
          permission === 'granted' ? 'bg-[#00D4AA]/8 border-[#00D4AA]/30' :
          permission === 'denied' ? 'bg-red-500/8 border-red-500/30' :
          'bg-[#6C63FF]/8 border-[#6C63FF]/30'
        }`}>
          {permission === 'granted' ? <CheckCircle size={20} className="text-[#00D4AA] shrink-0" /> :
           permission === 'denied' ? <XCircle size={20} className="text-red-400 shrink-0" /> :
           <AlertCircle size={20} className="text-[#6C63FF] shrink-0" />}
          <div className="flex-1">
            {permission === 'granted' && <p className="text-sm text-[#00D4AA] font-medium">Notifications enabled</p>}
            {permission === 'denied' && (
              <>
                <p className="text-sm text-red-400 font-medium">Notifications blocked</p>
                <p className="text-xs text-gray-500 mt-0.5">Enable in your browser / OS settings</p>
              </>
            )}
            {permission === 'default' && (
              <>
                <p className="text-sm text-[#6C63FF] font-medium">Enable notifications</p>
                <p className="text-xs text-gray-500 mt-0.5">Get the most from APEX with smart reminders</p>
              </>
            )}
          </div>
          {permission !== 'granted' && permission !== 'denied' && (
            <button
              onClick={handleEnableNotifications}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-[#6C63FF] text-white text-xs font-semibold"
            >
              Enable
            </button>
          )}
        </div>

        {/* Workout reminders */}
        <Card>
          <CategoryHeader icon={Dumbbell} label="Workout Reminders" enabled={prefs.workout_reminders}
            onToggle={(v) => setPrefs((p) => ({ ...p, workout_reminders: v }))} color="#6C63FF" />
          {prefs.workout_reminders && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#6B7280]">Reminder time</p>
                <input type="time" value={prefs.workout_reminder_time}
                  onChange={(e) => setPrefs((p) => ({ ...p, workout_reminder_time: e.target.value }))}
                  className="bg-[#1E1E2E] text-white text-sm rounded-lg px-3 py-1.5 border border-white/5 outline-none" />
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-2">Days</p>
                <div className="flex gap-2">
                  {DAYS.map((d, i) => (
                    <button key={i} onClick={() => toggleDay(i)}
                      className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                        prefs.workout_reminder_days.includes(i) ? 'bg-[#6C63FF] text-white' : 'bg-[#1E1E2E] text-[#6B7280]'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Meal reminders */}
        <Card>
          <CategoryHeader icon={Apple} label="Meal Reminders" enabled={prefs.nutrition_reminders}
            onToggle={(v) => setPrefs((p) => ({ ...p, nutrition_reminders: v }))} color="#00D4AA" />
          {prefs.nutrition_reminders && (
            <div className="space-y-2">
              {MEAL_LABELS.map((label, i) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-xs text-[#6B7280]">{label}</p>
                  <input type="time" value={prefs.meal_reminder_times[i] ?? ''}
                    onChange={(e) => setMealTime(i, e.target.value)}
                    className="bg-[#1E1E2E] text-white text-sm rounded-lg px-3 py-1.5 border border-white/5 outline-none" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Prehab */}
        <Card>
          <CategoryHeader icon={Wrench} label="Prehab Reminders" enabled={prefs.prehab_reminders}
            onToggle={(v) => setPrefs((p) => ({ ...p, prehab_reminders: v }))} color="#FF6B35" />
          {prefs.prehab_reminders && (
            <p className="text-xs text-[#6B7280]">Reminds you in the afternoon when prehab is due based on your active programs</p>
          )}
        </Card>

        {/* Supplements */}
        <Card>
          <CategoryHeader icon={Pill} label="Supplement Reminders" enabled={prefs.supplement_reminders}
            onToggle={(v) => setPrefs((p) => ({ ...p, supplement_reminders: v }))} color="#FECB02" />
          {prefs.supplement_reminders && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#6B7280]">Reminder time</p>
              <input type="time" value={prefs.supplement_reminder_time}
                onChange={(e) => setPrefs((p) => ({ ...p, supplement_reminder_time: e.target.value }))}
                className="bg-[#1E1E2E] text-white text-sm rounded-lg px-3 py-1.5 border border-white/5 outline-none" />
            </div>
          )}
        </Card>

        {/* Weekly recap */}
        <Card>
          <CategoryHeader icon={BarChart2} label="Weekly Recap" enabled={prefs.weekly_recap_notification}
            onToggle={(v) => setPrefs((p) => ({ ...p, weekly_recap_notification: v }))} color="#6C63FF" />
          <p className="text-xs text-[#6B7280]">Every Sunday — your AI coach reviews your week</p>
        </Card>

        {/* Coach insights */}
        <Card>
          <CategoryHeader icon={MessageSquare} label="Coach Insights" enabled={prefs.coach_proactive_messages}
            onToggle={(v) => setPrefs((p) => ({ ...p, coach_proactive_messages: v }))} color="#00D4AA" />
          <p className="text-xs text-[#6B7280]">Proactive tips based on your data. Max once per day.</p>
        </Card>

        {/* Water reminders */}
        <button onClick={() => setWaterOpen((o) => !o)} className="w-full text-left">
          <Card>
            <CategoryHeader icon={Droplets} label="Water Reminders" enabled={prefs.water_reminders}
              onToggle={(v) => { setPrefs((p) => ({ ...p, water_reminders: v })); setWaterOpen(v) }} color="#38BDF8" />
            {(waterOpen || prefs.water_reminders) && (
              <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs text-[#6B7280]">Every</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPrefs((p) => ({ ...p, water_reminder_interval_hours: Math.max(1, p.water_reminder_interval_hours - 1) }))}
                    className="w-8 h-8 rounded-xl bg-[#1E1E2E] text-white text-lg">−</button>
                  <span className="text-sm font-semibold w-12 text-center">{prefs.water_reminder_interval_hours}h</span>
                  <button onClick={() => setPrefs((p) => ({ ...p, water_reminder_interval_hours: Math.min(8, p.water_reminder_interval_hours + 1) }))}
                    className="w-8 h-8 rounded-xl bg-[#1E1E2E] text-white text-lg">+</button>
                </div>
              </div>
            )}
          </Card>
        </button>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-safe pt-3 bg-[#0A0A0F]/90 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl text-white font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
