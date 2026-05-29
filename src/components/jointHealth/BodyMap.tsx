'use client'

import { useState } from 'react'
import type { JointRegion } from '@/lib/jointHealth/knowledgeBase'

interface RegionStatus {
  joint: JointRegion
  active: boolean
  resolved: boolean
  painLevel?: number
}

interface Props {
  statuses?: RegionStatus[]
  onJointTap: (joint: JointRegion) => void
}

type View = 'front' | 'back'

interface RegionDef {
  joint: JointRegion
  label: string
  frontEl?: React.ReactNode
  backEl?: React.ReactNode
}

function regionColor(status: RegionStatus | undefined, defaultFill: string) {
  if (!status) return defaultFill
  if (status.active) {
    const lvl = status.painLevel ?? 5
    return lvl >= 6 ? '#E63312' : lvl >= 4 ? '#EE8100' : '#FF6B35'
  }
  if (status.resolved) return '#00D4AA'
  return defaultFill
}

function regionOpacity(status: RegionStatus | undefined) {
  if (!status) return 0.4
  if (status.active) return 1
  if (status.resolved) return 0.7
  return 0.4
}

export default function BodyMap({ statuses = [], onJointTap }: Props) {
  const [view, setView] = useState<View>('front')

  const getStatus = (joint: JointRegion) => statuses.find(s => s.joint === joint)

  const regionProps = (joint: JointRegion, baseFill = '#6C63FF') => {
    const s = getStatus(joint)
    return {
      fill: regionColor(s, baseFill),
      fillOpacity: regionOpacity(s),
      stroke: s?.active ? regionColor(s, baseFill) : '#6C63FF',
      strokeOpacity: s?.active ? 0.6 : 0.3,
      strokeWidth: s?.active ? 1.5 : 0.5,
      onClick: () => onJointTap(joint),
      style: { cursor: 'pointer' },
      className: s?.active ? 'animate-pulse' : '',
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Front / Back toggle */}
      <div className="flex gap-1 mb-4 bg-[#1E1E2E] rounded-full p-1">
        {(['front', 'back'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-5 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
              view === v ? 'bg-[#6C63FF] text-white' : 'text-white/50'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 140 330"
        width="160"
        height="280"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* Head */}
        <ellipse cx="70" cy="22" rx="17" ry="19" fill="#3A3A5C" fillOpacity={0.6} />

        {/* Neck */}
        <rect
          x="63" y="38" width="14" height="12" rx="4"
          {...regionProps('neck', '#9B8FFF')}
        />

        {/* Shoulders */}
        {view === 'front' ? (
          <>
            <ellipse cx="38" cy="57" rx="20" ry="12" {...regionProps('shoulder', '#6C63FF')} />
            <ellipse cx="102" cy="57" rx="20" ry="12" {...regionProps('shoulder', '#6C63FF')} />
          </>
        ) : (
          <>
            <ellipse cx="38" cy="57" rx="20" ry="12" {...regionProps('upper_back', '#6C63FF')} />
            <ellipse cx="102" cy="57" rx="20" ry="12" {...regionProps('upper_back', '#6C63FF')} />
          </>
        )}

        {/* Upper arms */}
        <ellipse cx="22" cy="84" rx="9" ry="22" {...regionProps('elbow', '#5A52CC')} />
        <ellipse cx="118" cy="84" rx="9" ry="22" {...regionProps('elbow', '#5A52CC')} />

        {/* Elbows */}
        <circle cx="21" cy="108" r="8" {...regionProps('elbow', '#4A44BB')} />
        <circle cx="119" cy="108" r="8" {...regionProps('elbow', '#4A44BB')} />

        {/* Forearms */}
        <ellipse cx="20" cy="130" rx="7" ry="17" {...regionProps('wrist', '#5A52CC')} />
        <ellipse cx="120" cy="130" rx="7" ry="17" {...regionProps('wrist', '#5A52CC')} />

        {/* Wrists */}
        <ellipse cx="19" cy="153" rx="7" ry="7" {...regionProps('wrist', '#4A44BB')} />
        <ellipse cx="121" cy="153" rx="7" ry="7" {...regionProps('wrist', '#4A44BB')} />

        {/* Torso upper (chest / upper back) */}
        <path
          d="M 50,50 L 90,50 L 96,100 L 44,100 Z"
          rx="4"
          {...regionProps(view === 'front' ? 'upper_back' : 'upper_back', '#5248A0')}
        />

        {/* Torso lower (abs / lower back) */}
        <path
          d="M 44,100 L 96,100 L 100,145 L 40,145 Z"
          {...regionProps('lower_back', '#4A3D8C')}
        />

        {/* Hips */}
        <ellipse cx="52" cy="158" rx="18" ry="15" {...regionProps('hip', '#3D6B9A')} />
        <ellipse cx="88" cy="158" rx="18" ry="15" {...regionProps('hip', '#3D6B9A')} />

        {/* Thighs (quads front / hamstrings back) */}
        <ellipse cx="52" cy="198" rx="16" ry="30" {...regionProps('knee', '#2D5A8A')} />
        <ellipse cx="88" cy="198" rx="16" ry="30" {...regionProps('knee', '#2D5A8A')} />

        {/* Knees */}
        <circle cx="52" cy="233" r="14" {...regionProps('knee', '#1E4A7A')} />
        <circle cx="88" cy="233" r="14" {...regionProps('knee', '#1E4A7A')} />

        {/* Shins (calves back) */}
        <ellipse cx="52" cy="264" rx="10" ry="22" {...regionProps('ankle', '#2D3A6A')} />
        <ellipse cx="88" cy="264" rx="10" ry="22" {...regionProps('ankle', '#2D3A6A')} />

        {/* Ankles */}
        <ellipse cx="52" cy="291" rx="11" ry="9" {...regionProps('ankle', '#1E2A5A')} />
        <ellipse cx="88" cy="291" rx="11" ry="9" {...regionProps('ankle', '#1E2A5A')} />

        {/* Feet */}
        <ellipse cx="52" cy="304" rx="14" ry="7" fill="#1A1A30" fillOpacity={0.5} />
        <ellipse cx="88" cy="304" rx="14" ry="7" fill="#1A1A30" fillOpacity={0.5} />

        {/* Active issue pulse rings */}
        {statuses.filter(s => s.active).map((s, i) => {
          const positions: Record<JointRegion, [number, number]> = {
            knee: [70, 233], ankle: [70, 291], hip: [70, 158],
            lower_back: [70, 122], upper_back: [70, 75], shoulder: [70, 57],
            neck: [70, 44], elbow: [70, 108], wrist: [70, 153],
          }
          const [cx, cy] = positions[s.joint] ?? [70, 150]
          const color = s.painLevel && s.painLevel >= 6 ? '#E63312' : '#FF6B35'
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r="18"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeOpacity={0.5}
              className="animate-ping"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B35]" />
          <span className="text-white/40 text-xs">Active issue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00D4AA]" />
          <span className="text-white/40 text-xs">Resolved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#6C63FF]" />
          <span className="text-white/40 text-xs">Healthy</span>
        </div>
      </div>
      <p className="text-white/30 text-xs mt-2 text-center">Tap a region to report pain or start a screening</p>
    </div>
  )
}
