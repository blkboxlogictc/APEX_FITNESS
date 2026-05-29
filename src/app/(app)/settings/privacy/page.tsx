'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Database, Brain, Clock, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function Section({ icon: Icon, title, children, color = '#6C63FF' }: {
  icon: typeof Shield; title: string; children: React.ReactNode; color?: string
}) {
  return (
    <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function PrivacyPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setExporting(false); return }

    const tables = [
      'user_profiles', 'workout_sessions', 'workout_sets', 'food_logs',
      'activity_logs', 'goals', 'weekly_recaps', 'body_measurements',
      'pain_screenings', 'prehab_logs', 'chat_messages',
    ]
    const exportData: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: user.id }

    await Promise.all(tables.map(async (t) => {
      const { data } = await supabase.from(t).select('*').eq('user_id', user.id)
      exportData[t] = data ?? []
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apex-data-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-24">
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold">Privacy & Data</h1>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
        <Section icon={Database} title="What we store">
          <ul className="space-y-1.5 text-sm text-gray-400">
            {[
              'Your profile (name, age, height, weight, goals)',
              'Workout sessions, sets, and exercise history',
              'Food logs, nutrition plans, and supplement stack',
              'Activity logs and sport programs',
              'Pain screenings and prehab program data',
              'Goals, progress photos, and body measurements',
              'Coach conversation history (last 30 days)',
              'Weekly recap data and APEX scores',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-[#6C63FF] mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 pt-2">All data is stored in Supabase (PostgreSQL) with row-level security. Only you can access your data.</p>
        </Section>

        <Section icon={Brain} title="What is sent to OpenAI" color="#FECB02">
          <p className="text-sm text-gray-400">When you use the AI coach or generate plans, the following is sent to OpenAI&apos;s GPT-4o API:</p>
          <ul className="space-y-1.5 text-sm text-gray-400 mt-2">
            {[
              'Your profile summary (name, age, goals, experience)',
              'Your current plans and recent workout history',
              'Food logs and nutrition targets',
              'Conversation messages you send',
              'Pain screening data when relevant',
              'Photos you submit for analysis (meal photos, form checks)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-[#FECB02] mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 pt-2">OpenAI does not use API data to train their models by default. See openai.com/policies for details.</p>
        </Section>

        <Section icon={Clock} title="Data retention" color="#00D4AA">
          <div className="space-y-2 text-sm text-gray-400">
            <p>• Chat messages: retained for 90 days, then automatically deleted</p>
            <p>• Workout and nutrition data: retained indefinitely while your account is active</p>
            <p>• Deleting your account removes all data permanently within 30 days</p>
          </div>
        </Section>

        <Section icon={Shield} title="Security" color="#00D4AA">
          <div className="space-y-2 text-sm text-gray-400">
            <p>• All data encrypted in transit (TLS 1.3) and at rest (AES-256)</p>
            <p>• Authentication via Supabase Auth with JWT tokens</p>
            <p>• Row-level security ensures data isolation between users</p>
            <p>• No third-party analytics or tracking scripts</p>
          </div>
        </Section>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-[#6C63FF]/30 text-[#6C63FF] text-sm font-medium active:bg-[#6C63FF]/10 transition-colors"
        >
          <Download size={16} />
          {exporting ? 'Preparing export...' : 'Download My Data (JSON)'}
        </button>
      </div>
    </div>
  )
}
