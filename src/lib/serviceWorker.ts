'use client'

let registration: ServiceWorkerRegistration | null = null

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

  try {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

    registration.addEventListener('updatefound', () => {
      const newWorker = registration?.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { registration } }))
        }
      })
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        window.dispatchEvent(new CustomEvent('apex-sync-complete'))
      }
    })

    return registration
  } catch (err) {
    console.error('SW registration failed:', err)
    return null
  }
}

export function checkForUpdate(reg: ServiceWorkerRegistration): void {
  reg.update().catch(() => null)
}

export async function getOfflineQueueCount(): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0
  return new Promise((resolve) => {
    const req = indexedDB.open('apex-offline', 1)
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('offline_queue')) { resolve(0); return }
      const tx = db.transaction('offline_queue', 'readonly')
      const countReq = tx.objectStore('offline_queue').count()
      countReq.onsuccess = () => resolve(countReq.result)
      countReq.onerror = () => resolve(0)
    }
    req.onerror = () => resolve(0)
  })
}

export async function syncOfflineQueue(): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
  if ('sync' in (registration ?? {})) {
    try {
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-queue')
    } catch {
      // Background sync not supported; the SW will retry on next fetch
    }
  }
}

export function skipWaiting(reg: ServiceWorkerRegistration): void {
  reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
}
