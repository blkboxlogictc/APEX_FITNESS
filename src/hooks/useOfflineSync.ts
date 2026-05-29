'use client'

import { useState, useEffect, useCallback } from 'react'
import { getOfflineQueueCount, syncOfflineQueue } from '@/lib/serviceWorker'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)

  const refreshCount = useCallback(async () => {
    const count = await getOfflineQueueCount()
    setPendingCount(count)
  }, [])

  const queueOperation = useCallback(async (fn: () => Promise<Response>): Promise<Response | null> => {
    try {
      const res = await fn()
      return res
    } catch {
      // The SW will have queued it if it's a queued path
      await refreshCount()
      return null
    }
  }, [refreshCount])

  useEffect(() => {
    refreshCount()

    const onOnline = async () => {
      setIsOnline(true)
      setSyncing(true)
      await syncOfflineQueue()
      await new Promise((r) => setTimeout(r, 1500)) // give SW time to process
      await refreshCount()
      setSyncing(false)
      setLastSyncAt(new Date())
    }
    const onOffline = () => setIsOnline(false)
    const onSyncComplete = async () => {
      await refreshCount()
      setSyncing(false)
      setLastSyncAt(new Date())
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('apex-sync-complete', onSyncComplete)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('apex-sync-complete', onSyncComplete)
    }
  }, [refreshCount])

  return { isOnline, pendingCount, syncing, lastSyncAt, queueOperation, refreshCount }
}

export function haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
