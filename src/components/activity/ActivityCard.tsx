'use client'

import { useRef, useState } from 'react'
import { Clock, Flame, Trash2 } from 'lucide-react'
import { CATEGORY_EMOJIS, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/activities'
import type { ActivityCategory } from '@/lib/activities'
import type { ActivityLog } from '@/types/activities'

interface ActivityCardProps {
  log: ActivityLog
  onDelete: (id: string) => void
}

export default function ActivityCard({ log, onDelete }: ActivityCardProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startXRef = useRef(0)
  const SWIPE_THRESHOLD = 80

  const category = log.category as ActivityCategory
  const color = CATEGORY_COLORS[category] ?? '#6B7280'
  const emoji = CATEGORY_EMOJIS[category] ?? '🏃'
  const label = CATEGORY_LABELS[category] ?? log.category

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) {
      return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    }
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    setSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return
    const dx = e.touches[0].clientX - startXRef.current
    if (dx < 0) setOffsetX(Math.max(dx, -SWIPE_THRESHOLD - 20))
  }

  const handleTouchEnd = () => {
    setSwiping(false)
    if (offsetX < -SWIPE_THRESHOLD) {
      onDelete(log.id)
    } else {
      setOffsetX(0)
    }
  }

  const deleteProgress = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1)

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete reveal background */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-4 rounded-2xl"
        style={{ background: `rgba(239,83,80,${0.1 + deleteProgress * 0.7})` }}
      >
        <Trash2 size={18} style={{ color: `rgba(239,83,80,${0.4 + deleteProgress * 0.6})` }} />
      </div>

      {/* Card content */}
      <div
        className="relative bg-[#13131A] border border-[#1E1E2E] rounded-2xl p-3.5 flex items-center gap-3"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.3s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ background: `${color}18` }}
        >
          {emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[#F0F0FF] text-sm font-semibold truncate">{log.activity_name}</p>
          <p className="text-[#6B7280] text-[10px]">{label} · {formatTime(log.logged_at)}</p>
        </div>

        {/* Stats */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <Clock size={10} className="text-[#6B7280]" />
            <span className="text-[#F0F0FF] text-xs font-semibold">{log.duration_minutes} min</span>
          </div>
          <div className="flex items-center gap-1 justify-end mt-0.5">
            <Flame size={10} className="text-[#FF6B35]" />
            <span className="text-[#FF6B35] text-xs font-medium">{log.calories_burned} cal</span>
          </div>
        </div>
      </div>
    </div>
  )
}
