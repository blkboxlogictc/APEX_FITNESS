'use client'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface WeeklyActivityBarProps {
  dailyMinutes: { date: string; minutes: number }[]
  goalMinutes: number
}

export default function WeeklyActivityBar({ dailyMinutes, goalMinutes }: WeeklyActivityBarProps) {
  const maxVal = Math.max(...dailyMinutes.map((d) => d.minutes), goalMinutes, 1)
  const BAR_H = 72
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="flex items-end justify-between gap-1.5 px-1" style={{ height: BAR_H + 32 }}>
      {dailyMinutes.map((day, i) => {
        const isToday = day.date === todayStr
        const barH = Math.max((day.minutes / maxVal) * BAR_H, day.minutes > 0 ? 4 : 2)
        const goalH = (goalMinutes / maxVal) * BAR_H
        const metGoal = day.minutes >= goalMinutes && day.minutes > 0

        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1" style={{ height: BAR_H + 24 }}>
            {/* Minutes label above bar */}
            <div style={{ height: BAR_H - barH, flexShrink: 0 }} />
            <div className="w-full relative flex flex-col justify-end" style={{ height: barH }}>
              <div
                className="w-full rounded-t-lg transition-all duration-700"
                style={{
                  height: `${barH}px`,
                  background: metGoal
                    ? 'linear-gradient(180deg, #00D4AA, #00D4AA80)'
                    : isToday
                    ? 'linear-gradient(180deg, #6C63FF, #6C63FF60)'
                    : day.minutes > 0
                    ? 'linear-gradient(180deg, #6B7280, #6B728040)'
                    : '#1E1E2E',
                  minHeight: 3,
                }}
              />
              {/* Goal line */}
              <div
                className="absolute left-0 right-0 border-t border-dashed pointer-events-none"
                style={{
                  bottom: goalH,
                  borderColor: 'rgba(108,99,255,0.3)',
                }}
              />
            </div>
            {/* Day label */}
            <span
              className="text-[10px] font-medium mt-1"
              style={{ color: isToday ? '#6C63FF' : '#6B7280' }}
            >
              {DAY_LABELS[i]}
            </span>
            {/* Minutes */}
            {day.minutes > 0 && (
              <span className="text-[8px]" style={{ color: metGoal ? '#00D4AA' : '#6B7280' }}>
                {day.minutes}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
