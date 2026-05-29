import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import UpdateBanner from '@/components/pwa/UpdateBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_complete')
    .eq('id', session.user.id)
    .single()

  if (!profile?.onboarding_complete) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <UpdateBanner />
      <main className="max-w-[430px] mx-auto min-h-screen pb-nav">{children}</main>
      <BottomNav />
      <InstallPrompt />
    </div>
  )
}
