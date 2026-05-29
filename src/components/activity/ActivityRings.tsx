'use client'

import { useEffect, useRef } from 'react'

interface ActivityRingsProps {
  activeMinutes: number
  activeMinutesGoal: number
  caloriesBurned: number
  caloriesGoal: number
  sessions: number
  sessionsGoal: number
  size?: number
}

interface RingConfig {
  radius: number
  color: string
  trackColor: string
  label: string
  value: number
  goal: number
  unit: string
}

export default function ActivityRings({
  activeMinutes,
  activeMinutesGoal,
  caloriesBurned,
  caloriesGoal,
  sessions,
  sessionsGoal,
  size = 140,
}: ActivityRingsProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const cx = size / 2
  const cy = size / 2
  const strokeWidth = size * 0.08

  const rings: RingConfig[] = [
    {
      radius: cx - strokeWidth / 2 - 2,
      color: '#FF6B35',
      trackColor: 'rgba(255,107,53,0.12)',
      label: 'Move',
      value: activeMinutes,
      goal: activeMinutesGoal,
      unit: 'min',
    },
    {
      radius: cx - strokeWidth * 1.5 - 6,
      color: '#00D4AA',
      trackColor: 'rgba(0,212,170,0.12)',
      label: 'Burn',
      value: caloriesBurned,
      goal: caloriesGoal,
      unit: 'cal',
    },
    {
      radius: cx - strokeWidth * 2.5 - 10,
      color: '#6C63FF',
      trackColor: 'rgba(108,99,255,0.12)',
      label: 'Sessions',
      value: sessions,
      goal: sessionsGoal,
      unit: '',
    },
  ]

  useEffect(() => {
    if (!svgRef.current) return
    const paths = svgRef.current.querySelectorAll<SVGCircleElement>('.ring-progress')
    paths.forEach((el, i) => {
      const circumference = 2 * Math.PI * rings[i].radius
      const progress = Math.min(rings[i].value / Math.max(rings[i].goal, 1), 1)
      el.style.strokeDasharray = `${circumference}`
      el.style.strokeDashoffset = `${circumference}`
      setTimeout(() => {
        el.style.transition = `stroke-dashoffset 0.9s ease ${i * 0.2}s`
        el.style.strokeDashoffset = `${circumference * (1 - progress)}`
      }, 50)
    })
  }, [activeMinutes, caloriesBurned, sessions]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-4">
      {/* SVG Rings */}
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, i) => {
          const circumference = 2 * Math.PI * ring.radius
          return (
            <g key={i}>
              {/* Track */}
              <circle
                cx={cx}
                cy={cy}
                r={ring.radius}
                fill="none"
                stroke={ring.trackColor}
                strokeWidth={strokeWidth}
              />
              {/* Progress */}
              <circle
                className="ring-progress"
                cx={cx}
                cy={cy}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ filter: `drop-shadow(0 0 4px ${ring.color}60)` }}
              />
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2.5">
        {rings.map((ring, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ring.color }} />
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold font-space-grotesk" style={{ color: ring.color }}>
                  {ring.value.toLocaleString()}
                </span>
                <span className="text-[10px] text-[#6B7280]">
                  / {ring.goal.toLocaleString()}{ring.unit ? ` ${ring.unit}` : ''}
                </span>
              </div>
              <p className="text-[10px] text-[#6B7280] leading-none">{ring.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
