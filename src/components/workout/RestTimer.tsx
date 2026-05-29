'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface RestTimerProps {
  duration: number
  onComplete: () => void
  onSkip: () => void
}

export default function RestTimer({ duration, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    setRemaining(duration)
    let current = duration
    const hiddenAt = { value: null as number | null }

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt.value = Date.now()
      } else if (hiddenAt.value !== null) {
        const elapsed = Math.floor((Date.now() - hiddenAt.value) / 1000)
        current = Math.max(0, current - elapsed)
        setRemaining(current)
        hiddenAt.value = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    const timer = setInterval(() => {
      current = Math.max(0, current - 1)
      setRemaining(current)
      if (current <= 0) {
        clearInterval(timer)
        navigator.vibrate?.([200, 100, 200])
        onCompleteRef.current()
      }
    }, 1000)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [duration])

  const r = 46
  const circumference = 2 * Math.PI * r
  const progress = duration > 0 ? remaining / duration : 0
  const strokeOffset = circumference * (1 - progress)

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  const color = remaining > duration * 0.5
    ? '#00D4AA'
    : remaining > duration * 0.25
    ? '#FFB347'
    : '#FF6B35'

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-20 rounded-2xl"
      style={{ background: 'rgba(10,10,15,0.95)' }}
    >
      <p className="text-[#6B7280] text-xs font-medium uppercase tracking-widest mb-6">
        Rest
      </p>

      <div className="relative w-32 h-32 mb-6">
        <svg className="-rotate-90" width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} stroke="#1E1E2E" strokeWidth="8" fill="none" />
          <circle
            cx="64" cy="64" r={r}
            stroke={color} strokeWidth="8" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold font-space-grotesk text-[#F0F0FF] tabular-nums">
            {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : seconds}
          </span>
        </div>
      </div>

      <p className="text-[#6B7280] text-sm mb-8">
        {remaining > 0 ? 'seconds remaining' : 'Rest complete!'}
      </p>

      <button
        onClick={onSkip}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#1E1E2E] text-[#6B7280] text-sm font-medium active:opacity-70 transition-opacity"
      >
        <X size={14} />
        Skip rest
      </button>
    </div>
  )
}
