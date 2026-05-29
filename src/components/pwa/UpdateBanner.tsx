'use client'

import { usePWA } from '@/hooks/usePWA'
import { RefreshCw, X } from 'lucide-react'
import { useState } from 'react'

export default function UpdateBanner() {
  const { updateAvailable, applyUpdate } = usePWA()
  const [dismissed, setDismissed] = useState(false)

  if (!updateAvailable || dismissed) return null

  const handleUpdate = () => {
    applyUpdate()
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="max-w-[430px] mx-auto px-4 pt-safe">
        <div className="mt-2 flex items-center gap-3 bg-[#1E1E2E] border border-[#6C63FF]/40 rounded-2xl px-4 py-3 shadow-xl">
          <div className="w-8 h-8 rounded-xl bg-[#6C63FF]/15 flex items-center justify-center shrink-0">
            <RefreshCw size={16} className="text-[#6C63FF]" />
          </div>
          <p className="flex-1 text-sm text-white">APEX update available</p>
          <button
            onClick={handleUpdate}
            className="text-xs font-semibold text-[#6C63FF] px-3 py-1.5 rounded-xl bg-[#6C63FF]/10 active:bg-[#6C63FF]/20 transition-colors"
          >
            Update Now
          </button>
          <button onClick={() => setDismissed(true)} className="text-gray-500 active:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
