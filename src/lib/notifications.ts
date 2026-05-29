'use client'

export function getVapidPublicKey(): Uint8Array {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
  const base64 = key.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return null

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      await syncSubscriptionToServer(existing)
      return existing
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: getVapidPublicKey() as unknown as BufferSource,
    })

    await syncSubscriptionToServer(subscription)
    return subscription
  } catch (err) {
    console.error('Push subscription failed:', err)
    return null
  }
}

async function syncSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON()
  const deviceName = getDeviceName()

  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh,
      auth_key: json.keys?.auth,
      device_name: deviceName,
      user_agent: navigator.userAgent,
    }),
  })
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const reg = await navigator.serviceWorker.ready
  const subscription = await reg.pushManager.getSubscription()
  if (!subscription) return

  await subscription.unsubscribe()
  await fetch('/api/notifications/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
}

function getDeviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) {
    const match = ua.match(/iPhone OS ([\d_]+)/)
    return match ? `iPhone (iOS ${match[1].replace(/_/g, '.')})` : 'iPhone'
  }
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/)
    return match ? `Android ${match[1]}` : 'Android'
  }
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Unknown Device'
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
}
