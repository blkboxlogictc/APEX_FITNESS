// npm install web-push @types/web-push
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs' // web-push requires Node.js runtime

interface SendPayload {
  user_id: string
  title: string
  body: string
  url?: string
  tag?: string
  actions?: { action: string; title: string }[]
  image?: string
  requireInteraction?: boolean
}

export async function POST(req: NextRequest) {
  // Internal route — protect with cron secret
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Dynamic import to avoid edge runtime issues
    const webpush = await import('web-push')

    const vapidEmail = process.env.VAPID_EMAIL
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY

    if (!vapidEmail || !vapidPublic || !vapidPrivate) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    webpush.default.setVapidDetails(`mailto:${vapidEmail}`, vapidPublic, vapidPrivate)

    const payload = await req.json() as SendPayload
    const supabase = await createClient()

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', payload.user_id)
      .eq('is_active', true)

    if (!subscriptions?.length) {
      return NextResponse.json({ sent: 0 })
    }

    const notification = {
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/home',
      tag: payload.tag ?? 'apex',
      actions: payload.actions ?? [],
      image: payload.image,
      requireInteraction: payload.requireInteraction ?? false,
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(notification)
        )
      )
    )

    // Deactivate expired/invalid subscriptions (410 Gone)
    const expiredEndpoints: string[] = []
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'rejected') {
        const err = result.reason as { statusCode?: number }
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(subscriptions[i].endpoint)
        }
      }
    }

    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', payload.user_id)
        .in('endpoint', expiredEndpoints)
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return NextResponse.json({ sent })
  } catch (err) {
    console.error('notifications/send error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
