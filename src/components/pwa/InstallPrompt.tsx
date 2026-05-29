'use client'

import { useState, useEffect } from 'react'
import { X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'
import { isIOS, isStandalone } from '@/lib/notifications'

const DISMISS_KEY = 'apex-install-dismissed'
const VISIT_COUNT_KEY = 'apex-visit-count'

function shouldShow(isInstallable: boolean, isIosDevice: boolean): boolean {
  if (isStandalone()) return false
  if (!isInstallable && !isIosDevice) return false

  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (dismissed) {
    const daysSince = (Date.now() - parseInt(dismissed)) / 86400000
    if (daysSince < 7) return false
  }

  const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? '0')
  return visits >= 2
}

export default function InstallPrompt() {
  const { isInstallable, isInstalled, install, dismissInstallPrompt } = usePWA()
  const [show, setShow] = useState(false)
  const [isIosDevice, setIsIosDevice] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const ios = isIOS()
    setIsIosDevice(ios)

    // Increment visit count
    const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? '0')
    localStorage.setItem(VISIT_COUNT_KEY, String(visits + 1))

    // Delay show by 3s to not interrupt initial load
    const timer = setTimeout(() => {
      setShow(shouldShow(isInstallable, ios))
    }, 3000)

    return () => clearTimeout(timer)
  }, [isInstallable])

  // Re-check when installable changes
  useEffect(() => {
    if (isInstallable) {
      const timer = setTimeout(() => setShow(shouldShow(true, isIosDevice)), 3000)
      return () => clearTimeout(timer)
    }
  }, [isInstallable, isIosDevice])

  if (!show || isInstalled || installed) return null

  const handleInstall = async () => {
    setInstalling(true)
    await install()
    setInstalling(false)
    setInstalled(true)
    setTimeout(() => setShow(false), 2500)
  }

  const handleDismiss = () => {
    setShow(false)
    dismissInstallPrompt()
  }

  if (installed) {
    return (
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4 animate-slide-up">
        <div className="max-w-[430px] mx-auto">
          <div className="bg-[#00D4AA]/10 border border-[#00D4AA]/30 rounded-2xl p-4 text-center">
            <p className="text-[#00D4AA] font-semibold">APEX is now on your home screen! 🎉</p>
          </div>
        </div>
      </div>
    )
  }

  if (isIosDevice && !isInstallable) {
    return (
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4 animate-slide-up">
        <div className="max-w-[430px] mx-auto">
          <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-[#6C63FF]" />
                <p className="font-semibold text-white text-sm">Install APEX on iPhone</p>
              </div>
              <button onClick={handleDismiss} className="text-gray-500"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center shrink-0">
                  <Share size={16} className="text-[#6C63FF]" />
                </div>
                <p className="text-sm text-gray-300">Tap the <span className="text-white font-medium">Share</span> button at the bottom of Safari</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#00D4AA]/10 flex items-center justify-center shrink-0">
                  <PlusSquare size={16} className="text-[#00D4AA]" />
                </div>
                <p className="text-sm text-gray-300">Scroll down and tap <span className="text-white font-medium">Add to Home Screen</span></p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="mt-4 w-full py-3 rounded-xl bg-[#1E1E2E] text-gray-400 text-sm font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4 animate-slide-up">
      <div className="max-w-[430px] mx-auto">
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-5 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
                A
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Add APEX to your home screen</p>
                <p className="text-xs text-gray-500 mt-0.5">Get instant access — no app store needed</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-gray-500 shrink-0 ml-2"><X size={18} /></button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              {installing ? 'Installing...' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-5 py-3 rounded-xl bg-[#1E1E2E] text-gray-400 text-sm font-medium"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
