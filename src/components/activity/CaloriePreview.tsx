'use client'

import { Flame } from 'lucide-react'

interface CaloriePreviewProps {
  met: number
  durationMinutes: number
  weightKg: number
  activityName: string
}

export default function CaloriePreview({
  met,
  durationMinutes,
  weightKg,
  activityName,
}: CaloriePreviewProps) {
  const calories = Math.round(met * weightKg * (durationMinutes / 60))
  const intensity = met < 3 ? 'Light' : met < 6 ? 'Moderate' : met < 9 ? 'Vigorous' : 'Very Vigorous'
  const intensityColor = met < 3 ? '#6B7280' : met < 6 ? '#00D4AA' : met < 9 ? '#FFB347' : '#FF6B35'

  return (
    <div
      className="rounded-xl p-3 border"
      style={{ background: 'rgba(255,107,53,0.06)', borderColor: 'rgba(255,107,53,0.2)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,107,53,0.15)' }}
          >
            <Flame size={14} className="text-[#FF6B35]" />
          </div>
          <div>
            <p className="text-[#FF6B35] text-lg font-bold font-space-grotesk leading-none">
              ~{calories.toLocaleString()}
            </p>
            <p className="text-[#6B7280] text-[10px]">calories burned</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold" style={{ color: intensityColor }}>
            {intensity}
          </p>
          <p className="text-[10px] text-[#6B7280]">MET {met.toFixed(1)}</p>
        </div>
      </div>
      {weightKg !== 75 && (
        <p className="text-[10px] text-[#6B7280] mt-1.5">
          Based on {Math.round(weightKg * 2.205)} lbs body weight · {durationMinutes} min {activityName}
        </p>
      )}
    </div>
  )
}
