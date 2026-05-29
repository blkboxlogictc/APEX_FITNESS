'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User, Bell, Dumbbell, Apple, Heart, Info, ChevronRight, LogOut,
  Shield, Download, Trash2, Zap,
} from 'lucide-react'

interface Profile {
  full_name: string
  email?: string
  experience_level: string
  fitness_goal: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider px-1 mb-2">{title}</p>
      <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, sublabel, href, iconColor = '#6C63FF', danger = false, onPress }: {
  icon: typeof User; label: string; sublabel?: string; href?: string; iconColor?: string; danger?: boolean; onPress?: () => void
}) {
  const router = useRouter()
  const handlePress = () => {
    if (onPress) { onPress(); return }
    if (href) router.push(href)
  }

  return (
    <button
      onClick={handlePress}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-[#1E1E2E] last:border-0 active:bg-white/5 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${iconColor}18` }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-[#F0F0FF]'}`}>{label}</p>
        {sublabel && <p className="text-xs text-[#6B7280] mt-0.5">{sublabel}</p>}
      </div>
      <ChevronRight size={16} className="text-[#6B7280] shrink-0" />
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email ?? '')
    const { data } = await supabase.from('user_profiles').select('full_name, experience_level, fitness_goal').eq('id', user.id).single()
    if (data) setProfile(data as Profile)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleExportData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const tables = ['user_profiles', 'workout_sessions', 'food_logs', 'activity_logs', 'goals', 'weekly_recaps', 'body_measurements']
    const exportData: Record<string, unknown> = {}

    await Promise.all(tables.map(async (t) => {
      const { data } = await supabase.from(t).select('*').eq('user_id', user.id)
      exportData[t] = data ?? []
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apex-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const initials = profile?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-24">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8 p-4 bg-[#13131A] border border-[#1E1E2E] rounded-2xl">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">{profile?.full_name ?? '—'}</p>
            <p className="text-sm text-[#6B7280] truncate">{email}</p>
            <p className="text-xs text-[#6B7280] mt-0.5 capitalize">{profile?.experience_level} · {profile?.fitness_goal?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={() => router.push('/settings/edit-profile')} className="text-xs text-[#6C63FF] font-medium shrink-0">Edit</button>
        </div>

        <Section title="Account">
          <Row icon={User} label="Edit Profile" sublabel="Name, age, height, weight" href="/settings/edit-profile" />
          <Row icon={Zap} label="Change Goals" sublabel="Update fitness objectives" href="/onboarding" iconColor="#FECB02" />
          <Row icon={Shield} label="Privacy & Data" href="/settings/privacy" iconColor="#00D4AA" />
        </Section>

        <Section title="App Preferences">
          <Row icon={Bell} label="Notifications" sublabel="Reminders, recap alerts" href="/settings/notifications" iconColor="#FF6B35" />
        </Section>

        <Section title="Fitness">
          <Row icon={Dumbbell} label="Update Equipment" href="/onboarding" iconColor="#6C63FF" />
          <Row icon={Dumbbell} label="Regenerate Fitness Plan" sublabel="Creates a new plan based on your profile" href="/home" iconColor="#6C63FF" />
        </Section>

        <Section title="Nutrition">
          <Row icon={Apple} label="Dietary Preferences" href="/onboarding" iconColor="#00D4AA" />
          <Row icon={Apple} label="My Supplement Stack" href="/nutrition/supplements" iconColor="#00D4AA" />
        </Section>

        <Section title="Body & Health">
          <Row icon={Heart} label="Joint Health History" href="/joint-health/history" iconColor="#E63312" />
          <Row icon={Heart} label="Progress Photos" href="/progress/photos" iconColor="#E63312" />
        </Section>

        <Section title="About">
          <Row icon={Info} label="App Version" sublabel="1.0.0" iconColor="#6B7280" onPress={() => {}} />
          <Row icon={Shield} label="Privacy Policy" iconColor="#6B7280" onPress={() => {}} />
          <Row icon={Info} label="Terms of Service" iconColor="#6B7280" onPress={() => {}} />
        </Section>

        <Section title="Data">
          <Row icon={Download} label="Export My Data" sublabel="Download all your data as JSON" iconColor="#6C63FF" onPress={handleExportData} />
          <Row icon={Trash2} label="Delete Account" sublabel="Permanently delete all data" iconColor="#E63312" danger onPress={() => {
            if (confirm('Are you sure? This will permanently delete all your data and cannot be undone.')) {
              alert('Please contact support to complete account deletion.')
            }
          }} />
        </Section>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-500/20 text-red-400 text-sm font-medium active:bg-red-500/10 transition-colors mb-8"
        >
          <LogOut size={16} />
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  )
}
