'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { registerServiceWorker, getOfflineQueueCount, syncOfflineQueue, skipWaiting } from '@/lib/serviceWorker'
import { subscribeToPush, isStandalone } from '@/lib/notifications'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  offlineQueueCount: number
  updateAvailable: boolean
  notificationPermission: NotificationPermission
  installPromptEvent: BeforeInstallPromptEvent | null
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: isStandalone(),
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    offlineQueueCount: 0,
    updateAvailable: false,
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
    installPromptEvent: null,
  })

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  // Register SW on mount
  useEffect(() => {
    registerServiceWorker().then((reg) => {
      if (reg) registrationRef.current = reg
    })
  }, [])

  // SW update available
  useEffect(() => {
    const handler = (e: Event) => {
      const { registration } = (e as CustomEvent<{ registration: ServiceWorkerRegistration }>).detail
      registrationRef.current = registration
      setState((s) => ({ ...s, updateAvailable: true }))
    }
    window.addEventListener('sw-update-available', handler)
    return () => window.removeEventListener('sw-update-available', handler)
  }, [])

  // Install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setState((s) => ({ ...s, isInstallable: true, installPromptEvent: e as BeforeInstallPromptEvent }))
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // App installed
  useEffect(() => {
    const handler = () => {
      setState((s) => ({ ...s, isInstalled: true, isInstallable: false, installPromptEvent: null }))
    }
    window.addEventListener('appinstalled', handler)
    return () => window.removeEventListener('appinstalled', handler)
  }, [])

  // Online/offline
  useEffect(() => {
    const onOnline = async () => {
      setState((s) => ({ ...s, isOnline: true }))
      await syncOfflineQueue()
      const count = await getOfflineQueueCount()
      setState((s) => ({ ...s, offlineQueueCount: count }))
    }
    const onOffline = () => setState((s) => ({ ...s, isOnline: false }))

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Sync complete event — refresh queue count
  useEffect(() => {
    const handler = async () => {
      const count = await getOfflineQueueCount()
      setState((s) => ({ ...s, offlineQueueCount: count }))
    }
    window.addEventListener('apex-sync-complete', handler)
    return () => window.removeEventListener('apex-sync-complete', handler)
  }, [])

  // Poll offline queue count
  useEffect(() => {
    const poll = async () => {
      const count = await getOfflineQueueCount()
      setState((s) => ({ ...s, offlineQueueCount: count }))
    }
    poll()
    const iv = setInterval(poll, 10000)
    return () => clearInterval(iv)
  }, [])

  const install = useCallback(async () => {
    if (!state.installPromptEvent) return
    await state.installPromptEvent.prompt()
    const { outcome } = await state.installPromptEvent.userChoice
    if (outcome === 'accepted') {
      setState((s) => ({ ...s, isInstallable: false, installPromptEvent: null }))
    }
  }, [state.installPromptEvent])

  const requestNotifications = useCallback(async () => {
    const sub = await subscribeToPush()
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default'
    setState((s) => ({ ...s, notificationPermission: permission }))
    return sub
  }, [])

  const dismissInstallPrompt = useCallback(() => {
    setState((s) => ({ ...s, isInstallable: false, installPromptEvent: null }))
    localStorage.setItem('apex-install-dismissed', String(Date.now()))
  }, [])

  const applyUpdate = useCallback(() => {
    if (registrationRef.current) skipWaiting(registrationRef.current)
  }, [])

  return { ...state, install, requestNotifications, dismissInstallPrompt, applyUpdate }
}
