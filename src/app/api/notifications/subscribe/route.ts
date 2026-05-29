import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint, p256dh, auth_key, device_name, user_agent } = await req.json() as {
      endpoint: string; p256dh: string; auth_key: string; device_name?: string; user_agent?: string
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth_key,
        device_name: device_name ?? null,
        user_agent: user_agent ?? null,
        is_active: true,
      }, { onConflict: 'user_id,endpoint' })

    if (error) return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })

    // Create default notification preferences if not exists
    await supabase.from('notification_preferences').upsert(
      { user_id: user.id },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('subscribe POST error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await req.json() as { endpoint: string }

    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('subscribe DELETE error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
