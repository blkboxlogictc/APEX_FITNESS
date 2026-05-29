import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single()

      if (!profile?.onboarding_complete) {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/home', requestUrl.origin))
}
